import { IAcademicRepository } from './interfaces';
import { Facultad, Carrera, Materia, Catedra } from '../../src/types';
import {
  SEED_FACULTADES,
  SEED_CARRERAS,
  SEED_MATERIAS,
  SEED_CATEDRAS,
} from '../../src/data/seed';
import { db } from '../db/client';

export class FirestoreAcademicRepository implements IAcademicRepository {
  private seeded = false;

  async seedInitialIfEmpty(): Promise<void> {
    if (this.seeded) return;

    try {
      const facSnapshot = await db.collection('facultades').limit(1).get();
      if (!facSnapshot.empty) {
        this.seeded = true;
        return;
      }

      console.log('[AcademicRepo] Initializing Firestore with UNaM academic catalog...');

      // Seed Facultades
      const batch1 = db.batch();
      for (const fac of SEED_FACULTADES) {
        batch1.set(db.collection('facultades').doc(fac.id), fac);
      }
      await batch1.commit();

      // Seed Carreras
      const batch2 = db.batch();
      for (const car of SEED_CARRERAS) {
        batch2.set(db.collection('carreras').doc(car.id), car);
      }
      await batch2.commit();

      // Seed Materias in chunks of 400
      for (let i = 0; i < SEED_MATERIAS.length; i += 400) {
        const batch = db.batch();
        const slice = SEED_MATERIAS.slice(i, i + 400);
        for (const mat of slice) {
          batch.set(db.collection('materias').doc(mat.id), mat);
        }
        await batch.commit();
      }

      // Seed Catedras in chunks of 400
      for (let i = 0; i < SEED_CATEDRAS.length; i += 400) {
        const batch = db.batch();
        const slice = SEED_CATEDRAS.slice(i, i + 400);
        for (const cat of slice) {
          batch.set(db.collection('catedras').doc(cat.id), cat);
        }
        await batch.commit();
      }

      this.seeded = true;
      console.log('[AcademicRepo] Successfully seeded UNaM academic catalog into Firestore.');
    } catch (err) {
      console.error('[AcademicRepo] Error seeding academic catalog to Firestore:', err);
    }
  }

  async getFacultades(): Promise<Facultad[]> {
    await this.seedInitialIfEmpty();
    const snapshot = await db.collection('facultades').get();
    if (snapshot.empty) return SEED_FACULTADES;
    return snapshot.docs.map((d) => d.data() as Facultad);
  }

  async getFacultadById(id: string): Promise<Facultad | null> {
    await this.seedInitialIfEmpty();
    const doc = await db.collection('facultades').doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as Facultad;
  }

  async getCarreras(facultadId?: string): Promise<Carrera[]> {
    await this.seedInitialIfEmpty();
    let query: FirebaseFirestore.Query = db.collection('carreras');
    if (facultadId) {
      query = query.where('facultad_id', '==', String(facultadId));
    }
    const snapshot = await query.get();
    if (snapshot.empty) {
      return facultadId ? SEED_CARRERAS.filter((c) => c.facultad_id === facultadId) : SEED_CARRERAS;
    }
    return snapshot.docs.map((d) => d.data() as Carrera);
  }

  async getCarreraById(id: string): Promise<Carrera | null> {
    await this.seedInitialIfEmpty();
    const doc = await db.collection('carreras').doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as Carrera;
  }

  async getMaterias(filters?: { facultadId?: string; carreraId?: string; anio?: number }): Promise<Materia[]> {
    await this.seedInitialIfEmpty();
    let query: FirebaseFirestore.Query = db.collection('materias');
    if (filters?.facultadId) {
      query = query.where('facultad_id', '==', String(filters.facultadId));
    }
    const snapshot = await query.get();
    let result = snapshot.docs.map((d) => d.data() as Materia);

    if (result.length === 0) {
      result = SEED_MATERIAS;
      if (filters?.facultadId) {
        result = result.filter((m) => m.facultad_id === String(filters.facultadId));
      }
    }

    if (filters?.carreraId) {
      result = result.filter((m) =>
        !m.carreras_ids || m.carreras_ids.length === 0 || m.carreras_ids.includes(String(filters.carreraId))
      );
    }

    if (filters?.anio) {
      result = result.filter((m) => {
        const effectiveYear =
          filters.carreraId && m.anio_por_carrera?.[filters.carreraId] !== undefined
            ? m.anio_por_carrera[filters.carreraId]
            : m.anio;
        return effectiveYear === Number(filters.anio);
      });
    }

    return result;
  }

