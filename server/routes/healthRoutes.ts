import { Router, Request, Response } from 'express';
import { db, projectId, firebaseConfig } from '../db/client';

const router = Router();

const healthHandler = async (_req: Request, res: Response) => {
  try {
    const testDoc = await db.collection('usuarios').doc('test_health_connection_check').get();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'catedra-ia',
      message: 'La lectura de prueba a Firestore se completó con éxito.',
      projectId,
      databaseId: firebaseConfig.firestoreDatabaseId || '(default)',
      exists: testDoc.exists,
      webConfigMatches: firebaseConfig.projectId === projectId,
    });
  } catch (err: any) {
    console.error('[Health Check Diagnostics Failed] Firestore read error:', err);
    res.status(500).json({
      status: 'error',
      mensaje: 'El servicio de base de datos no se encuentra disponible temporalmente.',
      projectId,
      databaseId: firebaseConfig.firestoreDatabaseId || '(default)',
    });
  }
};

router.get('/health', healthHandler);
router.get('/healthz', healthHandler);

export default router;
