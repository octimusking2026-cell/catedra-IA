import {
  Usuario,
  Ejercicio,
  Resolucion,
  VotoDetalle,
  Facultad,
  Carrera,
  Materia,
  Catedra,
} from '../../src/types';
import { FeedbackPayload } from '../db/feedback';

export interface IUsuariosRepository {
  getById(id: string): Promise<Usuario | null>;
  getByEmail(email: string): Promise<Usuario | null>;
  getOrCreateFromToken(tokenData: {
    uid: string;
    email?: string;
    name?: string;
    picture?: string;
  }): Promise<Usuario>;
  createOrUpdate(user: Usuario): Promise<Usuario>;
  deleteUserData(userId: string): Promise<{
    success: boolean;
    authDeleted: boolean;
    firestoreDeleted: boolean;
    errors?: string[];
  }>;
}

export interface IEjerciciosRepository {
  getById(id: string): Promise<Ejercicio | null>;
  getByHash(hash: string): Promise<Ejercicio | null>;
  getAll(filter?: {
    catedra_id?: string;
    materia_id?: string;
    tema?: string;
    query?: string;
    currentUserId?: string;
  }): Promise<Ejercicio[]>;
  getAllPaginated(filter?: {
    catedra_id?: string;
    materia_id?: string;
    tema?: string;
    query?: string;
    currentUserId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    ejercicios: Ejercicio[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
  getByUsuario(userId: string): Promise<Ejercicio[]>;
  create(ejercicio: Ejercicio): Promise<Ejercicio>;
  delete(id: string): Promise<void>;
  seedInitialIfEmpty(): Promise<void>;
}

export interface IResolucionesRepository {
  getById(id: string): Promise<Resolucion | null>;
  getByEjercicioId(ejercicioId: string): Promise<Resolucion | null>;
  getAllByEjercicioId(ejercicioId: string): Promise<Resolucion[]>;
  getByHash(hash: string): Promise<Resolucion | null>;
  createOrUpdate(resolucion: Resolucion): Promise<Resolucion>;
}

export interface IVotosRepository {
  get(resolucionId: string, userId: string): Promise<VotoDetalle | null>;
  saveAndRecalculate(params: {
    userId: string;
    resolucionId: string;
    tipo: 'positivo' | 'negativo';
    comentario?: string;
  }): Promise<{ resolucion: Resolucion; voto: VotoDetalle } | null>;
}

export interface IFeedbackRepository {
  create(feedback: FeedbackPayload): Promise<FeedbackPayload>;
}

export interface IWaitlistRepository {
  save(entry: {
    email: string;
    materia_o_carrera?: string;
    fecha: string;
    ip?: string;
  }): Promise<void>;
}

export interface IAcademicRepository {
  getCarreras(facultadId?: string): Promise<Carrera[]>;
  getCarreraById(id: string): Promise<Carrera | null>;
  getFacultades(): Promise<Facultad[]>;
  getMaterias(filters?: { facultadId?: string; carreraId?: string; anio?: number }): Promise<Materia[]>;
  getCatedras(materiaId?: string): Promise<Catedra[]>;
  getCatedraById(id: string): Promise<Catedra | null>;
  getMateriaById(id: string): Promise<Materia | null>;
  getFacultadById(id: string): Promise<Facultad | null>;
  getCatedrasByMateriaId(materiaId: string): Promise<Catedra[]>;
  createFacultad(facultad: Facultad): Promise<Facultad>;
  updateFacultad(id: string, facultad: Partial<Facultad>): Promise<Facultad>;
  deleteFacultad(id: string): Promise<void>;
  createCarrera(carrera: Carrera): Promise<Carrera>;
  updateCarrera(id: string, carrera: Partial<Carrera>): Promise<Carrera>;
  deleteCarrera(id: string): Promise<void>;
  createMateria(materia: Materia): Promise<Materia>;
  updateMateria(id: string, materia: Partial<Materia>): Promise<Materia>;
  deleteMateria(id: string): Promise<void>;
  createCatedra(catedra: Catedra): Promise<Catedra>;
  updateCatedra(id: string, catedra: Partial<Catedra>): Promise<Catedra>;
  deleteCatedra(id: string): Promise<void>;
  seedInitialIfEmpty(): Promise<void>;
}

export interface IUsoDiarioRepository {
  getUserDailyQueries(userId: string, dateStr?: string): Promise<number>;
  checkAndIncrementUserDailyQuota(
    userId: string,
    limit: number,
    dateStr?: string
  ): Promise<{ allowed: boolean; remaining: number }>;
  decrementUserDailyQuota(userId: string, dateStr?: string): Promise<void>;
  recordUserTokenUsage(userId: string, tokenCount: number, dateStr?: string): Promise<void>;
  reserveDailyTokens(
    tokensNeeded: number,
    dailyCap: number,
    dateStr?: string
  ): Promise<{ allowed: boolean; currentTokens: number }>;
  refundDailyTokens(tokensRefunded: number, dateStr?: string): Promise<void>;
  reconcileDailyTokens(estimatedTokens: number, actualTokens: number, dateStr?: string): Promise<void>;
  getTodayTokenUsage(dateStr?: string): Promise<number>;
}

export interface IAiLogRepository {
  logAiCall(data: {
    userId: string;
    fecha: string;
    tokens_in: number;
    tokens_out: number;
    latencia_ms: number;
    error?: string;
  }): Promise<void>;
}