  async getMateriaById(id: string): Promise<Materia | null> {
    await this.seedInitialIfEmpty();
    const doc = await db.collection('materias').doc(id).get();
    if (!doc.exists) {
      const fallback = SEED_MATERIAS.find((m) => m.id === id);
      return fallback || null;
    }
    return doc.data() as Materia;
  }

  async getCatedras(materiaId?: string): Promise<Catedra[]> {
    await this.seedInitialIfEmpty();
    let query: FirebaseFirestore.Query = db.collection('catedras');
    if (materiaId) {
      query = query.where('materia_id', '==', String(materiaId));
    }
    const snapshot = await query.get();
    if (snapshot.empty) {
      return materiaId ? SEED_CATEDRAS.filter((c) => c.materia_id === String(materiaId)) : SEED_CATEDRAS;
    }
    return snapshot.docs.map((d) => d.data() as Catedra);
  }

  async getCatedraById(id: string): Promise<Catedra | null> {
    await this.seedInitialIfEmpty();
    const doc = await db.collection('catedras').doc(id).get();
    if (!doc.exists) {
      const fallback = SEED_CATEDRAS.find((c) => c.id === id);
      return fallback || null;
    }
    return doc.data() as Catedra;
  }

  async getCatedrasByMateriaId(materiaId: string): Promise<Catedra[]> {
    return this.getCatedras(materiaId);
  }

  // --- Admin CRUD Operations ---

  async createFacultad(facultad: Facultad): Promise<Facultad> {
    const docRef = db.collection('facultades').doc(facultad.id);
    await docRef.set(facultad);
    return facultad;
  }

  async updateFacultad(id: string, facultad: Partial<Facultad>): Promise<Facultad> {
    const docRef = db.collection('facultades').doc(id);
    await docRef.set(facultad, { merge: true });
    const updated = await docRef.get();
    return updated.data() as Facultad;
  }

  async deleteFacultad(id: string): Promise<void> {
    await db.collection('facultades').doc(id).delete();
  }

  async createCarrera(carrera: Carrera): Promise<Carrera> {
    const docRef = db.collection('carreras').doc(carrera.id);
    await docRef.set(carrera);
    return carrera;
  }

  async updateCarrera(id: string, carrera: Partial<Carrera>): Promise<Carrera> {
    const docRef = db.collection('carreras').doc(id);
    await docRef.set(carrera, { merge: true });
    const updated = await docRef.get();
    return updated.data() as Carrera;
  }

  async deleteCarrera(id: string): Promise<void> {
    await db.collection('carreras').doc(id).delete();
  }

  async createMateria(materia: Materia): Promise<Materia> {
    const docRef = db.collection('materias').doc(materia.id);
    await docRef.set(materia);
    return materia;
  }

  async updateMateria(id: string, materia: Partial<Materia>): Promise<Materia> {
    const docRef = db.collection('materias').doc(id);
    await docRef.set(materia, { merge: true });
    const updated = await docRef.get();
    return updated.data() as Materia;
  }

  async deleteMateria(id: string): Promise<void> {
    await db.collection('materias').doc(id).delete();
  }

  async createCatedra(catedra: Catedra): Promise<Catedra> {
    const docRef = db.collection('catedras').doc(catedra.id);
    await docRef.set(catedra);
    return catedra;
  }

  async updateCatedra(id: string, catedra: Partial<Catedra>): Promise<Catedra> {
    const docRef = db.collection('catedras').doc(id);
    await docRef.set(catedra, { merge: true });
    const updated = await docRef.get();
    return updated.data() as Catedra;
  }

  async deleteCatedra(id: string): Promise<void> {
    await db.collection('catedras').doc(id).delete();
  }
}
