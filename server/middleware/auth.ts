import { Request, Response, NextFunction } from 'express';
import { adminAuth, clientAppAuth } from '../db/client';
import { SERVER_CONFIG } from '../config';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'No autorizado',
      mensaje: 'Se requiere iniciar sesión con tu cuenta de Google para acceder a CátedraIA.',
    });
  }

  const idToken = authHeader.split('Bearer ')[1].trim();
  if (!idToken) {
    return res.status(401).json({
      error: 'Token faltante',
      mensaje: 'Token de autenticación no provisto.',
    });
  }

  try {
    let decodedToken: any;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (primaryAuthErr: any) {
      if (clientAppAuth) {
        decodedToken = await clientAppAuth.verifyIdToken(idToken);
      } else {
        throw primaryAuthErr;
      }
    }

    req.uid = decodedToken.uid;
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || (decodedToken.email ? decodedToken.email.split('@')[0] : 'Estudiante'),
      picture: decodedToken.picture,
    };
    next();
  } catch (err: any) {
    console.warn('[Auth Middleware] Invalid or expired ID token:', err?.code || err?.message || err);
    return res.status(401).json({
      error: 'Token inválido o expirado',
      mensaje: 'Tu sesión ha expirado o no es válida. Por favor volvé a iniciar sesión con Google.',
    });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const uid = req.uid || req.user?.uid;
  if (!uid || !SERVER_CONFIG.adminUids.includes(uid)) {
    return res.status(403).json({ error: 'Acceso restringido' });
  }
  next();
}

export async function requireTerms(req: Request, res: Response, next: NextFunction) {
  const uid = req.uid || req.user?.uid;
  if (!uid) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const { usuariosRepo } = await import('../repositories');
    const { TERMS_VERSION } = await import('../config');
    const user = await usuariosRepo.getById(uid);
    if (!user || user.terminos_version !== TERMS_VERSION) {
      return res.status(403).json({ error: 'terminos_pendientes' });
    }
    next();
  } catch (err) {
    console.error('[requireTerms] Error checking terms acceptance:', err);
    return res.status(500).json({ error: 'Error interno al verificar aceptación de términos' });
  }
}
