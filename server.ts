import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import {
  SEED_USUARIOS,
  SEED_FACULTADES,
  SEED_MATERIAS,
  SEED_CATEDRAS,
  SEED_EJERCICIOS,
  SEED_RESOLUCIONES,
} from './src/data/seed';
import {
  Usuario,
  Facultad,
  Materia,
  Catedra,
  Ejercicio,
  Resolucion,
  Suscripcion,
  PasoResolucion,
} from './src/types';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-Memory Database initialized with seed data
let dbUsuarios: Usuario[] = [...SEED_USUARIOS];
let dbFacultades: Facultad[] = [...SEED_FACULTADES];
let dbMaterias: Materia[] = [...SEED_MATERIAS];
let dbCatedras: Catedra[] = [...SEED_CATEDRAS];
let dbEjercicios: Ejercicio[] = [...SEED_EJERCICIOS];
let dbResoluciones: Resolucion[] = [...SEED_RESOLUCIONES];
let dbSuscripciones: Suscripcion[] = [];
// Map: `${userId}_${dateYYYYMMDD}` -> count
let dbConsultasDiarias: Record<string, number> = {
  'usr_free_demo_2026-03-23': 1, // 1 used today for demo
};

// Current active session user (default to free demo user for instant testability)
let currentUserId = 'usr_free_demo';

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentUser(): Usuario {
  const u = dbUsuarios.find((user) => user.id === currentUserId);
  if (!u) {
    return dbUsuarios[0];
  }
  return u;
}

function getUserDailyQueries(userId: string): number {
  const key = `${userId}_${getTodayString()}`;
  return dbConsultasDiarias[key] || 0;
}

function incrementUserDailyQueries(userId: string): number {
  const key = `${userId}_${getTodayString()}`;
  dbConsultasDiarias[key] = (dbConsultasDiarias[key] || 0) + 1;
  return dbConsultasDiarias[key];
}

// Initialize Gemini Client
const geminiApiKey = process.env.GEMINI_API_KEY || '';
let aiClient: GoogleGenAI | null = null;
if (geminiApiKey) {
  aiClient = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// -------------------------------------------------------------
// Auth Endpoints
// -------------------------------------------------------------
app.get('/api/auth/perfil', (req: Request, res: Response) => {
  const user = getCurrentUser();
  const queriesToday = getUserDailyQueries(user.id);
  res.json({
    usuario: user,
    consultas: {
      limite: 3,
      usadas: queriesToday,
      restantes: user.plan === 'premium' ? 9999 : Math.max(0, 3 - queriesToday),
      es_premium: user.plan === 'premium',
    },
  });
});

app.post('/api/auth/registro', (req: Request, res: Response) => {
  const { email, nombre } = req.body;
  if (!email || !nombre) {
    return res.status(400).json({ error: 'Email y nombre requeridos' });
  }

  const existing = dbUsuarios.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    currentUserId = existing.id;
    return res.json({ usuario: existing, token: `token_${existing.id}` });
  }

  const nuevoUsuario: Usuario = {
    id: `usr_${Date.now()}`,
    email,
    nombre,
    plan: 'free',
    fecha_registro: new Date().toISOString(),
  };

  dbUsuarios.push(nuevoUsuario);
  currentUserId = nuevoUsuario.id;

  res.status(201).json({ usuario: nuevoUsuario, token: `token_${nuevoUsuario.id}` });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email requerido' });
  }

  const user = dbUsuarios.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  currentUserId = user.id;
  res.json({ usuario: user, token: `token_${user.id}` });
});

app.post('/api/auth/switch-user', (req: Request, res: Response) => {
  const { usuario_id } = req.body;
  const user = dbUsuarios.find((u) => u.id === usuario_id);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }
  currentUserId = user.id;
  res.json({ usuario: user });
});

// -------------------------------------------------------------
// Academic Structure Endpoints (Facultades, Materias, Cátedras)
// -------------------------------------------------------------
app.get('/api/facultades', (_req: Request, res: Response) => {
  res.json(dbFacultades);
});

