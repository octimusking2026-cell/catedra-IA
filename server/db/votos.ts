import { db } from './client';
import { VotoDetalle, Resolucion } from '../../src/types';
import { updateResolucionStatus, getResolucionById } from './resoluciones';

const COLLECTION = 'votos';

export function getVotoDocId(resolucionId: string, userId: string): string {
  return `${resolucionId}_${userId}`;
}

export async function getVoto(resolucionId: string, userId: string): Promise<VotoDetalle | null> {
  const docId = getVotoDocId(resolucionId, userId);
  const doc = await db.collection(COLLECTION).doc(docId).get();
  if (!doc.exists) return null;
  return doc.data() as VotoDetalle;
}

export async function getVotosByResolucion(resolucionId: string): Promise<VotoDetalle[]> {
  const snapshot = await db.collection(COLLECTION).where('resolucion_id', '==', resolucionId).get();
  return snapshot.docs.map((d) => d.data() as VotoDetalle);
}

export function calculateResolutionStatus(
  positivos: number,
  negativos: number
): 'sin_verificar' | 'verificada' | 'en_revision' {
  const netPositivos = positivos - negativos;
  if (netPositivos >= 3) {
    return 'verificada';
  } else if (negativos >= 2 && negativos > positivos) {
    return 'en_revision';
  }
  return 'sin_verificar';
}

export async function saveVotoAndRecalculate(params: {
  userId: string;
  resolucionId: string;
  tipo: 'positivo' | 'negativo';
  comentario?: string;
}): Promise<{
  voto: VotoDetalle;
  resolucion: Resolucion;
} | null> {
  const { userId, resolucionId, tipo, comentario } = params;
  const docId = getVotoDocId(resolucionId, userId);
  const cleanComment = typeof comentario === 'string' ? comentario.trim() : undefined;

  const votoData: VotoDetalle = {
    user_id: userId,
    resolucion_id: resolucionId,
    tipo,
    comentario: cleanComment,
    fecha: new Date().toISOString(),
  };

  await db.collection(COLLECTION).doc(docId).set(votoData);

  // Recalculate unique votes for this resolution
  const allVotes = await getVotosByResolucion(resolucionId);
  const positivos = allVotes.filter((v) => v.tipo === 'positivo').length;
  const negativos = allVotes.filter((v) => v.tipo === 'negativo').length;
  const estado = calculateResolutionStatus(positivos, negativos);

  await updateResolucionStatus(resolucionId, {
    votos_positivos: positivos,
    votos_negativos: negativos,
    estado,
  });

  const updatedResolucion = await getResolucionById(resolucionId);
  if (!updatedResolucion) return null;

  return {
    voto: votoData,
    resolucion: updatedResolucion,
  };
}

export const recordVote = saveVotoAndRecalculate;
