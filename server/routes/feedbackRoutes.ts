import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { feedbackSchema } from '../middleware/mediaValidation';
import { feedbackRepo } from '../repositories';
import { checkRateLimit } from '../services/quotaService';
import { SERVER_CONFIG } from '../config';

const router = Router();

router.post('/feedback', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.uid || req.user!.uid;
  const userName = req.user!.name || 'Estudiante';
  const userEmail = req.user!.email || '';

  // Rate Limiting por UID
  if (!checkRateLimit(`feedback_uid_${userId}`, SERVER_CONFIG.rateLimits.feedbackUid)) {
    return res.status(429).json({
      error: 'Límite de velocidad superado',
      mensaje: 'Demasiados mensajes enviados en poco tiempo. Por favor aguardá un minuto.',
    });
  }

  // Validación con Zod
  const validation = feedbackSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Datos inválidos',
      mensaje: validation.error.issues[0]?.message || 'Verificá el mensaje ingresado.',
    });
  }

  const { mensaje, pantalla } = validation.data;

  try {
    const feedbackDoc = {
      id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId,
      usuario_nombre: userName,
      usuario_email: userEmail,
      mensaje: mensaje.trim(),
      pantalla: (pantalla || 'general').trim(),
      fecha: new Date().toISOString(),
    };

    await feedbackRepo.create(feedbackDoc);

    res.status(201).json({
      success: true,
      mensaje: '¡Muchas gracias por tu comentario! Ha sido guardado en Firestore.',
    });
  } catch (err: any) {
    console.error('[Feedback Submission Error]:', err);
    res.status(500).json({
      error: 'Error al enviar comentario',
      mensaje: 'Ocurrió un error al enviar tu comentario. Por favor intentá nuevamente más tarde.',
    });
  }
});

export default router;
