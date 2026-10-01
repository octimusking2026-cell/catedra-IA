import { db } from './client';
import { getTodayArgentinaString } from './uso_diario';

const AI_LOG_COLLECTION = 'ai_log';
const TOKEN_CAP_COLLECTION = 'uso_tokens_diario';

export const DAILY_TOKEN_CAP = process.env.DAILY_TOKEN_CAP ? parseInt(process.env.DAILY_TOKEN_CAP) : 5000000;

export interface AiLogEntry {
  userId: string;
  fecha: string;
  tokens_in: number;
  tokens_out: number;
  latencia_ms: number;
  error?: string;
  timestamp: string;
}

export async function logAiCall(data: {
  userId: string;
  fecha?: string;
  tokens_in: number;
  tokens_out: number;
  latencia_ms: number;
  error?: string;
}): Promise<void> {
  try {
    const fecha = data.fecha || getTodayArgentinaString();
    const entry: any = {
      userId: data.userId,
      fecha,
      tokens_in: data.tokens_in || 0,
      tokens_out: data.tokens_out || 0,
      latencia_ms: data.latencia_ms || 0,
      timestamp: new Date().toISOString(),
    };

    if (data.error !== undefined) {
      entry.error = data.error;
    }

    // Save log entry in ai_log collection
    await db.collection(AI_LOG_COLLECTION).add(entry);
  } catch (err) {
    console.error('Error recording AI log in Firestore:', err);
  }
}

export async function getDailyTokensUsed(dateStr?: string): Promise<number> {
  try {
    const targetDate = dateStr || getTodayArgentinaString();
    const doc = await db.collection(TOKEN_CAP_COLLECTION).doc(targetDate).get();
    if (!doc.exists) return 0;
    return (doc.data()?.tokens_usados as number) || 0;
  } catch (err) {
    console.error('Error fetching daily token usage:', err);
    return 0;
  }
}

export const getTodayTokenUsage = getDailyTokensUsed;

export async function reserveDailyTokens(
  estimatedTokens: number,
  cap = DAILY_TOKEN_CAP,
  dateStr?: string
): Promise<{ allowed: boolean; current: number; remaining: number }> {
  const targetDate = dateStr || getTodayArgentinaString();
  const tokenDocRef = db.collection(TOKEN_CAP_COLLECTION).doc(targetDate);

  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(tokenDocRef);
    const current = doc.exists ? ((doc.data()?.tokens_usados as number) || 0) : 0;

    if (current + estimatedTokens > cap) {
      return {
        allowed: false,
        current,
        remaining: Math.max(0, cap - current),
      };
    }

    const nextUsed = current + estimatedTokens;
    transaction.set(
      tokenDocRef,
      {
        fecha: targetDate,
        tokens_usados: nextUsed,
        ultima_actualizacion: new Date().toISOString(),
      },
      { merge: true }
    );

    return {
      allowed: true,
      current: nextUsed,
      remaining: Math.max(0, cap - nextUsed),
    };
  });
}

export async function refundDailyTokens(
  estimatedTokens: number,
  dateStr?: string
): Promise<void> {
  if (estimatedTokens <= 0) return;
  try {
    const targetDate = dateStr || getTodayArgentinaString();
    const tokenDocRef = db.collection(TOKEN_CAP_COLLECTION).doc(targetDate);

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(tokenDocRef);
      if (doc.exists) {
        const current = (doc.data()?.tokens_usados as number) || 0;
        const nextUsed = Math.max(0, current - estimatedTokens);
        transaction.update(tokenDocRef, {
          tokens_usados: nextUsed,
          ultima_actualizacion: new Date().toISOString(),
        });
      }
    });
  } catch (err) {
    console.error('Error al reembolsar tokens en Firestore:', err);
  }
}

export async function reconcileDailyTokens(
  estimatedTokens: number,
  actualTokens: number,
  dateStr?: string
): Promise<void> {
  const diff = actualTokens - estimatedTokens;
  if (diff === 0) return;

  try {
    const targetDate = dateStr || getTodayArgentinaString();
    const tokenDocRef = db.collection(TOKEN_CAP_COLLECTION).doc(targetDate);

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(tokenDocRef);
      const current = doc.exists ? ((doc.data()?.tokens_usados as number) || 0) : 0;
      const nextUsed = Math.max(0, current + diff);
      transaction.set(
        tokenDocRef,
        {
          fecha: targetDate,
          tokens_usados: nextUsed,
          ultima_actualizacion: new Date().toISOString(),
        },
        { merge: true }
      );
    });
  } catch (err) {
    console.error('Error al conciliar tokens en Firestore:', err);
  }
}

export async function canConsumeTokens(dateStr?: string, cap = DAILY_TOKEN_CAP): Promise<boolean> {
  const currentUsed = await getDailyTokensUsed(dateStr);
  return currentUsed < cap;
}

export const canExecuteAiCallWithTokenCap = canConsumeTokens;

