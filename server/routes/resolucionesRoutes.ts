import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  resolucionGenerarSchema,
  votarSchema,
  parseBase64Media,
  validateMediaPayload,
} from '../middleware/mediaValidation';
import { normalizarPasos } from '../utils/stepNormalizer';
import {
  ejerciciosRepo,
  resolucionesRepo,
  academicRepo,
  votosRepo,
} from '../repositories';
import {
  checkRateLimit,
  enforceDoubleRateLimit,
  checkAndIncrementUserDailyQuota,
  decrementUserDailyQuota,
} from '../services/quotaService';
import {
  callGeminiStream,
  computeStatementHash,
  extractStepsFromPartialJson,
  isAiAvailable,
} from '../services/aiService';
import {
  getSystemInstruction,
  buildResolutionUserPrompt,
} from '../ai/prompts';
import { SERVER_CONFIG } from '../config';
import { Ejercicio, Resolucion } from '../../src/types';

const router = Router();

// Lock por ejercicio: evita que llamadas concurrentes dupliquen llamadas a la IA y consumo de cuota
const activeExerciseSolvingLocks = new Map<string, Promise<Resolucion>>();

router.post('/resoluciones/generar', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.uid || req.user!.uid;
  const userName = req.user!.name || 'Estudiante';
  const userPhoto = req.user!.picture;

  // Rate Limiting por UID
  if (!checkRateLimit(`solve_uid_${userId}`, SERVER_CONFIG.rateLimits.solveUid)) {
    return res.status(429).json({
      error: 'Límite de velocidad superado',
      mensaje: 'Demasiadas solicitudes en poco tiempo para tu usuario. Por favor aguardá un minuto.',
    });
  }

  // Validación con Zod
  const validation = resolucionGenerarSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Datos inválidos',
      mensaje: validation.error.issues[0]?.message || 'Verificá los datos enviados.',
    });
  }

  const {
    ejercicio_id,
    catedra_id,
    enunciado,
    titulo,
    tema,
    imagen_base64,
    mime_type,
    incluir_imagen = false,
    visibilidad,
  } = validation.data;

  // Validación de archivo opcional (MIME whitelist y PDF limits)
  if (imagen_base64) {
    const parsedMedia = parseBase64Media(imagen_base64, mime_type);
    if (!parsedMedia || !parsedMedia.cleanBase64) {
      return res.status(400).json({
        error: 'Formato inválido',
        mensaje: 'Formato de imagen/PDF adjunto inválido.',
      });
    }

    const mediaCheck = validateMediaPayload(parsedMedia.cleanBase64, parsedMedia.mimeType);
    if (!mediaCheck.valid) {
      return res.status(400).json({
        error: 'Archivo no permitido',
        mensaje: mediaCheck.error || 'El archivo adjunto no cumple con los límites permitidos.',
      });
    }
  }

  const finalVisibilidad: 'privado' | 'compartido' =
    visibilidad === 'compartido' ? 'compartido' : 'privado';

  // 1. Obtener o guardar primero el ejercicio en el servidor
  let ejercicio: Ejercicio | null = null;

  if (ejercicio_id) {
    ejercicio = await ejerciciosRepo.getById(String(ejercicio_id));
    if (!ejercicio) {
      return res.status(404).json({ error: 'Ejercicio no encontrado en el servidor' });
    }
    // Si además vino catedra_id en el body, validar que exista y que coincida con el ejercicio
    if (catedra_id) {
      const catCheck = await academicRepo.getCatedraById(String(catedra_id));
      if (!catCheck || catCheck.id !== ejercicio.catedra_id) {
        return res.status(400).json({ error: 'Cátedra no válida o no coincide con el ejercicio' });
      }
    }
  } else {
    // Si no se proveyó ejercicio_id pero sí un enunciado en el body, se persiste primero en el servidor
    const rawEnunciado = enunciado || req.body.enunciado;
    if (!rawEnunciado || !String(rawEnunciado).trim()) {
      return res.status(400).json({
        error: 'Se requiere ejercicio_id o un enunciado para crear y guardar el ejercicio.',
      });
    }
    const targetCatId = catedra_id;
    if (!targetCatId) {
      return res.status(400).json({ error: 'Cátedra no válida o inexistente' });
    }
    const targetCat = await academicRepo.getCatedraById(targetCatId);
    if (!targetCat) {
      return res.status(400).json({ error: 'Cátedra no válida o inexistente' });
    }

    // Validación de tema perteneciente a la cátedra elegida
    if (tema && !targetCat.temas.includes(tema)) {
      return res.status(400).json({
        error: 'Tema no válido',
        mensaje: `El tema "${tema}" no pertenece a los temas de la cátedra seleccionada (${targetCat.nombre}).`,
      });
    }

    const textToSave = String(rawEnunciado).trim();
    const statementHash = computeStatementHash(textToSave, targetCat.id);

    ejercicio = await ejerciciosRepo.create({
      id: `ej_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      catedra_id: targetCat.id,
      usuario_id_subio: userId,
      usuario_nombre: userName,
      usuario_foto: userPhoto,
      titulo: titulo ? String(titulo).trim() : `Ejercicio de ${targetCat.nombre}`,
      texto_ocr: textToSave,
      tema: tema ? String(tema).trim() : targetCat.temas[0] || 'General',
      aprobado: true,
      fecha_subida: new Date().toISOString(),
      visibilidad: finalVisibilidad,
      hash_enunciado: statementHash,
    });
  }

  // 2. Validar que la cátedra exista
  const targetCatedraId = ejercicio.catedra_id;
  const catedra = await academicRepo.getCatedraById(targetCatedraId);
  if (!catedra) {
    return res.status(400).json({ error: 'Cátedra no válida o inexistente' });
  }

  // Validación de tema para ejercicios existentes si se pasó tema
  if (tema && !catedra.temas.includes(tema)) {
    return res.status(400).json({
      error: 'Tema no válido',
      mensaje: `El tema "${tema}" no pertenece a los temas de la cátedra seleccionada (${catedra.nombre}).`,
    });
  }

  const materia = await academicRepo.getMateriaById(catedra.materia_id);
  if (!materia) {
    return res.status(400).json({ error: 'Materia asociada a la cátedra no encontrada' });
  }
  const selectedTema =
    tema && typeof tema === 'string' && tema.trim()
      ? tema.trim()
      : ejercicio.tema || catedra.temas[0] || 'General';

  // 3. El enunciado se toma SIEMPRE del ejercicio guardado en el servidor, no del body del cliente
  const statementText = ejercicio.texto_ocr || '';
  const statementHash = computeStatementHash(statementText, catedra.id);

  // Asegurar que el ejercicio tenga guardado el hash_enunciado
  if (ejercicio.hash_enunciado !== statementHash) {
    ejercicio.hash_enunciado = statementHash;
    await ejerciciosRepo.create(ejercicio);
  }

  const sendSseEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // 4. Si el ejercicio ya tiene una resolución vigente para este ejercicio, devolverla SIN llamar a la IA ni consumir cuota
  const existingResolucion = await resolucionesRepo.getByEjercicioId(ejercicio.id);
  if (existingResolucion) {
    console.log(
      `[Resolución Vigente] Ejercicio ${ejercicio.id} ya posee resolución activa ${existingResolucion.id}. Devolviendo sin llamar a la IA ni consumir cuota.`
    );
    if (!existingResolucion.hash_enunciado) {
      existingResolucion.hash_enunciado = statementHash;
      await resolucionesRepo.createOrUpdate(existingResolucion);
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    for (const paso of existingResolucion.contenido_paso_a_paso) {
      sendSseEvent('paso', paso);
    }
    sendSseEvent('final', existingResolucion);
    return res.end();
  }

  // 5. Antes de llamar a la IA: si ya existe una resolución para ese hash, reutilizarla
  const cachedResolucion = await resolucionesRepo.getByHash(statementHash);
  if (cachedResolucion) {
    console.log(`[Cache Hit] Reutilizando resolución existente para hash "${statementHash}".`);
    const resLinked: Resolucion = {
      ...cachedResolucion,
      id: cachedResolucion.ejercicio_id === ejercicio.id
        ? cachedResolucion.id
        : `res_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ejercicio_id: ejercicio.id,
      hash_enunciado: statementHash,
    };
    if (resLinked.id !== cachedResolucion.id) {
      await resolucionesRepo.createOrUpdate(resLinked);
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    for (const paso of resLinked.contenido_paso_a_paso) {
      sendSseEvent('paso', paso);
    }
    sendSseEvent('final', resLinked);
    return res.end();
  }

  // 6. Concurrencia / Lock por ejercicio: si otro proceso ya lo está resolviendo en paralelo
  if (activeExerciseSolvingLocks.has(ejercicio.id)) {
    console.log(
      `[Lock Concurrente] Ejercicio ${ejercicio.id} ya está siendo resuelto. Esperando resolución del primer proceso...`
    );
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    sendSseEvent('status', {
      estado: 'en_espera',
      mensaje: 'Este ejercicio ya está siendo resuelto en paralelo. Aguardando resultado...',
    });

    try {
      const resolucion = await activeExerciseSolvingLocks.get(ejercicio.id)!;
      for (const paso of resolucion.contenido_paso_a_paso) {
        sendSseEvent('paso', paso);
      }
      sendSseEvent('final', resolucion);
      return res.end();
    } catch (lockErr: any) {
      console.error('[Concurrent Resolution Error]:', lockErr);
      sendSseEvent('error', {
        error: 'Error en resolución concurrente',
        mensaje: 'Ocurrió un error al aguardar la resolución concurrente del ejercicio. Por favor intentá nuevamente.',
      });
      return res.end();
    }
  }

  // 7. Validaciones previas a la generación con IA (Double Rate Limiting, Cuota y Disponibilidad)
  // Double Rate Limiting (UID + IP)
  if (
    !enforceDoubleRateLimit(
      req,
      res,
      'solve',
      SERVER_CONFIG.rateLimits.solveUid,
      SERVER_CONFIG.rateLimits.solveIp
    )
  ) {
    return;
  }

  // Quota check & Atomic reservation (solo para resolver con IA cuando no hay resolución previa)
  const quota = await checkAndIncrementUserDailyQuota(userId, SERVER_CONFIG.dailyLimit);
  if (!quota.allowed) {
    return res.status(429).json({
      error: 'Límite diario alcanzado',
      code: 'LIMIT_REACHED',
      mensaje: `Llegaste al límite diario de uso justo (${SERVER_CONFIG.dailyLimit} consultas por día en horario de Argentina), vuelve mañana.`,
      limite_alcanzado: true,
      upgrade_required: true,
    });
  }

  if (!isAiAvailable()) {
    await decrementUserDailyQuota(userId).catch(() => {});
    return res.status(503).json({
      error: 'IA no disponible',
      mensaje: 'IA no disponible. No se pudo conectar con el servicio de resolución.',
    });
  }

  // 8. Crear y registrar el bloqueo (lock) recién después de pasar todas las validaciones previas
  let resolveLock!: (res: Resolucion) => void;
  let rejectLock!: (err: any) => void;
  const solvingPromise = new Promise<Resolucion>((resolve, reject) => {
    resolveLock = resolve;
    rejectLock = reject;
  });
  // Adjuntar inmediatamente handler .catch(() => {}) para prevenir unhandledRejection si no hay oyentes
  solvingPromise.catch(() => {});

  activeExerciseSolvingLocks.set(ejercicio.id, solvingPromise);

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  let sentStepsCount = 0;

  try {
    const systemInstruction = getSystemInstruction({
      materiaNombre: materia?.nombre || 'la materia',
      catedraNombre: catedra.nombre,
      catedraContexto: catedra.contexto,
      catedraEstilo: catedra.estilo_metodologico,
      criteriosClave: catedra.criterios_clave,
      consejosExamen: catedra.consejos_examen,
    });
    const userPrompt = buildResolutionUserPrompt({
      tema: selectedTema,
      enunciado: statementText || 'Analizar y resolver el ejercicio según las pautas de la materia.',
    });

    let contentsPayload: any = userPrompt;
    // Si ya hay texto extraído por OCR, no mandamos la imagen otra vez completa
    const hasExtractedText = Boolean(statementText && statementText.trim().length > 0);
    if (!hasExtractedText && incluir_imagen && imagen_base64) {
      const parsedMedia = parseBase64Media(imagen_base64, mime_type);
      if (parsedMedia && parsedMedia.cleanBase64) {
        contentsPayload = {
          parts: [
            {
              inlineData: {
                mimeType: parsedMedia.mimeType,
                data: parsedMedia.cleanBase64,
              },
            },
            {
              text: userPrompt,
            },
          ],
        };
      }
    }

    const generateConfig = {
      systemInstruction,
      responseMimeType: 'application/json',
    };

    let fullText = '';
    const onChunk = (chunkText: string) => {
      fullText += chunkText;
      const completedSteps = extractStepsFromPartialJson(fullText);
      while (sentStepsCount < completedSteps.length) {
        const nextStep = completedSteps[sentStepsCount];
        sendSseEvent('paso', nextStep);
        sentStepsCount++;
      }
    };

    const onQueuePos = (pos: number) => {
      sendSseEvent('status', {
        estado: 'en_cola',
        posicion: pos + 1,
        mensaje: `En cola de procesamiento (posición #${pos + 1})...`,
      });
    };

    let fallbackSinImagen = false;

    try {
      fullText = await callGeminiStream(
        contentsPayload,
        generateConfig,
        SERVER_CONFIG.modelResolver,
        SERVER_CONFIG.solveTimeoutMs,
        userId,
        onChunk,
        onQueuePos
      );
    } catch (geminiErr: any) {
      if (geminiErr?.message === 'DAILY_TOKEN_CAP_EXCEEDED') {
        throw new Error('DAILY_TOKEN_CAP_EXCEEDED');
      }

      // Si falló la llamada con imagen adjunta, intentamos fallback únicamente con el enunciado textual
      if (contentsPayload && typeof contentsPayload === 'object' && 'parts' in contentsPayload) {
        console.warn(
          '[Gemini Stream] Multimodal resolution failed, falling back to text-only prompt:',
          geminiErr?.message || geminiErr
        );
        fallbackSinImagen = true;

        // Avisar al usuario por el canal SSE en tiempo real
        sendSseEvent('aviso', {
          tipo: 'sin_figura',
          mensaje: 'la resolución no consideró la figura',
        });

        // Reiniciar los acumuladores de pasos del intento fallido
        fullText = '';
        sentStepsCount = 0;
        fullText = await callGeminiStream(
          userPrompt,
          generateConfig,
          SERVER_CONFIG.modelResolver,
          SERVER_CONFIG.solveTimeoutMs,
          userId,
          onChunk,
          onQueuePos
        );
      } else {
        throw geminiErr;
      }
    }

    let parsed: any;
    try {
      parsed = JSON.parse(fullText || '{}');
    } catch {
      throw new Error('La respuesta de la IA no tuvo un formato JSON interpretable.');
    }

    const normalized = normalizarPasos(parsed, fallbackSinImagen);
    const {
      validSteps,
      cleanedSummary,
      cleanedResult,
      cleanedEntendimiento,
      cleanedEstrategia,
      confianza,
      cleanedMotivoConfianza,
      supuestos,
      erroresComunes,
    } = normalized;

    while (sentStepsCount < validSteps.length) {
      sendSseEvent('paso', validSteps[sentStepsCount]);
      sentStepsCount++;
    }

    const nuevaResolucion: Resolucion = {
      id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ejercicio_id: ejercicio.id,
      resumen_criterio: fallbackSinImagen
        ? `${cleanedSummary ? cleanedSummary + ' ' : ''}(la resolución no consideró la figura).`.trim()
        : cleanedSummary || 'Resolución metodológica paso a paso.',
      resultado_final: cleanedResult,
      entendimiento: cleanedEntendimiento,
      estrategia: cleanedEstrategia,
      supuestos,
      errores_comunes: erroresComunes,
      confianza,
      motivo_confianza: cleanedMotivoConfianza,
      advertencia: fallbackSinImagen ? 'la resolución no consideró la figura' : undefined,
      votos_positivos: 0,
      votos_negativos: 0,
      estado: 'sin_verificar',
      fecha_generada: new Date().toISOString(),
      contenido_paso_a_paso: validSteps,
      hash_enunciado: statementHash,
    };

    // Protección estricta: NUNCA sobrescribir una resolución que ya tenga votos de la comunidad
    const existingWithVotes = await resolucionesRepo.getByEjercicioId(ejercicio.id);
    if (
      existingWithVotes &&
      ((existingWithVotes.votos_positivos || 0) > 0 || (existingWithVotes.votos_negativos || 0) > 0)
    ) {
      console.warn(
        `[Protección de Votos] No se sobrescribe la resolución existente ${existingWithVotes.id} de ejercicio ${ejercicio.id} porque ya posee votos (+${existingWithVotes.votos_positivos}/-${existingWithVotes.votos_negativos}).`
      );
      resolveLock(existingWithVotes);
      sendSseEvent('final', existingWithVotes);
      return res.end();
    }

    await resolucionesRepo.createOrUpdate(nuevaResolucion);
    resolveLock(nuevaResolucion);

    sendSseEvent('final', nuevaResolucion);
    return res.end();
  } catch (error: any) {
    // Refund daily quota on streaming failure or disconnect
    await decrementUserDailyQuota(userId).catch(() => {});
    rejectLock(error);

    console.error('[Resolución Generation Stream Error]:', error);
    const isTokenCap = error?.message === 'DAILY_TOKEN_CAP_EXCEEDED';
    if (!res.writableEnded) {
      sendSseEvent('error', {
        error: isTokenCap ? 'Tope diario global de tokens alcanzado' : 'Error al generar resolución',
        code: isTokenCap ? 'LIMIT_REACHED' : 'RESOLVE_ERROR',
        mensaje: isTokenCap
          ? 'Se alcanzó el tope diario global de tokens de IA para proteger los recursos. Volvé a consultar mañana.'
          : 'Ocurrió un problema al procesar la resolución del ejercicio. Por favor intentá nuevamente.',
        limite_alcanzado: isTokenCap,
        upgrade_required: isTokenCap,
      });
      return res.end();
    }
  } finally {
    // Garantizar que el bloqueo se elimine siempre en activeExerciseSolvingLocks
    activeExerciseSolvingLocks.delete(ejercicio.id);
  }
});