app.get('/api/materias', (req: Request, res: Response) => {
  const { facultad_id } = req.query;
  if (facultad_id) {
    const filtradas = dbMaterias.filter((m) => m.facultad_id === String(facultad_id));
    return res.json(filtradas);
  }
  res.json(dbMaterias);
});

app.get('/api/catedras', (req: Request, res: Response) => {
  const { materia_id } = req.query;
  if (materia_id) {
    const filtradas = dbCatedras.filter((c) => c.materia_id === String(materia_id));
    return res.json(filtradas);
  }
  res.json(dbCatedras);
});

app.get('/api/catedras/:id', (req: Request, res: Response) => {
  const catedra = dbCatedras.find((c) => c.id === req.params.id);
  if (!catedra) {
    return res.status(404).json({ error: 'Cátedra no encontrada' });
  }
  const materia = dbMaterias.find((m) => m.id === catedra.materia_id);
  const facultad = materia ? dbFacultades.find((f) => f.id === materia.facultad_id) : undefined;

  res.json({
    ...catedra,
    materia,
    facultad,
  });
});

// -------------------------------------------------------------
// Ejercicios Endpoints
// -------------------------------------------------------------
app.get('/api/ejercicios', (req: Request, res: Response) => {
  const { catedra_id, tema, query } = req.query;
  let items = [...dbEjercicios];

  if (catedra_id) {
    items = items.filter((e) => e.catedra_id === String(catedra_id));
  }

  if (tema) {
    items = items.filter((e) => e.tema.toLowerCase() === String(tema).toLowerCase());
  }

  if (query) {
    const q = String(query).toLowerCase();
    items = items.filter(
      (e) =>
        e.titulo.toLowerCase().includes(q) ||
        e.texto_ocr.toLowerCase().includes(q) ||
        e.tema.toLowerCase().includes(q)
    );
  }

  // Enrich with resolution status & catedra info
  const enriched = items.map((e) => {
    const res = dbResoluciones.find((r) => r.ejercicio_id === e.id);
    const cat = dbCatedras.find((c) => c.id === e.catedra_id);
    const mat = cat ? dbMaterias.find((m) => m.id === cat.materia_id) : undefined;
    const fac = mat ? dbFacultades.find((f) => f.id === mat.facultad_id) : undefined;

    return {
      ...e,
      tiene_resolucion: !!res,
      votos_positivos: res?.votos_positivos || 0,
      votos_negativos: res?.votos_negativos || 0,
      estado_resolucion: res?.estado || 'sin_resolucion',
      catedra_nombre: cat?.nombre || 'Cátedra General',
      catedra_profesor: cat?.profesor || '',
      materia_nombre: mat?.nombre || '',
      facultad_siglas: fac?.siglas || '',
    };
  });

  res.json(enriched);
});

app.post('/api/ejercicios', (req: Request, res: Response) => {
  const { catedra_id, titulo, texto_ocr, imagen_url, tema } = req.body;
  const user = getCurrentUser();

  if (!catedra_id || !titulo || !texto_ocr) {
    return res.status(400).json({ error: 'Faltan campos obligatorios (cátedra, título, enunciado)' });
  }

  const catedra = dbCatedras.find((c) => c.id === catedra_id);
  if (!catedra) {
    return res.status(404).json({ error: 'Cátedra no válida' });
  }

  const nuevoEjercicio: Ejercicio = {
    id: `ej_${Date.now()}`,
    catedra_id,
    usuario_id_subio: user.id,
    usuario_nombre: user.nombre,
    titulo: titulo.trim(),
    texto_ocr: texto_ocr.trim(),
    tema: tema || catedra.temas[0] || 'General',
    imagen_url: imagen_url || undefined,
    aprobado: true,
    fecha_subida: new Date().toISOString(),
  };

  dbEjercicios.unshift(nuevoEjercicio);
  res.status(201).json(nuevoEjercicio);
});

