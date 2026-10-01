import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { usuariosRepo } from '../repositories';

const router = Router();

router.delete('/usuario/mis-datos', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.uid || req.user!.uid;
    const result = await usuariosRepo.deleteUserData(userId);

    if (!result.success) {
      return res.status(207).json({
        success: false,
        authDeleted: result.authDeleted,
        firestoreDeleted: result.firestoreDeleted,
        mensaje: 'La eliminación de tus datos se completó de forma parcial debido a errores internos del servidor.',
        errores: result.errors,
      });
    }

    res.json({
      success: true,
      authDeleted: true,
      firestoreDeleted: true,
      mensaje: 'Todos tus datos, documentos y cuenta de autenticación han sido eliminados correctamente de forma permanente.',
    });
  } catch (err: any) {
    console.error('Error deleting user data:', err);
    res.status(500).json({
      success: false,
      authDeleted: false,
      firestoreDeleted: false,
      error: 'Error interno del servidor al procesar la solicitud de eliminación.',
    });
  }
});

export default router;
