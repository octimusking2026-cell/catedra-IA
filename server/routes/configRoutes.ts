import { Router, Request, Response } from 'express';
import { CLIENT_CONFIG } from '../config';

const router = Router();

router.get('/config', (_req: Request, res: Response) => {
  res.json(CLIENT_CONFIG);
});

export default router;
