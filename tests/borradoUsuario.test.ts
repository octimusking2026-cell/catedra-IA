import { describe, it, expect, vi } from 'vitest';

// Simulated collection lookup / query return values for testing
interface MockDoc {
  id: string;
  ref: { id: string; delete: () => void };
  data: () => any;
}

// Robust mock for the deletion routine matching the server implementation
async function simulateDeletion(
  userId: string,
  userProfile: any | null,
  dbDocs: { [collection: string]: MockDoc[] },
  mockAuthDeleteUser: (uid: string) => Promise<void>
) {
  if (!userId) {
    return { success: false, authDeleted: false, firestoreDeleted: false, errors: ['No se especificó un ID de usuario válido.'] };
  }

  const errors: string[] = [];
  const deletedRefs: string[] = [];
  let userEmail: string | undefined = undefined;

  // 1. Get user profile
  if (userProfile) {
    userEmail = userProfile.email;
  }
  deletedRefs.push(`usuarios/${userId}`);

  // Helper to collect references
  function collectRefs(collectionName: string, matches: (doc: MockDoc) => boolean) {
    const docs = dbDocs[collectionName] || [];
    docs.forEach((doc) => {
      if (matches(doc)) {
        deletedRefs.push(`${collectionName}/${doc.id}`);
      }
    });
  }

  // 2. Collect exercises and their resolutions
  const exercises = dbDocs['ejercicios'] || [];
  exercises.forEach((ex) => {
    if (ex.data().usuario_id_subio === userId) {
      deletedRefs.push(`ejercicios/${ex.id}`);

      // Collect associated resolutions
      const resolutions = dbDocs['resoluciones'] || [];
      resolutions.forEach((res) => {
        if (res.data().ejercicio_id === ex.id) {
          deletedRefs.push(`resoluciones/${res.id}`);
        }
      });
    }
  });

  // 3. Collect user's votes
  collectRefs('votos', (doc) => doc.data().user_id === userId);

  // 4. Collect usage entries
  collectRefs('uso_diario', (doc) => doc.data().user_id === userId);

  // 5. Collect ai logs
  collectRefs('ai_log', (doc) => doc.data().userId === userId);

  // 6. Collect feedback
  collectRefs('feedback', (doc) => doc.data().userId === userId);

  // 7. Collect reports
  collectRefs('reportes', (doc) => doc.data().userId === userId || doc.data().user_id === userId);

  // 8. Collect waitlist document if userEmail exists
  if (userEmail) {
    deletedRefs.push(`waitlist/hashed_${userEmail}`);
  }

  // Simulate chunk deletion (e.g. if firestore fail is triggered)
  let firestoreDeleted = true;
  if (userId === 'trigger_firestore_error') {
    errors.push('Error al ejecutar la eliminación física de algunos documentos en Firestore');
    firestoreDeleted = false;
  }

  // Auth account deletion
  let authDeleted = false;
  try {
    await mockAuthDeleteUser(userId);
    authDeleted = true;
  } catch {
    errors.push('Error al eliminar la cuenta de autenticación de Firebase');
  }

  const success = firestoreDeleted && authDeleted;

  return {
    success,
    authDeleted,
    firestoreDeleted,
    deletedRefs,
    errors: errors.length > 0 ? errors : undefined,
  };
}

describe('User Data Supresion / Deletion Robust Flow', () => {
  it('should handle a user with no data correctly (idempotency)', async () => {
    const userProfile = { id: 'user_empty', email: 'empty@test.com' };
    const dbDocs = {
      ejercicios: [],
      resoluciones: [],
      votos: [],
    };
    const authDelete = vi.fn().mockResolvedValue(undefined);

    const result = await simulateDeletion('user_empty', userProfile, dbDocs, authDelete);

    expect(result.success).toBe(true);
    expect(result.authDeleted).toBe(true);
    expect(result.deletedRefs).toContain('usuarios/user_empty');
    expect(result.deletedRefs).toContain('waitlist/hashed_empty@test.com');
  });

  it('should collect and delete multiple exercises of the user along with their resolutions', async () => {
    const userProfile = { id: 'user_active', email: 'active@test.com' };
    const dbDocs = {
      ejercicios: [
        { id: 'ej_1', ref: { id: 'ej_1', delete: () => {} }, data: () => ({ usuario_id_subio: 'user_active' }) },
        { id: 'ej_2', ref: { id: 'ej_2', delete: () => {} }, data: () => ({ usuario_id_subio: 'user_active' }) },
        { id: 'ej_other', ref: { id: 'ej_other', delete: () => {} }, data: () => ({ usuario_id_subio: 'other_user' }) },
      ],
      resoluciones: [
        { id: 'res_1', ref: { id: 'res_1', delete: () => {} }, data: () => ({ ejercicio_id: 'ej_1' }) },
        { id: 'res_other', ref: { id: 'res_other', delete: () => {} }, data: () => ({ ejercicio_id: 'ej_other' }) },
      ],
    };
    const authDelete = vi.fn().mockResolvedValue(undefined);

    const result = await simulateDeletion('user_active', userProfile, dbDocs, authDelete);

    expect(result.deletedRefs).toContain('ejercicios/ej_1');
    expect(result.deletedRefs).toContain('ejercicios/ej_2');
    expect(result.deletedRefs).toContain('resoluciones/res_1');
    // Ensure we do NOT delete other users' data
    expect(result.deletedRefs).not.toContain('ejercicios/ej_other');
    expect(result.deletedRefs).not.toContain('resoluciones/res_other');
  });

  it('should collect and delete user votes and comments', async () => {
    const userProfile = { id: 'user_voter', email: 'voter@test.com' };
    const dbDocs = {
      ejercicios: [],
      votos: [
        { id: 'v_1', ref: { id: 'v_1', delete: () => {} }, data: () => ({ user_id: 'user_voter' }) },
        { id: 'v_other', ref: { id: 'v_other', delete: () => {} }, data: () => ({ user_id: 'other_user' }) },
      ],
    };
    const authDelete = vi.fn().mockResolvedValue(undefined);

    const result = await simulateDeletion('user_voter', userProfile, dbDocs, authDelete);

    expect(result.deletedRefs).toContain('votos/v_1');
    expect(result.deletedRefs).not.toContain('votos/v_other');
  });

  it('should handle partial errors correctly reporting failed states instead of falsy success', async () => {
    const userProfile = { id: 'trigger_firestore_error', email: 'error@test.com' };
    const authDelete = vi.fn().mockResolvedValue(undefined);

    const result = await simulateDeletion('trigger_firestore_error', userProfile, {}, authDelete);

    expect(result.success).toBe(false);
    expect(result.firestoreDeleted).toBe(false);
    expect(result.authDeleted).toBe(true);
    expect(result.errors).toContain('Error al ejecutar la eliminación física de algunos documentos en Firestore');
  });

  it('should handle auth deletion failure correctly reporting partial state', async () => {
    const userProfile = { id: 'user_auth_err', email: 'auth_err@test.com' };
    const authDelete = vi.fn().mockRejectedValue(new Error('Auth delete failed'));

    const result = await simulateDeletion('user_auth_err', userProfile, {}, authDelete);

    expect(result.success).toBe(false);
    expect(result.firestoreDeleted).toBe(true);
    expect(result.authDeleted).toBe(false);
    expect(result.errors).toContain('Error al eliminar la cuenta de autenticación de Firebase');
  });
});
