import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { usuariosRepo } from '../repositories';
import { getUserDailyQueries } from '../services/quotaService';
import { SERVER_CONFIG, TERMS_VERSION } from '../config';
import { aceptarTerminosSchema } from '../middleware/mediaValidation';

const router = Router();

router.get('/auth/perfil', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.uid || req.user!.uid;
    const esAdmin = SERVER_CONFIG.adminUids.includes(userId);
    const user = await usuariosRepo.getOrCreateFromToken({
      uid: userId,
      email: req.user!.email,
      name: req.user!.name,
      picture: req.user!.picture,
    });

    const terminosAceptados = user.terminos_version === TERMS_VERSION;
    const queriesToday = await getUserDailyQueries(user.id);

    res.json({
      usuario: {
        ...user,
        es_admin: esAdmin,
      },
      es_admin: esAdmin,
      terminos_aceptados: terminosAceptados,
      consultas: {
        limite: SERVER_CONFIG.dailyLimit,
        usadas: queriesToday,
        restantes: Math.max(0, SERVER_CONFIG.dailyLimit - queriesToday),
      },
    });
  } catch (err: any) {
    console.error('Error fetching perfil:', err);
    res.status(500).json({ error: 'Error al obtener perfil de usuario' });
  }
});

router.post('/auth/aceptar-terminos', authMiddleware, async (req: Request, res: Response) => {
  try {
    const validation = aceptarTerminosSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Datos inválidos',
        mensaje: validation.error.issues[0]?.message || 'Versión de términos requerida.',
      });
    }

    const { version } = validation.data;
    if (version !== TERMS_VERSION) {
      return res.status(400).json({ error: 'Versión de términos incorrecta o desactualizada' });
    }

    const userId = req.uid || req.user!.uid;
    const nowStr = new Date().toISOString();

    const user = await usuariosRepo.getOrCreateFromToken({
      uid: userId,
      email: req.user!.email,
      name: req.user!.name,
      picture: req.user!.picture,
    });

    await usuariosRepo.createOrUpdate({
      ...user,
      terminos_version: version,
      terminos_aceptados_en: nowStr,
    });

    return res.json({ ok: true, mensaje: 'Términos aceptados' });
  } catch (err: any) {
    console.error('Error al aceptar términos:', err);
    return res.status(500).json({ error: 'Error interno al registrar aceptación de términos' });
  }
});

export default router;