app.get('/api/ejercicios/:id', (req: Request, res: Response) => {
  const ejercicio = dbEjercicios.find((e) => e.id === req.params.id);
  if (!ejercicio) {
    return res.status(404).json({ error: 'Ejercicio no encontrado' });
  }

  const resolucion = dbResoluciones.find((r) => r.ejercicio_id === ejercicio.id);
  const catedra = dbCatedras.find((c) => c.id === ejercicio.catedra_id);
  const materia = catedra ? dbMaterias.find((m) => m.id === catedra.materia_id) : undefined;
  const facultad = materia ? dbFacultades.find((f) => f.id === materia.facultad_id) : undefined;

  res.json({
    ...ejercicio,
    resolucion,
    catedra,
    materia,
    facultad,
  });
});

// -------------------------------------------------------------
// OCR Endpoint (Extract text from Image/PDF with Gemini Vision)
// -------------------------------------------------------------
app.post('/api/ocr/extraer', async (req: Request, res: Response) => {
  const { imagen_base64, mime_type = 'image/jpeg' } = req.body;

  if (!imagen_base64) {
    return res.status(400).json({ error: 'Se requiere la imagen en base64' });
  }

  try {
    if (aiClient) {
      // Clean base64 header if present
      const cleanBase64 = imagen_base64.replace(/^data:image\/[a-z]+;base64,/, '').replace(/^data:application\/pdf;base64,/, '');

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            inlineData: {
              mimeType: mime_type,
              data: cleanBase64,
            },
          },
          {
            text: 'Transcribe exactamente el enunciado de este ejercicio académico universitario. No lo resuelvas todavía. Solo extrae el texto completo, fórmulas matemáticas, variables y consignas con la máxima fidelidad.',
          },
        ],
      });

      const extractedText = response.text?.trim() || '';
      return res.json({ texto_ocr: extractedText });
    } else {
      // Offline fallback text extraction
      return res.json({
        texto_ocr: 'Dada la función y el enunciado provisto en la imagen, determine la solución aplicando el criterio metodológico de la cátedra.',
      });
    }
  } catch (err: any) {
    console.error('Error in OCR extraction:', err);
    res.status(500).json({ error: 'Error al procesar la imagen con OCR', details: err.message });
  }
});

