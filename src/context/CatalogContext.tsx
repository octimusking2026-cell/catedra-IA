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
  refreshEjercicios: (filters?: {
    catedra_id?: string;
    materia_id?: string;
    tema?: string;
    query?: string;
    orden?: 'antiguos' | 'recientes';
    page?: number;
    limit?: number;
  }) => Promise<void>;
  refreshCatalog: () => Promise<void>;
  loadingCatalog: boolean;
  setEjercicios: React.Dispatch<React.SetStateAction<EjercicioConDetalle[]>>;
  totalEjercicios: number;
  totalPages: number;
  currentPage: number;
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

  // Pagination states
  const [totalEjercicios, setTotalEjercicios] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

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

  const refreshEjercicios = useCallback(async (filters?: {
    catedra_id?: string;
    materia_id?: string;
    tema?: string;
    query?: string;
    orden?: 'antiguos' | 'recientes';
    page?: number;
    limit?: number;
  }) => {
    if (!authUser) return;
    try {
      const res = await api.getEjercicios(filters);
      setEjercicios(res.ejercicios);
      setTotalEjercicios(res.total);
      setCurrentPage(res.page);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Error refrescando ejercicios:', err);
    }
  }, [authUser]);

  // Load only core metadata initially (carreras, facultades)
  const loadInitialCatalog = useCallback(async () => {
    if (!authUser) return;
    setLoadingCatalog(true);
    try {
      const [cars, facs] = await Promise.all([
        api.getCarreras().catch((err) => {
          console.warn('[CatalogContext] Error al cargar carreras:', err);
          return [];
        }),
        api.getFacultades().catch((err) => {
          console.warn('[CatalogContext] Error al cargar facultades:', err);
          return [];
        }),
      ]);

      setCarreras(cars);
      setFacultades(facs);

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
    } catch (err) {
      console.error('Error cargando catálogo académico inicial:', err);
    } finally {
      setLoadingCatalog(false);
    }
  }, [authUser]);

  // Load materias ON-DEMAND whenever selectedCarrera changes
  useEffect(() => {
    if (!authUser || !selectedCarrera) return;

    let isMounted = true;
    const loadMaterias = async () => {
      setLoadingCatalog(true);
      try {
        const mats = await api.getMaterias({ carrera_id: selectedCarrera.id }).catch(() => []);
        if (!isMounted) return;
        setMaterias(mats);

        const validMats = mats.filter(
          (m) => m.carreras_ids && m.carreras_ids.includes(selectedCarrera.id)
        );
        const firstMat = validMats[0] || mats[0] || null;
        setSelectedMateria(firstMat);
      } catch (err) {
        console.error('[CatalogContext] Error loading on-demand materias:', err);
      } finally {
        if (isMounted) setLoadingCatalog(false);
      }
    };

    loadMaterias();
    return () => {
      isMounted = false;
    };
  }, [authUser, selectedCarrera]);

  // Load catedras ON-DEMAND whenever selectedMateria changes (never load all of them)
  useEffect(() => {
    if (!authUser) return;
    if (!selectedMateria) {
      setCatedras([]);
      setSelectedCatedra(null);
      return;
    }

    let isMounted = true;
    const loadCatedras = async () => {
      setLoadingCatalog(true);
      try {
        const cats = await api.getCatedras(selectedMateria.id).catch(() => []);
        if (!isMounted) return;
        setCatedras(cats);

        const firstCat = cats[0] || null;
        setSelectedCatedra(firstCat);
      } catch (err) {
        console.error('[CatalogContext] Error loading on-demand catedras:', err);
      } finally {
        if (isMounted) setLoadingCatalog(false);
      }
    };

    loadCatedras();
    return () => {
      isMounted = false;
    };
  }, [authUser, selectedMateria]);

  // Setup/Tear-down on login status
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
      setTotalEjercicios(0);
      setTotalPages(0);
      setCurrentPage(1);
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
        totalEjercicios,
        totalPages,
        currentPage,
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
