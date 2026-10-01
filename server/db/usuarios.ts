import { db } from './client';
import { Usuario } from '../../src/types';

const COLLECTION = 'usuarios';

export async function getOrCreateUserFromToken(userData: {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
}): Promise<Usuario> {
  const { uid, email, name, picture } = userData;
  const userRef = db.collection(COLLECTION).doc(uid);
  const doc = await userRef.get();

  if (doc.exists) {
    const data = doc.data() as Usuario;
    const updated: Usuario = {
      id: uid,
      email: email || data.email || `${uid}@estudiante.catedraia.local`,
      nombre: name || data.nombre || 'Estudiante',
      foto_url: picture || data.foto_url || undefined,
      fecha_registro: data.fecha_registro || new Date().toISOString(),
      terminos_version: data.terminos_version,
      terminos_aceptados_en: data.terminos_aceptados_en,
    };

    // Update if photo or name changed
    if (picture && picture !== data.foto_url || name && name !== data.nombre) {
      await userRef.update({
        nombre: updated.nombre,
        foto_url: updated.foto_url,
      }).catch(() => {});
    }

    return updated;
  }

  const newUser: Usuario = {
    id: uid,
    email: email || `${uid}@estudiante.catedraia.local`,
    nombre: name || 'Estudiante',
    foto_url: picture || undefined,
    fecha_registro: new Date().toISOString(),
  };

  await userRef.set(newUser);
  return newUser;
}

export async function getUser(id: string): Promise<Usuario | null> {
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return doc.data() as Usuario;
}

export async function deleteUserDataFromFirestore(userId: string): Promise<void> {
  if (!userId) return;

  const batch = db.batch();

  // 1. Delete user profile doc
  const userRef = db.collection(COLLECTION).doc(userId);
  batch.delete(userRef);

  // 2. Delete user's exercises in ejercicios
  const ejerciciosSnap = await db.collection('ejercicios').where('usuario_id_subio', '==', userId).get();
  ejerciciosSnap.docs.forEach((doc) => batch.delete(doc.ref));

  // 3. Delete user's votes in votos
  const votosSnap = await db.collection('votos').where('user_id', '==', userId).get();
  votosSnap.docs.forEach((doc) => batch.delete(doc.ref));

  // 4. Delete user's daily usage entries in uso_diario
  const usoSnap = await db.collection('uso_diario').where('user_id', '==', userId).get();
  usoSnap.docs.forEach((doc) => batch.delete(doc.ref));

  // 5. Delete user's ai_log entries
  const aiLogSnap = await db.collection('ai_log').where('userId', '==', userId).get();
  aiLogSnap.docs.forEach((doc) => batch.delete(doc.ref));

  // 6. Delete user's feedback entries
  const fbSnap = await db.collection('feedback').where('userId', '==', userId).get();
  fbSnap.docs.forEach((doc) => batch.delete(doc.ref));

  await batch.commit();
}
