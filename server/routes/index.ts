import { Router } from 'express';
import { authMiddleware, requireTerms } from '../middleware/auth';
import configRoutes from './configRoutes';
import healthRoutes from './healthRoutes';
import academicRoutes from './academicRoutes';
import authRoutes from './authRoutes';
import ejerciciosRoutes from './ejerciciosRoutes';
import ocrRoutes from './ocrRoutes';
import resolucionesRoutes from './resolucionesRoutes';
import consultasRoutes from './consultasRoutes';
import feedbackRoutes from './feedbackRoutes';
import waitlistRoutes from './waitlistRoutes';
import userRoutes from './userRoutes';
import adminRoutes from './adminRoutes';

const router = Router();

// Interceptor global para hacer cumplir authMiddleware y requireTerms en rutas no exentas
router.use((req, res, next) => {
  const path = req.path;
  const exempt = [
    '/config',
    '/health',
    '/waitlist',
    '/auth/perfil',
    '/auth/aceptar-terminos',
    '/usuario/mis-datos',
    '/carreras',
    '/facultades',
    '/materias',
    '/catedras'
  ];

  if (exempt.some(p => path.startsWith(p) || path === p)) {
    return next();
  }

  // Ejecutar authMiddleware y luego requireTerms
  authMiddleware(req, res, (err) => {
    if (err) return next(err);
    requireTerms(req, res, next);
  });
});

router.use(configRoutes);
router.use(healthRoutes);
router.use(academicRoutes);
router.use(authRoutes);
router.use(ejerciciosRoutes);
router.use(ocrRoutes);
router.use(resolucionesRoutes);
router.use(consultasRoutes);
router.use(feedbackRoutes);
router.use(waitlistRoutes);
router.use(userRoutes);
router.use(adminRoutes);

export default router;