router.post('/resoluciones/:id/votar', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.uid || req.user!.uid;

  // Rate Limiting por UID
  if (!checkRateLimit(`voto_uid_${userId}`, SERVER_CONFIG.rateLimits.voteUid)) {
    return res.status(429).json({
      error: 'Límite de velocidad superado',
      mensaje: 'Demasiadas solicitudes de votación en poco tiempo. Por favor aguardá un minuto.',
    });
  }

  // Validación con Zod
  const validation = votarSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Datos de voto inválidos',
      mensaje: validation.error.issues[0]?.message || 'Verificá los datos del voto.',
    });
  }

  try {
    const { id } = req.params;
    const { tipo, comentario } = validation.data;

    const updated = await votosRepo.saveAndRecalculate({
      userId,
      resolucionId: id,
      tipo,
      comentario: comentario ? comentario.trim() : undefined,
    });

    if (!updated) {
      return res.status(404).json({
        error: 'Resolución no encontrada',
        mensaje: 'La resolución sobre la que intentás votar no existe o fue retirada.',
      });
    }

    res.json({
      id: updated.resolucion.id,
      votos_positivos: updated.resolucion.votos_positivos,
      votos_negativos: updated.resolucion.votos_negativos,
      estado: updated.resolucion.estado,
      mi_voto: {
        tipo: updated.voto.tipo,
        comentario: updated.voto.comentario,
      },
      mensaje:
        tipo === 'positivo'
          ? '¡Voto registrado! Confirmaste que coincide con el criterio de tu cátedra.'
          : 'Voto y discrepancia guardados en Firestore. Esto ayuda a recalibrar el criterio metodológico.',
    });
  } catch (err: any) {
    console.error('[Vote Registration Error]:', err);
    res.status(500).json({
      error: 'Error al registrar voto',
      mensaje: 'Ocurrió un problema interno al registrar tu voto. Por favor intentá nuevamente.',
    });
  }
});

export default router;
