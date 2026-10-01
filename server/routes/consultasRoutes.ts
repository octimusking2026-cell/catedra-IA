import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getUserDailyQueries, getTodayArgentinaString } from '../services/quotaService';
import { SERVER_CONFIG } from '../config';

const router = Router();

router.get('/consultas/restantes-hoy', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.uid || req.user!.uid;
    const usadas = await getUserDailyQueries(userId);
    const restantes = Math.max(0, SERVER_CONFIG.dailyLimit - usadas);

    res.json({
      limite: SERVER_CONFIG.dailyLimit,
      usadas,
      restantes,
      upgrade_required: restantes === 0,
      usuario_nombre: req.user!.name || 'Estudiante',
      zona_horaria: 'America/Argentina/Buenos_Aires',
      fecha_hoy: getTodayArgentinaString(),
    });
  } catch (err: any) {
    console.error('Error getting remaining queries:', err);
    res.status(500).json({ error: 'Error al obtener consultas restantes' });
  }
});

export default router;
