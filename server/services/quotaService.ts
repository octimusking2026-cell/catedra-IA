import { Request, Response } from 'express';
import { usoDiarioRepo, aiLogRepo } from '../repositories';
import { SERVER_CONFIG } from '../config';
import { getTodayArgentinaString } from '../db/uso_diario';

export { getTodayArgentinaString };

// -------------------------------------------------------------
// Two-Layer Cost & Spam Protection: Rate Limiter (UID + IP)
// -------------------------------------------------------------
const rateLimitMap: Record<string, number[]> = {};

// Purga periódica automática en memoria para evitar memory leaks (cada 60 segundos)
if (typeof setInterval !== 'undefined') {
  const purgeInterval = setInterval(() => {
    const now = Date.now();
    const windowMs = SERVER_CONFIG.rateLimits.windowMs;
    for (const key of Object.keys(rateLimitMap)) {
      const active = (rateLimitMap[key] || []).filter((t) => now - t < windowMs);
      if (active.length === 0) {
        delete rateLimitMap[key];
      } else {
        rateLimitMap[key] = active;
      }
    }
  }, 60000);
  // unref para no bloquear el cierre del proceso en tests unitarios
  if (typeof purgeInterval?.unref === 'function') {
    purgeInterval.unref();
  }
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs = SERVER_CONFIG.rateLimits.windowMs
): boolean {
  const now = Date.now();
  const history = (rateLimitMap[key] || []).filter((t) => now - t < windowMs);
  if (history.length >= maxRequests) {
    return false;
  }
  history.push(now);
  rateLimitMap[key] = history;
  return true;
}

export function enforceDoubleRateLimit(
  req: Request,
  res: Response,
  actionTag: string,
  uidLimit = 10,
  ipLimit = 30
): boolean {
  const userId = req.uid || req.user?.uid;
  const clientIp = req.clientIp || 'unknown_ip';

  // 1. IP rate check
  if (!checkRateLimit(`${actionTag}_ip_${clientIp}`, ipLimit)) {
    res.status(429).json({
      error: 'Límite de velocidad superado',
      mensaje: 'Demasiadas solicitudes desde tu red. Por favor aguardá un minuto.',
    });
    return false;
  }

  // 2. User ID rate check
  if (userId && !checkRateLimit(`${actionTag}_uid_${userId}`, uidLimit)) {
    res.status(429).json({
      error: 'Límite de velocidad superado',
      mensaje: 'Demasiadas solicitudes en poco tiempo para tu usuario. Por favor aguardá un minuto.',
    });
    return false;
  }

  return true;
}

// -------------------------------------------------------------
// Quota & Token Management Facade
// -------------------------------------------------------------
export async function getUserDailyQueries(userId: string): Promise<number> {
  return usoDiarioRepo.getUserDailyQueries(userId);
}

export async function checkAndIncrementUserDailyQuota(
  userId: string,
  limit = SERVER_CONFIG.dailyLimit
): Promise<{ allowed: boolean; remaining: number }> {
  return usoDiarioRepo.checkAndIncrementUserDailyQuota(userId, limit);
}

export async function decrementUserDailyQuota(userId: string): Promise<void> {
  return usoDiarioRepo.decrementUserDailyQuota(userId);
}

export async function reserveDailyTokens(
  tokensNeeded: number,
  dailyCap = SERVER_CONFIG.dailyTokenCap
): Promise<{ allowed: boolean; currentTokens: number }> {
  return usoDiarioRepo.reserveDailyTokens(tokensNeeded, dailyCap);
}

export async function refundDailyTokens(tokensRefunded: number): Promise<void> {
  return usoDiarioRepo.refundDailyTokens(tokensRefunded);
}

export async function reconcileDailyTokens(
  estimatedTokens: number,
  actualTokens: number
): Promise<void> {
  return usoDiarioRepo.reconcileDailyTokens(estimatedTokens, actualTokens);
}

export async function recordUserTokenUsage(
  userId: string,
  tokenCount: number
): Promise<void> {
  return usoDiarioRepo.recordUserTokenUsage(userId, tokenCount);
}

export async function logAiCall(data: {
  userId: string;
  fecha: string;
  tokens_in: number;
  tokens_out: number;
  latencia_ms: number;
  error?: string;
}): Promise<void> {
  return aiLogRepo.logAiCall(data);
}
