import {
  IUsuariosRepository,
  IEjerciciosRepository,
  IResolucionesRepository,
  IVotosRepository,
  IFeedbackRepository,
  IWaitlistRepository,
  IUsoDiarioRepository,
  IAiLogRepository,
} from './interfaces';
import {
  Usuario,
  Ejercicio,
  Resolucion,
  VotoDetalle,
} from '../../src/types';
import { FeedbackPayload } from '../db/feedback';
import {
  getOrCreateUserFromToken,
  getUser,
  deleteUserDataFromFirestore,
  createFeedback,
  getEjercicios,
  getEjerciciosByUsuario,
  getEjercicioById,
  getEjercicioByHash,
  createEjercicio,
  seedInitialEjerciciosIfEmpty,
  getResolucionByEjercicioId,
  getResolucionesByEjercicioId,
  getResolucionByHash,
  createOrUpdateResolucion,
  getVoto,
  saveVotoAndRecalculate,
  getUserDailyQueries,
  checkAndIncrementUserDailyQuota,
  decrementUserDailyQuota,
  recordUserTokenUsage,
  reserveDailyTokens,
  refundDailyTokens,
  reconcileDailyTokens,
  getTodayTokenUsage,
  logAiCall,
  db,
} from '../db';
import crypto from 'crypto';

export class FirestoreUsuariosRepository implements IUsuariosRepository {
  async getById(id: string): Promise<Usuario | null> {
    return getUser(id);
  }

  async getByEmail(email: string): Promise<Usuario | null> {
    const snap = await db.collection('usuarios').where('email', '==', email.toLowerCase()).limit(1).get();
    if (snap.empty) return null;
    return snap.docs[0].data() as Usuario;
  }

  async getOrCreateFromToken(tokenData: {
    uid: string;
    email?: string;
    name?: string;
    picture?: string;
  }): Promise<Usuario> {
    return getOrCreateUserFromToken(tokenData);
  }

  async createOrUpdate(user: Usuario): Promise<Usuario> {
    await db.collection('usuarios').doc(user.id).set(user, { merge: true });
    return user;
  }

  async deleteUserData(userId: string): Promise<void> {
    return deleteUserDataFromFirestore(userId);
  }
}

export class FirestoreEjerciciosRepository implements IEjerciciosRepository {
  async getById(id: string): Promise<Ejercicio | null> {
    return getEjercicioById(id);
  }

  async getByHash(hash: string): Promise<Ejercicio | null> {
    return getEjercicioByHash(hash);
  }

  async getAll(filter?: {
    catedra_id?: string;
    materia_id?: string;
    tema?: string;
    query?: string;
    currentUserId?: string;
  }): Promise<Ejercicio[]> {
    return getEjercicios(filter);
  }

  async getByUsuario(userId: string): Promise<Ejercicio[]> {
    return getEjerciciosByUsuario(userId);
  }

  async create(ejercicio: Ejercicio): Promise<Ejercicio> {
    return createEjercicio(ejercicio);
  }

  async delete(id: string): Promise<void> {
    const { deleteEjercicio } = await import('../db/ejercicios');
    return deleteEjercicio(id);
  }

  async seedInitialIfEmpty(): Promise<void> {
    return seedInitialEjerciciosIfEmpty();
  }
}

export class FirestoreResolucionesRepository implements IResolucionesRepository {
  async getById(id: string): Promise<Resolucion | null> {
    const snap = await db.collection('resoluciones').doc(id).get();
    if (!snap.exists) return null;
    return snap.data() as Resolucion;
  }

  async getByEjercicioId(ejercicioId: string): Promise<Resolucion | null> {
    return getResolucionByEjercicioId(ejercicioId);
  }

  async getAllByEjercicioId(ejercicioId: string): Promise<Resolucion[]> {
    return getResolucionesByEjercicioId(ejercicioId);
  }

  async getByHash(hash: string): Promise<Resolucion | null> {
    return getResolucionByHash(hash);
  }

  async createOrUpdate(resolucion: Resolucion): Promise<Resolucion> {
    return createOrUpdateResolucion(resolucion);
  }
}

export class FirestoreVotosRepository implements IVotosRepository {
  async get(resolucionId: string, userId: string): Promise<VotoDetalle | null> {
    return getVoto(resolucionId, userId);
  }

  async saveAndRecalculate(params: {
    userId: string;
    resolucionId: string;
    tipo: 'positivo' | 'negativo';
    comentario?: string;
  }): Promise<{ resolucion: Resolucion; voto: VotoDetalle } | null> {
    return saveVotoAndRecalculate(params);
  }
}

export class FirestoreFeedbackRepository implements IFeedbackRepository {
  async create(feedback: FeedbackPayload): Promise<FeedbackPayload> {
    return createFeedback(feedback);
  }
}

export class FirestoreWaitlistRepository implements IWaitlistRepository {
  async save(entry: {
    email: string;
    materia_o_carrera?: string;
    fecha: string;
    ip?: string;
  }): Promise<void> {
    const normalizedEmail = entry.email.toLowerCase().trim();
    const docId = crypto.createHash('sha256').update(normalizedEmail).digest('hex').slice(0, 32);
    const waitlistRef = db.collection('waitlist').doc(docId);
    const docSnap = await waitlistRef.get();

    if (!docSnap.exists) {
      await waitlistRef.set({
        email: normalizedEmail,
        materia_o_carrera: (entry.materia_o_carrera || '').trim(),
        fecha: entry.fecha,
        ip: entry.ip || 'unknown',
      });
    }
  }
}

export class FirestoreUsoDiarioRepository implements IUsoDiarioRepository {
  async getUserDailyQueries(userId: string, dateStr?: string): Promise<number> {
    return getUserDailyQueries(userId, dateStr);
  }

  async checkAndIncrementUserDailyQuota(
    userId: string,
    limit: number,
    dateStr?: string
  ): Promise<{ allowed: boolean; remaining: number }> {
    return checkAndIncrementUserDailyQuota(userId, limit, dateStr);
  }

  async decrementUserDailyQuota(userId: string, dateStr?: string): Promise<void> {
    return decrementUserDailyQuota(userId, dateStr);
  }

  async recordUserTokenUsage(userId: string, tokenCount: number, dateStr?: string): Promise<void> {
    return recordUserTokenUsage(userId, tokenCount, dateStr);
  }

  async reserveDailyTokens(
    tokensNeeded: number,
    dailyCap: number,
    dateStr?: string
  ): Promise<{ allowed: boolean; currentTokens: number }> {
    const res = await reserveDailyTokens(tokensNeeded, dailyCap, dateStr);
    return {
      allowed: res.allowed,
      currentTokens: res.current,
    };
  }

  async refundDailyTokens(tokensRefunded: number, dateStr?: string): Promise<void> {
    return refundDailyTokens(tokensRefunded, dateStr);
  }

  async reconcileDailyTokens(estimatedTokens: number, actualTokens: number, dateStr?: string): Promise<void> {
    return reconcileDailyTokens(estimatedTokens, actualTokens, dateStr);
  }

  async getTodayTokenUsage(dateStr?: string): Promise<number> {
    return getTodayTokenUsage(dateStr);
  }
}

export class FirestoreAiLogRepository implements IAiLogRepository {
  async logAiCall(data: {
    userId: string;
    fecha: string;
    tokens_in: number;
    tokens_out: number;
    latencia_ms: number;
    error?: string;
  }): Promise<void> {
    return logAiCall(data);
  }
}
