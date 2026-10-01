import {
  IUsuariosRepository,
  IEjerciciosRepository,
  IResolucionesRepository,
  IVotosRepository,
  IFeedbackRepository,
  IWaitlistRepository,
  IAcademicRepository,
  IUsoDiarioRepository,
  IAiLogRepository,
} from './interfaces';
import {
  FirestoreUsuariosRepository,
  FirestoreEjerciciosRepository,
  FirestoreResolucionesRepository,
  FirestoreVotosRepository,
  FirestoreFeedbackRepository,
  FirestoreWaitlistRepository,
  FirestoreUsoDiarioRepository,
  FirestoreAiLogRepository,
} from './firestoreRepositories';
import { FirestoreAcademicRepository } from './academicRepository';

export * from './interfaces';

export const usuariosRepo: IUsuariosRepository = new FirestoreUsuariosRepository();
export const ejerciciosRepo: IEjerciciosRepository = new FirestoreEjerciciosRepository();
export const resolucionesRepo: IResolucionesRepository = new FirestoreResolucionesRepository();
export const votosRepo: IVotosRepository = new FirestoreVotosRepository();
export const feedbackRepo: IFeedbackRepository = new FirestoreFeedbackRepository();
export const waitlistRepo: IWaitlistRepository = new FirestoreWaitlistRepository();
export const academicRepo: IAcademicRepository = new FirestoreAcademicRepository();
export const usoDiarioRepo: IUsoDiarioRepository = new FirestoreUsoDiarioRepository();
export const aiLogRepo: IAiLogRepository = new FirestoreAiLogRepository();
