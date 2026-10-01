import { db, adminAuth } from './client';
import { Usuario } from '../../src/types';
import crypto from 'crypto';

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
    if ((picture && picture !== data.foto_url) || (name && name !== data.nombre)) {
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

export async function deleteUserDataFromFirestore(userId: string): Promise<{
  success: boolean;
  authDeleted: boolean;
  firestoreDeleted: boolean;
  errors?: string[];
}> {
  if (!userId) {
    return {
      success: false,
      authDeleted: false,
      firestoreDeleted: false,
      errors: ['No se especificó un ID de usuario válido.'],
    };
  }

  const errors: string[] = [];
  let userEmail: string | undefined = undefined;

  // 1. Recover user email first to perform waitlist deletion
  try {
    const userDoc = await db.collection(COLLECTION).doc(userId).get();
    if (userDoc.exists) {
      userEmail = userDoc.data()?.email;
    }
  } catch (err: any) {
    console.error(`[deleteUserData] Error getting profile for ${userId}:`, err);
    errors.push('Error al consultar el perfil de usuario para recabar el email');
  }

  const refsToDelete: FirebaseFirestore.DocumentReference[] = [];

  // Add the user doc itself
  refsToDelete.push(db.collection(COLLECTION).doc(userId));

  // Helper to collect references for a given query safely
  async function collectRefs(query: FirebaseFirestore.Query, description: string) {
    try {
      const snap = await query.get();
      snap.docs.forEach((doc) => {
        refsToDelete.push(doc.ref);
      });
    } catch (err: any) {
      console.error(`[deleteUserData] Error collecting references for ${description}:`, err);
      errors.push(`Error al recopilar datos de ${description}`);
    }
  }

  // 2. Collect exercises and their associated resolutions
  try {
    const ejerciciosSnap = await db.collection('ejercicios').where('usuario_id_subio', '==', userId).get();
    for (const doc of ejerciciosSnap.docs) {
      refsToDelete.push(doc.ref);
      // Collect resolutions of this exercise (avoids orphaned resolutions)
      await collectRefs(
        db.collection('resoluciones').where('ejercicio_id', '==', doc.id),
        `resoluciones de ejercicio ${doc.id}`
      );
    }
  } catch (err: any) {
    console.error(`[deleteUserData] Error collecting exercises:`, err);
    errors.push('Error al recopilar ejercicios creados');
  }

  // 3. Collect user's votes
  await collectRefs(db.collection('votos').where('user_id', '==', userId), 'votos');

  // 4. Collect user's daily usage entries
  await collectRefs(db.collection('uso_diario').where('user_id', '==', userId), 'uso diario');

  // 5. Collect user's ai_log entries
  await collectRefs(db.collection('ai_log').where('userId', '==', userId), 'logs de IA');

  // 6. Collect user's feedback entries
  await collectRefs(db.collection('feedback').where('userId', '==', userId), 'feedback');

  // 7. Collect user's reportes (reports)
  await collectRefs(db.collection('reportes').where('userId', '==', userId), 'reportes');

  // 8. Collect waitlist document if userEmail exists
  if (userEmail) {
    const normalizedEmail = userEmail.toLowerCase().trim();
    const waitlistDocId = crypto.createHash('sha256').update(normalizedEmail).digest('hex').slice(0, 32);
    refsToDelete.push(db.collection('waitlist').doc(waitlistDocId));
  }

  // Commit document deletions in safe chunks (max 100 per batch)
  const chunkSize = 100;
  let firestoreDeleted = true;

  for (let i = 0; i < refsToDelete.length; i += chunkSize) {
    const batch = db.batch();
    const chunk = refsToDelete.slice(i, i + chunkSize);
    chunk.forEach((ref) => {
      batch.delete(ref);
    });

    try {
      await batch.commit();
    } catch (err: any) {
      console.error(`[deleteUserData] Error committing deletion batch:`, err);
      errors.push('Error al ejecutar la eliminación física de algunos documentos en Firestore');
      firestoreDeleted = false;
    }
  }

  // 9. Delete Firebase Authentication account using adminAuth (SDK)
  let authDeleted = false;
  try {
    await adminAuth.deleteUser(userId);
    authDeleted = true;
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      // User doesn't exist in Auth anymore, which is fine (idempotent success)
      authDeleted = true;
    } else {
      console.error(`[deleteUserData] Error deleting Auth account for ${userId}:`, err);
      errors.push('Error al eliminar la cuenta de autenticación de Firebase');
    }
  }

  const success = firestoreDeleted && authDeleted;

  return {
    success,
    authDeleted,
    firestoreDeleted,
    errors: errors.length > 0 ? errors : undefined,
  };
}
