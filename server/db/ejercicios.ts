import { db } from './client';
import { Ejercicio } from '../../src/types';
import { SEED_EJERCICIOS } from '../../src/data/seed';

const COLLECTION = 'ejercicios';

export async function seedInitialEjerciciosIfEmpty(): Promise<void> {
  try {
    const snapshot = await db.collection(COLLECTION).limit(1).get();
    if (snapshot.empty) {
      const batch = db.batch();
      for (const ej of SEED_EJERCICIOS) {
        const ref = db.collection(COLLECTION).doc(ej.id);
        batch.set(ref, ej);
      }
      await batch.commit();
      console.log('[Firestore] Initial SEED_EJERCICIOS populated.');
    }
  } catch (err) {
    console.error('Error seeding initial ejercicios to Firestore:', err);
  }
}

export async function getEjercicios(filters?: {
  catedra_id?: string;
  materia_id?: string;
  tema?: string;
  query?: string;
  currentUserId?: string;
}): Promise<Ejercicio[]> {
  let queryRef: FirebaseFirestore.Query = db.collection(COLLECTION);

  if (filters?.catedra_id) {
    queryRef = queryRef.where('catedra_id', '==', filters.catedra_id);
  } else if (filters?.materia_id) {
    // Get catedras for materia_id directly from Firestore
    const catsSnapshot = await db.collection('catedras').where('materia_id', '==', filters.materia_id).get();
    const catedraIds = catsSnapshot.docs.map((doc) => doc.id);
    if (catedraIds.length > 0) {
      queryRef = queryRef.where('catedra_id', 'in', catedraIds.slice(0, 30));
    } else {
      return [];
    }
  }

  const snapshot = await queryRef.get();
  let items = snapshot.docs.map((doc) => doc.data() as Ejercicio);

  // Filter by user ownership and subject sharing
  // Return only MY exercises PLUS shared exercises ('compartido' or default)
  if (filters?.currentUserId) {
    const uid = filters.currentUserId;
    items = items.filter((e) => {
      const isMine = e.usuario_id_subio === uid;
      const isShared = e.visibilidad === 'compartido' || !e.visibilidad;
      return isMine || isShared;
    });
  }

  if (filters?.tema && filters.tema !== 'todos') {
    items = items.filter((e) => e.tema === filters.tema);
  }

  if (filters?.query) {
    const q = filters.query.toLowerCase();
    items = items.filter(
      (e) =>
        (e.titulo && e.titulo.toLowerCase().includes(q)) ||
        (e.texto_ocr && e.texto_ocr.toLowerCase().includes(q)) ||
        (e.tema && e.tema.toLowerCase().includes(q))
    );
  }

  // Sort by fecha_subida descending
  items.sort((a, b) => new Date(b.fecha_subida).getTime() - new Date(a.fecha_subida).getTime());

  return items;
}

export async function getEjerciciosPaginated(filters?: {
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
}> {
  const page = filters?.page ? Math.max(1, filters.page) : 1;
  const limit = filters?.limit ? Math.max(1, filters.limit) : 10;

  let queryRef: FirebaseFirestore.Query = db.collection(COLLECTION);

  if (filters?.catedra_id) {
    queryRef = queryRef.where('catedra_id', '==', filters.catedra_id);
  } else if (filters?.materia_id) {
    // Get catedras for materia_id directly from Firestore
    const catsSnapshot = await db.collection('catedras').where('materia_id', '==', filters.materia_id).get();
    const catedraIds = catsSnapshot.docs.map((doc) => doc.id);
    if (catedraIds.length > 0) {
      queryRef = queryRef.where('catedra_id', 'in', catedraIds.slice(0, 30));
    } else {
      return { ejercicios: [], total: 0, page, limit, totalPages: 0 };
    }
  }

  if (filters?.tema && filters.tema !== 'todos') {
    queryRef = queryRef.where('tema', '==', filters.tema);
  }

  // Fetch directly from Firestore without orderBy to avoid composite index requirements, then sort in-memory
  const snap = await queryRef.get();
  const docs = snap.docs;

  let items = docs.map((doc) => doc.data() as Ejercicio);

  if (filters?.currentUserId) {
    const uid = filters.currentUserId;
    items = items.filter((e) => {
      const isMine = e.usuario_id_subio === uid;
      const isShared = e.visibilidad === 'compartido' || !e.visibilidad;
      return isMine || isShared;
    });
  }

  if (filters?.query) {
    const q = filters.query.toLowerCase();
    items = items.filter(
      (e) =>
        (e.titulo && e.titulo.toLowerCase().includes(q)) ||
        (e.texto_ocr && e.texto_ocr.toLowerCase().includes(q)) ||
        (e.tema && e.tema.toLowerCase().includes(q))
    );
  }

  // Sort by fecha_subida descending (guarantees stable, correct order)
  items.sort((a, b) => new Date(b.fecha_subida || 0).getTime() - new Date(a.fecha_subida || 0).getTime());

  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const paginatedItems = items.slice(startIndex, startIndex + limit);

  return {
    ejercicios: paginatedItems,
    total,
    page,
    limit,
    totalPages,
  };
}

export async function getEjerciciosByUsuario(usuarioId: string): Promise<Ejercicio[]> {
  if (!usuarioId) return [];
  const snapshot = await db.collection(COLLECTION).where('usuario_id_subio', '==', usuarioId).get();
  const items = snapshot.docs.map((doc) => doc.data() as Ejercicio);
  items.sort((a, b) => new Date(b.fecha_subida).getTime() - new Date(a.fecha_subida).getTime());
  return items;
}

export async function getEjercicioById(id: string): Promise<Ejercicio | null> {
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return doc.data() as Ejercicio;
}

export async function getEjercicioByHash(hash: string): Promise<Ejercicio | null> {
  if (!hash) return null;
  const snapshot = await db.collection(COLLECTION).where('hash_enunciado', '==', hash).limit(1).get();
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as Ejercicio;
}

export async function createEjercicio(ejercicio: Ejercicio): Promise<Ejercicio> {
  await db.collection(COLLECTION).doc(ejercicio.id).set(ejercicio);
  return ejercicio;
}

export async function deleteEjercicio(id: string): Promise<void> {
  await db.collection(COLLECTION).doc(id).delete();
  // Also clean up resolutions for this exercise
  const resSnaps = await db.collection('resoluciones').where('ejercicio_id', '==', id).get();
  const batch = db.batch();
  for (const doc of resSnaps.docs) {
    batch.delete(doc.ref);
  }
  await batch.commit();
}

