import { db } from './client';
import { SERVER_CONFIG } from '../config';

const COLLECTION = 'uso_diario';

export function getTodayArgentinaString(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }
}

export function getUsoDocId(userId: string, dateStr: string): string {
  return `${userId}_${dateStr}`;
}

export async function getUserDailyQueries(userId: string, dateStr?: string): Promise<number> {
  const targetDate = dateStr || getTodayArgentinaString();
  const docId = getUsoDocId(userId, targetDate);
  const doc = await db.collection(COLLECTION).doc(docId).get();
  if (!doc.exists) return 0;
  return (doc.data()?.cantidad as number) || 0;
}

export async function checkAndIncrementUserDailyQuota(
  userId: string,
  limit: number = SERVER_CONFIG.dailyLimit,
  dateStr?: string
): Promise<{ allowed: boolean; used: number; remaining: number }> {
  const targetDate = dateStr || getTodayArgentinaString();
  const docId = getUsoDocId(userId, targetDate);
  const docRef = db.collection(COLLECTION).doc(docId);

  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(docRef);
    const current = doc.exists ? ((doc.data()?.cantidad as number) || 0) : 0;

    if (current >= limit) {
      return {
        allowed: false,
        used: current,
        remaining: 0,
      };
    }

    const nextCount = current + 1;
    transaction.set(
      docRef,
      {
        user_id: userId,
        fecha: targetDate,
        cantidad: nextCount,
        ultima_actualizacion: new Date().toISOString(),
      },
      { merge: true }
    );

    return {
      allowed: true,
      used: nextCount,
      remaining: Math.max(0, limit - nextCount),
    };
  });
}

export async function decrementUserDailyQuota(userId: string, dateStr?: string): Promise<void> {
  const targetDate = dateStr || getTodayArgentinaString();
  const docId = getUsoDocId(userId, targetDate);
  const docRef = db.collection(COLLECTION).doc(docId);

  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(docRef);
    if (doc.exists) {
      const current = (doc.data()?.cantidad as number) || 0;
      const nextCount = Math.max(0, current - 1);
      transaction.update(docRef, {
        cantidad: nextCount,
        ultima_actualizacion: new Date().toISOString(),
      });
    }
  });
}

/**
 * Registra usageMetadata (tokens) consumidos por el usuario en el día
 */
export async function recordUserTokenUsage(
  userId: string,
  tokens: number,
  dateStr?: string
): Promise<void> {
  if (tokens <= 0) return;
  try {
    const targetDate = dateStr || getTodayArgentinaString();
    const docId = getUsoDocId(userId, targetDate);
    const docRef = db.collection(COLLECTION).doc(docId);

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      const currentTokens = doc.exists ? ((doc.data()?.tokens_usados as number) || 0) : 0;
      transaction.set(
        docRef,
        {
          user_id: userId,
          fecha: targetDate,
          tokens_usados: currentTokens + tokens,
          ultima_actualizacion: new Date().toISOString(),
        },
        { merge: true }
      );
    });
  } catch (err) {
    console.error('Error al registrar tokens del usuario en uso_diario:', err);
  }
}

export async function getUserDailyTokens(userId: string, dateStr?: string): Promise<number> {
  const targetDate = dateStr || getTodayArgentinaString();
  const docId = getUsoDocId(userId, targetDate);
  const doc = await db.collection(COLLECTION).doc(docId).get();
  if (!doc.exists) return 0;
  return (doc.data()?.tokens_usados as number) || 0;
}


