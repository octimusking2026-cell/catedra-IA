import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { SERVER_CONFIG } from './server/config';
import apiRoutes from './server/routes';
import { ejerciciosRepo } from './server/repositories';

// Global unhandled promise rejection handler to prevent process termination
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection at Promise]:', promise, 'reason:', reason);
});

// Extend Express Request to include authenticated user & client IP
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
        name?: string;
        picture?: string;
        [key: string]: any;
      };
      uid?: string;
      clientIp?: string;
    }
  }
}

const app = express();
app.set('trust proxy', 1);

// Direct top-level health check for load balancers and deployment probes
app.get('/healthz', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'catedra-ia' });
});

// Dedicated 10MB parser for heavy payload routes (OCR and Generar Resolución)
const json10mb = express.json({ limit: `${SERVER_CONFIG.maxFileBytes / (1024 * 1024)}mb` });

// Standard 100kb parser for lighter endpoints
const json100kb = express.json({ limit: '100kb' });

// Route-specific body parsing
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/api/ocr/extraer' || req.path === '/api/resoluciones/generar') {
    return json10mb(req, res, next);
  }
  return json100kb(req, res, next);
});

app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Attach IP helper middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  const forwarded = req.headers['x-forwarded-for'];
  const rawIp =
    typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : req.socket.remoteAddress || req.ip || '127.0.0.1';
  req.clientIp = rawIp;
  next();
});

// Payload too large error handler
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return res.status(413).json({
      error: 'Archivo demasiado pesado',
      mensaje: `El archivo excede el límite máximo permitido de ${SERVER_CONFIG.maxFileBytes / (1024 * 1024)} MB. Comprimí la imagen o PDF para continuar.`,
    });
  }
  next(err);
});

// Mount modular API routes
app.use('/api', apiRoutes);

// 404 handler for nonexistent /api routes - returns JSON, never index.html
app.all('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    mensaje: 'El endpoint solicitado no existe en la API de CátedraIA.',
  });
});

// Global error handling middleware (logs details on server, returns generic message to client)
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  console.error('[Global Unhandled Server Error]:', err);
  if (res.headersSent) {
    return next(err);
  }
  const status = typeof err?.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
  res.status(status).json({
    error: 'Error interno del servidor',
    mensaje: 'Ocurrió un error inesperado al procesar la solicitud. Por favor intenta más tarde.',
  });
});

// Bootstrap initial seed data into Firestore on startup if empty
ejerciciosRepo.seedInitialIfEmpty().catch((err) => {
  console.error('[Firestore] Failed to seed initial ejercicios:', err);
});

// Vite Middleware / Static Serving Setup
async function startServer() {
  if (!SERVER_CONFIG.isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(SERVER_CONFIG.port, '0.0.0.0', () => {
    console.log(
      `CátedraIA server running on http://0.0.0.0:${SERVER_CONFIG.port} with Firebase Auth & Firestore`
    );
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