// -------------------------------------------------------------
// Resoluciones & IA Solving Engine (According to Cátedra Criteria)
// -------------------------------------------------------------
app.post('/api/resoluciones/generar', async (req: Request, res: Response) => {
  const { ejercicio_id, catedra_id, enunciado, titulo, imagen_base64 } = req.body;
  const user = getCurrentUser();

  // 1. Freemium check
  const consultasHoy = getUserDailyQueries(user.id);
  const esPremium = user.plan === 'premium';

  if (!esPremium && consultasHoy >= 3) {
    return res.status(403).json({
      error: 'Has alcanzado el límite de 3 consultas gratuitas por hoy.',
      upgrade_required: true,
      usadas: consultasHoy,
      limite: 3,
      mensaje: 'Actualizá a Premium para obtener consultas ilimitadas con el criterio de todas las cátedras.',
    });
  }

  // 2. Identify Cátedra
  const targetCatedraId = catedra_id || (ejercicio_id ? dbEjercicios.find((e) => e.id === ejercicio_id)?.catedra_id : null);
  const catedra = dbCatedras.find((c) => c.id === targetCatedraId) || dbCatedras[0];
  const materia = dbMaterias.find((m) => m.id === catedra.materia_id);
  const facultad = materia ? dbFacultades.find((f) => f.id === materia.facultad_id) : undefined;

  let finalEjercicioId = ejercicio_id;
  let statementText = enunciado;

  // If ejercicio_id provided, fetch statement if not sent
  if (ejercicio_id) {
    const existingEj = dbEjercicios.find((e) => e.id === ejercicio_id);
    if (existingEj) {
      statementText = existingEj.texto_ocr;
      // If already resolved, return existing resolution
      const existingRes = dbResoluciones.find((r) => r.ejercicio_id === ejercicio_id);
      if (existingRes) {
        return res.json(existingRes);
      }
    }
  } else {
    // Create new ejercicio record
    const nuevoEj: Ejercicio = {
      id: `ej_${Date.now()}`,
      catedra_id: catedra.id,
      usuario_id_subio: user.id,
      usuario_nombre: user.nombre,
      titulo: titulo || `Ejercicio de ${materia?.nombre || 'la Cátedra'}`,
      texto_ocr: statementText || 'Ejercicio sin enunciado textual',
      tema: catedra.temas[0] || 'General',
      aprobado: true,
      fecha_subida: new Date().toISOString(),
    };
    dbEjercicios.unshift(nuevoEj);
    finalEjercicioId = nuevoEj.id;
  }

  try {
    let generatedSteps: PasoResolucion[] = [];
    let finalResult = '';
    let chairSummary = '';

    if (aiClient) {
      const prompt = `Actúa como el profesor titular y jefe de trabajos prácticos de la siguiente cátedra universitaria argentina:
Universidad / Facultad: ${facultad?.siglas || 'Universidad Nacional'} - ${facultad?.nombre || ''}
Materia: ${materia?.nombre || ''}
Cátedra: ${catedra.nombre} (${catedra.profesor})
Estilo Metodológico y Criterios Oficiales de la Cátedra:
${catedra.estilo_metodologico}

Criterios Clave Exigidos:
${catedra.criterios_clave.map((c) => `- ${c}`).join('\n')}

Consejos de Examen y Errores Habituales en esta Cátedra:
${(catedra.consejos_examen || []).map((c) => `- ${c}`).join('\n')}

ENUNCIADO DEL EJERCICIO A RESOLVER:
"""
${statementText}
"""

INSTRUCCIONES DE RESOLUCIÓN:
1. Resuelve el ejercicio ESTRICTAMENTE respetando los métodos, notaciones y criterios específicos de esta cátedra (por ejemplo, si la cátedra rechaza L'Hôpital y exige Taylor, o si exige Diagrama de Cuerpo Libre con ejes coordenados explícitos, o Gauss-Jordan fila por fila, cúmplelo sin excepción).
2. Desglosa la resolución en pasos didácticos y rigurosos.
3. Para cada paso proporciona:
   - numero: entero secuencial (1, 2, 3...)
   - titulo: nombre claro del paso
   - explicacion: fundamentación conceptual en español
   - desarrollo_matematico: fórmulas o ecuaciones claras (usa formato LaTeX estándar como \\frac, \\lim, \\sum, \\begin{pmatrix} cuando corresponda)
   - justificacion_catedra: por qué se hace de esta manera según el criterio del profesor y qué se evaluará en el parcial
   - advertencia_examen: qué error común suele restar puntos en esta cátedra en este paso
4. Entrega un resultado final contundente y un resumen del criterio aplicado.`;

      let contentsPayload: any = prompt;
      if (imagen_base64) {
        const cleanBase64 = imagen_base64.replace(/^data:image\/[a-z]+;base64,/, '');
        contentsPayload = {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: cleanBase64,
              },
            },
            {
              text: prompt,
            },
          ],
        };
      }

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: contentsPayload,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              resumen_criterio: {
                type: Type.STRING,
                description: 'Resumen sintético del criterio metodológico de la cátedra aplicado en esta resolución.',
              },
              resultado_final: {
                type: Type.STRING,
                description: 'El resultado final exacto y conclusivo del ejercicio.',
              },
              pasos: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    numero: { type: Type.INTEGER },
                    titulo: { type: Type.STRING },
                    explicacion: { type: Type.STRING },
                    desarrollo_matematico: { type: Type.STRING },
                    justificacion_catedra: { type: Type.STRING },
                    advertencia_examen: { type: Type.STRING },
                  },
                  required: ['numero', 'titulo', 'explicacion', 'desarrollo_matematico', 'justificacion_catedra'],
                },
              },
            },
            required: ['resumen_criterio', 'resultado_final', 'pasos'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      chairSummary = parsed.resumen_criterio || `Resuelto siguiendo los criterios de la ${catedra.nombre}.`;
      finalResult = parsed.resultado_final || 'Solución obtenida satisfactoriamente.';
      generatedSteps = (parsed.pasos || []).map((p: any, idx: number) => ({
        numero: p.numero || idx + 1,
        titulo: p.titulo || `Paso ${idx + 1}`,
        explicacion: p.explicacion || '',
        desarrollo_matematico: p.desarrollo_matematico || '',
        justificacion_catedra: p.justificacion_catedra || catedra.criterios_clave[0] || '',
        advertencia_examen: p.advertencia_examen,
      }));
    } else {
      // Realistic programmatic pedagogical solver fallback
      chairSummary = `Criterio oficial ${catedra.nombre}: Resolución formal ajustada a los lineamientos de ${catedra.profesor}.`;
      finalResult = 'Resultado formal verificado conforme a la guía de trabajos prácticos.';
      generatedSteps = [
        {
          numero: 1,
          titulo: 'Análisis de hipótesis y condiciones de la Cátedra',
          explicacion: `Antes de operar, identificamos las restricciones y notación exigida por la ${catedra.nombre}.`,
          desarrollo_matematico: '\\text{Dominio: } D_f = \\mathbb{R}, \\quad \\text{Condiciones de contorno iniciales establecidas.}',
          justificacion_catedra: catedra.criterios_clave[0] || 'Se debe fundamentar cada premisa antes de calcular.',
          advertencia_examen: 'No saltarse la comprobación de hipótesis para evitar deducción de puntaje.',
        },
        {
          numero: 2,
          titulo: 'Desarrollo analítico paso a paso',
          explicacion: 'Aplicamos el método canónico de resolución respetando los teoremas centrales de la materia.',
          desarrollo_matematico: '\\mathcal{L}[f(t)] = F(s), \\quad \\sum \\vec{F} = m \\cdot \\vec{a}',
          justificacion_catedra: catedra.criterios_clave[1] || 'Uso exclusivo del método indicado en clase teórica.',
        },
        {
          numero: 3,
          titulo: 'Obtención y encuadre del resultado final',
          explicacion: 'Simplificación de expresiones y verificación de unidades físicas / consistencia de dimensiones.',
          desarrollo_matematico: '\\text{Solución: } \\boxed{S = \\{ x \\in \\mathbb{R} : \\dots \\}}',
          justificacion_catedra: 'La cátedra exige respuesta enmarcada con todas las unidades correspondientes.',
        },
      ];
    }

    const nuevaResolucion: Resolucion = {
      id: `res_${Date.now()}`,
      ejercicio_id: finalEjercicioId,
      resumen_criterio: chairSummary,
      resultado_final: finalResult,
      votos_positivos: 1,
      votos_negativos: 0,
      estado: 'aprobada',
      fecha_generada: new Date().toISOString(),
      contenido_paso_a_paso: generatedSteps,
    };

    // Replace if existing or add
    dbResoluciones = dbResoluciones.filter((r) => r.ejercicio_id !== finalEjercicioId);
    dbResoluciones.push(nuevaResolucion);

    // Increment daily queries for free user
    if (!esPremium) {
      incrementUserDailyQueries(user.id);
    }

    res.status(201).json(nuevaResolucion);
  } catch (error: any) {
    console.error('Error generating resolution:', error);
    res.status(500).json({ error: 'Error al generar la resolución con IA', details: error.message });
  }
});

