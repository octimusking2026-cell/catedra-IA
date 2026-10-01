import { db } from './client';
import { Resolucion } from '../../src/types';
import { SEED_RESOLUCIONES } from '../../src/data/seed';

const COLLECTION = 'resoluciones';

export async function seedInitialResolucionesIfEmpty(): Promise<void> {
  try {
    const snapshot = await db.collection(COLLECTION).limit(1).get();
    if (snapshot.empty) {
      const batch = db.batch();
      for (const res of SEED_RESOLUCIONES) {
        const ref = db.collection(COLLECTION).doc(res.id);
        batch.set(ref, res);
      }
      await batch.commit();
      console.log('[Firestore] Initial SEED_RESOLUCIONES populated.');
    }
  } catch (err) {
    console.error('Error seeding initial resoluciones to Firestore:', err);
  }
}

export async function getResolucionById(id: string): Promise<Resolucion | null> {
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return doc.data() as Resolucion;
}

/**
 * Returns all resolutions for a given exercise, active and archived.
 */
export async function getResolucionesByEjercicioId(ejercicioId: string): Promise<Resolucion[]> {
  const snapshot = await db.collection(COLLECTION).where('ejercicio_id', '==', ejercicioId).get();
  return snapshot.docs.map((doc) => doc.data() as Resolucion);
}

/**
 * Returns the active (non-archived) resolution for an exercise.
 */
export async function getResolucionByEjercicioId(ejercicioId: string): Promise<Resolucion | null> {
  const all = await getResolucionesByEjercicioId(ejercicioId);
  const active = all.filter((r) => r.estado !== 'archivada');
  if (active.length === 0) return null;
  // Return the most recent active resolution
  active.sort((a, b) => new Date(b.fecha_generada).getTime() - new Date(a.fecha_generada).getTime());
  return active[0];
}

export async function getResolucionByHash(hash: string): Promise<Resolucion | null> {
  if (!hash) return null;
  const snapshot = await db.collection(COLLECTION).where('hash_enunciado', '==', hash).get();
  if (snapshot.empty) return null;
  const docs = snapshot.docs.map((d) => d.data() as Resolucion);
  const active = docs.filter((r) => r.estado !== 'archivada');
  if (active.length === 0) return null;
  active.sort((a, b) => new Date(b.fecha_generada).getTime() - new Date(a.fecha_generada).getTime());
  return active[0];
}

export async function getAllResoluciones(): Promise<Resolucion[]> {
  const snapshot = await db.collection(COLLECTION).get();
  return snapshot.docs.map((doc) => doc.data() as Resolucion);
}

/**
 * Saves a new resolution.
 * Archives any existing active resolution for the exercise rather than deleting it.
 */
export async function saveResolucion(resolucion: Resolucion): Promise<Resolucion> {
  const existingSnapshot = await db.collection(COLLECTION).where('ejercicio_id', '==', resolucion.ejercicio_id).get();
  const batch = db.batch();

  for (const doc of existingSnapshot.docs) {
    if (doc.id !== resolucion.id) {
      const data = doc.data() as Resolucion;
      if (data.estado !== 'archivada') {
        batch.update(doc.ref, { estado: 'archivada' });
      }
    }
  }

  const ref = db.collection(COLLECTION).doc(resolucion.id);
  batch.set(ref, resolucion);
  await batch.commit();

  return resolucion;
}

export const createOrUpdateResolucion = saveResolucion;

export async function updateResolucionStatus(
  id: string,
  updates: {
    votos_positivos: number;
    votos_negativos: number;
    estado: 'sin_verificar' | 'verificada' | 'en_revision' | 'archivada';
  }
): Promise<void> {
  await db.collection(COLLECTION).doc(id).update(updates);
}
