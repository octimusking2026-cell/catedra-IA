import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Facultad, Carrera, Materia, Catedra, EjercicioConDetalle } from '../types';
import { api } from '../services/api';
import { useSession } from './SessionContext';

interface CatalogContextType {
  carreras: Carrera[];
  selectedCarrera: Carrera | null;
  setSelectedCarrera: (carrera: Carrera | null) => void;
  selectedAnio: number | null;
  setSelectedAnio: React.Dispatch<React.SetStateAction<number | null>>;
  facultades: Facultad[];
  materias: Materia[];
  catedras: Catedra[];
  selectedFacultad: Facultad | null;
  setSelectedFacultad: React.Dispatch<React.SetStateAction<Facultad | null>>;
  selectedMateria: Materia | null;
  setSelectedMateria: React.Dispatch<React.SetStateAction<Materia | null>>;
  selectedCatedra: Catedra | null;
  setSelectedCatedra: React.Dispatch<React.SetStateAction<Catedra | null>>;
  ejercicios: EjercicioConDetalle[];
  refreshEjercicios: (filters?: { catedra_id?: string; materia_id?: string; tema?: string; query?: string; orden?: 'antiguos' | 'recientes' }) => Promise<void>;
  refreshCatalog: () => Promise<void>;
  loadingCatalog: boolean;
  setEjercicios: React.Dispatch<React.SetStateAction<EjercicioConDetalle[]>>;
}

const CatalogContext = createContext<CatalogContextType | null>(null);

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authUser } = useSession();
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [selectedCarrera, setSelectedCarreraState] = useState<Carrera | null>(null);
  const [selectedAnio, setSelectedAnio] = useState<number | null>(null);
  const [facultades, setFacultades] = useState<Facultad[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [catedras, setCatedras] = useState<Catedra[]>([]);
  const [selectedFacultad, setSelectedFacultad] = useState<Facultad | null>(null);
  const [selectedMateria, setSelectedMateria] = useState<Materia | null>(null);
  const [selectedCatedra, setSelectedCatedra] = useState<Catedra | null>(null);
  const [ejercicios, setEjercicios] = useState<EjercicioConDetalle[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  const setSelectedCarrera = useCallback((carrera: Carrera | null) => {
    setSelectedCarreraState(carrera);
    if (carrera) {
      try {
        localStorage.setItem('catedraia_selected_carrera_id', carrera.id);
      } catch (err) {
        console.warn('Could not save carrera to localStorage:', err);
      }
    }
  }, []);

  const refreshEjercicios = useCallback(async (filters?: { catedra_id?: string; materia_id?: string; tema?: string; query?: string; orden?: 'antiguos' | 'recientes' }) => {
    if (!authUser) return;
    try {
      const ejs = await api.getEjercicios(filters);
      setEjercicios(ejs);
    } catch (err) {
      console.error('Error refrescando ejercicios:', err);
    }
  }, [authUser]);

  const loadInitialCatalog = useCallback(async () => {
    if (!authUser) return;
    setLoadingCatalog(true);
    try {
      const [cars, facs, mats, cats, ejs] = await Promise.all([
        api.getCarreras(),
        api.getFacultades(),
        api.getMaterias(),
        api.getCatedras(),
        api.getEjercicios(),
      ]);

      setCarreras(cars);
      setFacultades(facs);
      setMaterias(mats);
      setCatedras(cats);
      setEjercicios(ejs);

      let initialCarrera: Carrera | null = null;
      try {
        const savedId = localStorage.getItem('catedraia_selected_carrera_id');
        if (savedId) {
          initialCarrera = cars.find((c) => c.id === savedId) || null;
        }
      } catch (_err) {
        // ignore storage error
      }

      if (!initialCarrera && cars.length > 0) {
        initialCarrera = cars[0];
      }

      setSelectedCarreraState(initialCarrera);

      if (facs.length > 0) {
        setSelectedFacultad(facs[0]);
      }

      // Initial materia and catedra selection
      if (initialCarrera) {
        const validMats = mats.filter(
          (m) => !m.carreras_ids || m.carreras_ids.length === 0 || m.carreras_ids.includes(initialCarrera.id)
        );
        const firstMat = validMats[0] || mats[0];
        if (firstMat) {
          setSelectedMateria(firstMat);
          const matCats = cats.filter((c) => c.materia_id === firstMat.id);
          const firstCat = matCats[0] || cats[0];
          if (firstCat) setSelectedCatedra(firstCat);
        }
      }
    } catch (err) {
      console.error('Error cargando catálogo académico:', err);
    } finally {
      setLoadingCatalog(false);
    }
  }, [authUser]);

  useEffect(() => {
    if (authUser) {
      loadInitialCatalog();
    } else {
      setCarreras([]);
      setFacultades([]);
      setMaterias([]);
      setCatedras([]);
      setEjercicios([]);
      setSelectedCarreraState(null);
      setSelectedAnio(null);
      setSelectedFacultad(null);
      setSelectedMateria(null);
      setSelectedCatedra(null);
    }
  }, [authUser, loadInitialCatalog]);

  return (
    <CatalogContext.Provider
      value={{
        carreras,
        selectedCarrera,
        setSelectedCarrera,
        selectedAnio,
        setSelectedAnio,
        facultades,
        materias,
        catedras,
        selectedFacultad,
        setSelectedFacultad,
        selectedMateria,
        setSelectedMateria,
        selectedCatedra,
        setSelectedCatedra,
        ejercicios,
        refreshEjercicios,
        refreshCatalog: loadInitialCatalog,
        loadingCatalog,
        setEjercicios,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
};

export const useCatalog = () => {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error('useCatalog must be used within a CatalogProvider');
  }
  return context;
};