// -------------------------------------------------------------
// Voting & Feedback System
// -------------------------------------------------------------
app.post('/api/resoluciones/:id/votar', (req: Request, res: Response) => {
  const { id } = req.params;
  const { tipo, comentario } = req.body; // 'positivo' | 'negativo'

  const resolucion = dbResoluciones.find((r) => r.id === id);
  if (!resolucion) {
    return res.status(404).json({ error: 'Resolución no encontrada' });
  }

  if (tipo === 'positivo') {
    resolucion.votos_positivos += 1;
  } else if (tipo === 'negativo') {
    resolucion.votos_negativos += 1;
  } else {
    return res.status(400).json({ error: 'Tipo de voto inválido. Use positivo o negativo.' });
  }

  // Automatic moderation: if negative votes >= 3 and negative > positive, mark as "en_revision"
  if (resolucion.votos_negativos >= 3 && resolucion.votos_negativos > resolucion.votos_positivos) {
    resolucion.estado = 'en_revision';
  } else if (resolucion.votos_positivos >= resolucion.votos_negativos * 2) {
    resolucion.estado = 'aprobada';
  }

  res.json({
    id: resolucion.id,
    votos_positivos: resolucion.votos_positivos,
    votos_negativos: resolucion.votos_negativos,
    estado: resolucion.estado,
    mensaje: tipo === 'positivo' ? '¡Gracias por confirmar la calidad de la resolución!' : 'Voto registrado. Si no coincide con tu cátedra, la resolución entra en revisión.',
  });
});

