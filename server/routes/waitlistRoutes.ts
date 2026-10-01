import { Router, Request, Response } from 'express';
import { waitlistSchema } from '../middleware/mediaValidation';
import { waitlistRepo } from '../repositories';
import { checkRateLimit } from '../services/quotaService';
import { SERVER_CONFIG } from '../config';

const router = Router();

router.post('/waitlist', async (req: Request, res: Response) => {
  const clientIp = req.clientIp || 'unknown_ip';

  // Rate Limiting por IP (máximo 5 peticiones por minuto)
  if (!checkRateLimit(`waitlist_ip_${clientIp}`, SERVER_CONFIG.rateLimits.waitlistIp)) {
    return res.status(429).json({
      error: 'Límite de velocidad superado',
      mensaje: 'Demasiadas solicitudes desde tu red. Por favor aguardá un minuto.',
    });
  }

  // Validación con Zod
  const validation = waitlistSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Datos inválidos',
      mensaje: validation.error.issues[0]?.message || 'Verificá el correo ingresado.',
    });
  }

  const { email, materia_o_carrera } = validation.data;

  try {
    await waitlistRepo.save({
      email,
      materia_o_carrera,
      fecha: new Date().toISOString(),
      ip: clientIp,
    });
  } catch (err: any) {
    // Logear siempre en el servidor y jamás exponer error.message al cliente
    console.error('[Waitlist Storage Error]:', err);
  }

  // Respuesta idéntica exista o no el email en Firestore (evita enumeración de usuarios)
  return res.status(200).json({
    ok: true,
  });
});

export default router;
