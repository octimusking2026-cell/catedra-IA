import { db } from './client';

const COLLECTION = 'feedback';

export interface FeedbackPayload {
  id: string;
  userId: string;
  usuario_nombre?: string;
  usuario_email?: string;
  mensaje: string;
  pantalla: string;
  fecha: string;
}

export async function createFeedback(feedback: FeedbackPayload): Promise<FeedbackPayload> {
  await db.collection(COLLECTION).doc(feedback.id).set(feedback);
  return feedback;
}