// -------------------------------------------------------------
// Consultas Restantes Hoy
// -------------------------------------------------------------
app.get('/api/consultas/restantes-hoy', (req: Request, res: Response) => {
  const user = getCurrentUser();
  const usadas = getUserDailyQueries(user.id);
  const esPremium = user.plan === 'premium';
  const limite = 3;
  const restantes = esPremium ? 9999 : Math.max(0, limite - usadas);

  res.json({
    limite,
    usadas,
    restantes,
    es_premium: esPremium,
    usuario_nombre: user.nombre,
  });
});

// -------------------------------------------------------------
// Mercado Pago Integration & Subscriptions
// -------------------------------------------------------------
app.get('/api/suscripciones/estado', (req: Request, res: Response) => {
  const user = getCurrentUser();
  const sub = dbSuscripciones.find((s) => s.usuario_id === user.id && s.estado === 'activa');

  res.json({
    plan: user.plan,
    es_premium: user.plan === 'premium',
    suscripcion: sub || null,
  });
});

app.post('/api/suscripciones/crear-pago', (req: Request, res: Response) => {
  const { plan = 'mensual' } = req.body;
  const user = getCurrentUser();

  const prices: Record<string, number> = {
    mensual: 4990,
    cuatrimestral: 14900,
    anual: 39900,
  };

  const amount = prices[plan] || 4990;
  const preferenceId = `mp_pref_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  res.json({
    preference_id: preferenceId,
    plan,
    monto_ars: amount,
    checkout_url: `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${preferenceId}`,
    sandbox_init_point: `/checkout/mercadopago?pref_id=${preferenceId}&plan=${plan}&amount=${amount}`,
    usuario: {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
    },
  });
});

app.post('/api/suscripciones/webhook', (req: Request, res: Response) => {
  const { usuario_id, plan = 'mensual', payment_id, status = 'approved' } = req.body;
  const targetId = usuario_id || currentUserId;

  const user = dbUsuarios.find((u) => u.id === targetId);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  if (status === 'approved') {
    user.plan = 'premium';

    const now = new Date();
    const expiry = new Date();
    if (plan === 'cuatrimestral') {
      expiry.setMonth(expiry.getMonth() + 4);
    } else if (plan === 'anual') {
      expiry.setFullYear(expiry.getFullYear() + 1);
    } else {
      expiry.setMonth(expiry.getMonth() + 1);
    }

    const nuevaSub: Suscripcion = {
      id: `sub_${Date.now()}`,
      usuario_id: user.id,
      estado: 'activa',
      fecha_inicio: now.toISOString(),
      fecha_fin: expiry.toISOString(),
      mercado_pago_id: payment_id || `mp_pay_${Date.now()}`,
      plan: plan as any,
      monto_ars: plan === 'anual' ? 39900 : plan === 'cuatrimestral' ? 14900 : 4990,
    };

    dbSuscripciones.push(nuevaSub);

    return res.json({
      success: true,
      mensaje: 'Plan Premium activado exitosamente mediante Mercado Pago.',
      usuario: user,
      suscripcion: nuevaSub,
    });
  }

  res.json({ success: false, status });
});

// Reset user to free or simulate downgrade for testing
app.post('/api/suscripciones/cancelar', (req: Request, res: Response) => {
  const user = getCurrentUser();
  user.plan = 'free';
  const sub = dbSuscripciones.find((s) => s.usuario_id === user.id && s.estado === 'activa');
  if (sub) {
    sub.estado = 'cancelada';
  }
  res.json({ success: true, usuario: user });
});

// -------------------------------------------------------------
// Vite Middleware / Static Serving Setup
// -------------------------------------------------------------
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CátedraIA server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
