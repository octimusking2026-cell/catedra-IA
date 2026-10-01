import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { usuariosRepo } from '../repositories';

const router = Router();

router.delete('/usuario/mis-datos', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.uid || req.user!.uid;
    await usuariosRepo.deleteUserData(userId);
    res.json({
      success: true,
      mensaje: 'Todos tus datos y documentos en Firestore han sido eliminados correctamente.',
    });
  } catch (err: any) {
    console.error('Error deleting user data:', err);
    res.status(500).json({ error: 'Error al eliminar tus datos de Firestore' });
  }
});

export default router;
