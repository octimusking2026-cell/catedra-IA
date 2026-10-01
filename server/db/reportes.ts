import { db } from './client';

export interface ReporteDoc {
  id: string;
  ejercicio_id: string;
  usuario_id: string;
  usuario_nombre?: string;
  motivo: string;
  detalle?: string;
  fecha: string;
  resuelto?: boolean;
}

const COLLECTION = 'reportes';

export async function saveReporte(data: Omit<ReporteDoc, 'id' | 'fecha'>): Promise<ReporteDoc> {
  const ref = db.collection(COLLECTION).doc();
  const docData: ReporteDoc = {
    id: ref.id,
    ...data,
    fecha: new Date().toISOString(),
    resuelto: false,
  };
  await ref.set(docData);
  return docData;
}

export async function getReportes(): Promise<ReporteDoc[]> {
  const snapshot = await db.collection(COLLECTION).orderBy('fecha', 'desc').limit(50).get();
  return snapshot.docs.map((d) => d.data() as ReporteDoc);
}

export async function getVotosNegativosComentarios(): Promise<any[]> {
  const snapshot = await db.collection('votos').where('tipo', '==', 'negativo').get();
  return snapshot.docs
    .map((d) => d.data())
    .filter((v) => Boolean(v.comentario && v.comentario.trim().length > 0));
}

export async function setEjercicioAprobadoStatus(ejercicioId: string, aprobado: boolean): Promise<boolean> {
  const ref = db.collection('ejercicios').doc(ejercicioId);
  await ref.update({ aprobado });
  return true;
}
