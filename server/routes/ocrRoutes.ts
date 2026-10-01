import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { ocrSchema, parseBase64Media, validateMediaPayload } from '../middleware/mediaValidation';
import { enforceDoubleRateLimit, checkAndIncrementUserDailyQuota, decrementUserDailyQuota } from '../services/quotaService';
import { callGeminiGenerate, isAiAvailable } from '../services/aiService';
import { SERVER_CONFIG } from '../config';

const router = Router();

router.post('/ocr/extraer', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.uid || req.user!.uid;

  // Double Rate Limiting (UID + IP)
  if (
    !enforceDoubleRateLimit(
      req,
      res,
      'ocr',
      SERVER_CONFIG.rateLimits.ocrUid,
      SERVER_CONFIG.rateLimits.ocrIp
    )
  ) {
    return;
  }

  // Validación con Zod
  const validation = ocrSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Datos inválidos',
      mensaje: validation.error.issues[0]?.message || 'Verificá los datos enviados.',
    });
  }

  const { imagen_base64, mime_type } = validation.data;

  const parsed = parseBase64Media(imagen_base64, mime_type);
  if (!parsed || !parsed.cleanBase64) {
    return res.status(400).json({
      error: 'Formato inválido',
      mensaje: 'Formato de imagen base64 inválido.',
    });
  }

  // Validación de tipo MIME (allowlist), tamaño de archivo y páginas en PDF
  const mediaValidation = validateMediaPayload(parsed.cleanBase64, parsed.mimeType);
  if (!mediaValidation.valid) {
    return res.status(400).json({
      error: 'Archivo no permitido',
      mensaje: mediaValidation.error || 'El archivo adjunto no cumple con los límites requeridos.',
    });
  }

  if (!isAiAvailable()) {
    return res.status(503).json({
      error: 'IA no disponible',
      texto_ocr: '',
      advertencia: 'IA no disponible. Podés transcribir o pegar el enunciado manualmente en el cuadro de texto.',
    });
  }

  // Fair Usage Daily Quota Check & Atomic Reservation ("reservar antes, devolver si falla")
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

  try {
    const response = await callGeminiGenerate(
      [
        {
          inlineData: {
            mimeType: parsed.mimeType,
            data: parsed.cleanBase64,
          },
        },
        {
          text: 'Transcribe exactamente el enunciado de este ejercicio académico universitario. No lo resuelvas todavía. Solo extrae el texto completo, fórmulas matemáticas, variables y consignas con la máxima fidelidad.',
        },
      ],
      undefined,
      SERVER_CONFIG.modelOcr,
      SERVER_CONFIG.ocrTimeoutMs,
      userId,
      1500
    );

    const extractedText = response?.text?.trim() || '';
    if (extractedText) {
      return res.json({ texto_ocr: extractedText, restante: quota.remaining });
    }

    return res.json({
      texto_ocr: '',
      advertencia: 'No se detectó texto legible en el archivo. Podés transcribir el enunciado en el cuadro de texto.',
      restante: quota.remaining,
    });
  } catch (err: any) {
    // Si la IA falla, devolvemos la reserva atómica al usuario
    await decrementUserDailyQuota(userId).catch(() => {});
    console.error('[OCR Processing Error]:', err);

    if (err?.message === 'DAILY_TOKEN_CAP_EXCEEDED') {
      return res.status(429).json({
        error: 'Tope diario de tokens alcanzado',
        code: 'LIMIT_REACHED',
        mensaje: 'Se alcanzó el tope diario global de tokens de IA del servidor para proteger los recursos. Volvé a consultar mañana.',
        limite_alcanzado: true,
        upgrade_required: true,
      });
    }

    return res.status(503).json({
      error: 'IA no disponible',
      texto_ocr: '',
      advertencia: 'Ocurrió un error al procesar el archivo. Podés ingresar el enunciado manualmente.',
    });
  }
});

export default router;
