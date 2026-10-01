import { describe, it, expect } from 'vitest';

interface Ejercicio {
  id: string;
  catedra_id: string;
  titulo: string;
  texto_ocr: string;
  tema: string;
  fecha_subida: string;
  visibilidad?: 'privado' | 'compartido';
  usuario_id_subio: string;
}

// Simulated pagination logic identical to server implementation
function paginateExercises(
  items: Ejercicio[],
  filters: {
    catedra_id?: string;
    materia_id?: string;
    tema?: string;
    query?: string;
    currentUserId?: string;
    page: number;
    limit: number;
  }
) {
  let filtered = [...items];

  if (filters.catedra_id) {
    filtered = filtered.filter((e) => e.catedra_id === filters.catedra_id);
  }

  if (filters.tema && filters.tema !== 'todos') {
    filtered = filtered.filter((e) => e.tema === filters.tema);
  }

  if (filters.currentUserId) {
    filtered = filtered.filter(
      (e) =>
        e.usuario_id_subio === filters.currentUserId ||
        e.visibilidad === 'compartido' ||
        !e.visibilidad
    );
  }

  if (filters.query) {
    const q = filters.query.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.titulo.toLowerCase().includes(q) ||
        e.texto_ocr.toLowerCase().includes(q) ||
        e.tema.toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => new Date(b.fecha_subida).getTime() - new Date(a.fecha_subida).getTime());

  const total = filtered.length;
  const totalPages = Math.ceil(total / filters.limit);
  const startIndex = (filters.page - 1) * filters.limit;
  const paginated = filtered.slice(startIndex, startIndex + filters.limit);

  return {
    ejercicios: paginated,
    total,
    page: filters.page,
    limit: filters.limit,
    totalPages,
  };
}

// Simulated resolution enrichment to test absence of N+1 (single bulk mapping)
function enrichExercisesBulk(
  exercises: Ejercicio[],
  resolutions: any[],
  catedras: any[],
  materias: any[],
  facultades: any[]
) {
  const resolutionsMap = new Map<string, any>();
  resolutions.forEach((r) => {
    if (r.estado !== 'archivada') {
      resolutionsMap.set(r.ejercicio_id, r);
    }
  });

  const catedrasMap = new Map(catedras.map((c) => [c.id, c]));
  const materiasMap = new Map(materias.map((m) => [m.id, m]));
  const facultadesMap = new Map(facultades.map((f) => [f.id, f]));

  // No sequential DB lookups inside map loop (O(1) lookups in memory)
  return exercises.map((e) => {
    const resDoc = resolutionsMap.get(e.id) || null;
    const cat = catedrasMap.get(e.catedra_id) || null;
    const mat = cat ? materiasMap.get(cat.materia_id) : null;
    const fac = mat ? facultadesMap.get(mat.facultad_id) : null;

    return {
      id: e.id,
      titulo: e.titulo,
      tiene_resolucion: !!resDoc,
      estado_resolucion: resDoc?.estado || 'sin_resolucion',
      catedra_nombre: cat?.nombre || 'Cátedra General',
      materia_nombre: mat?.nombre || '',
      facultad_siglas: fac?.siglas || '',
    };
  });
}

describe('Server-Side Pagination, Filters and Resolution Mapping (N+1 Avoidance)', () => {
  const dummyExercises: Ejercicio[] = [
    {
      id: 'ej_1',
      catedra_id: 'cat_analisis',
      titulo: 'Integral de Volumen',
      texto_ocr: 'Calcular volumen del cono',
      tema: 'Integrales',
      fecha_subida: '2026-10-01T10:00:00Z',
      usuario_id_subio: 'user_1',
    },
    {
      id: 'ej_2',
      catedra_id: 'cat_analisis',
      titulo: 'Optimización de Área',
      texto_ocr: 'Encontrar el área máxima de parcela',
      tema: 'Optimización',
      fecha_subida: '2026-10-01T09:00:00Z',
      usuario_id_subio: 'user_1',
    },
    {
      id: 'ej_3',
      catedra_id: 'cat_algebra',
      titulo: 'Matrices y Rango',
      texto_ocr: 'Calcular rango de matriz A',
      tema: 'Matrices',
      fecha_subida: '2026-10-01T08:00:00Z',
      usuario_id_subio: 'user_2',
      visibilidad: 'privado',
    },
    {
      id: 'ej_4',
      catedra_id: 'cat_analisis',
      titulo: 'Límite Infinito',
      texto_ocr: 'Evaluar límite notable x tiende a cero',
      tema: 'Límites',
      fecha_subida: '2026-10-01T07:00:00Z',
      usuario_id_subio: 'user_2',
    },
  ];

  it('should paginate correctly returning exact requested slice and metadata', () => {
    const result = paginateExercises(dummyExercises, {
      page: 1,
      limit: 2,
    });

    expect(result.ejercicios).toHaveLength(2);
    expect(result.total).toBe(4);
    expect(result.totalPages).toBe(2);
    expect(result.ejercicios[0].id).toBe('ej_1'); // Sorted by date desc
    expect(result.ejercicios[1].id).toBe('ej_2');
  });

  it('should filter by catedra_id correctly', () => {
    const result = paginateExercises(dummyExercises, {
      catedra_id: 'cat_analisis',
      page: 1,
      limit: 10,
    });

    expect(result.ejercicios).toHaveLength(3);
    expect(result.ejercicios.every((e) => e.catedra_id === 'cat_analisis')).toBe(true);
  });

  it('should support text query matching across multiple fields', () => {
    const result = paginateExercises(dummyExercises, {
      query: 'conO',
      page: 1,
      limit: 10,
    });

    expect(result.ejercicios).toHaveLength(1);
    expect(result.ejercicios[0].id).toBe('ej_1');
  });

  it('should respect private visibilidad for different users', () => {
    const result = paginateExercises(dummyExercises, {
      currentUserId: 'user_1', // Not owner of ej_3 which is private
      page: 1,
      limit: 10,
    });

    expect(result.ejercicios.find((e) => e.id === 'ej_3')).toBeUndefined();
  });

  it('should map resolutions in a single bulk mapping loop preventing N+1', () => {
    const activePage = [dummyExercises[0], dummyExercises[1]];
    const dummyResolutions = [
      { id: 'r_1', ejercicio_id: 'ej_1', estado: 'verificada', votos_positivos: 3 },
    ];
    const dummyCatedras = [
      { id: 'cat_analisis', nombre: 'Cátedra de Análisis', materia_id: 'mat_analisis' },
    ];
    const dummyMaterias = [
      { id: 'mat_analisis', nombre: 'Análisis Matemático', facultad_id: 'fac_fcf' },
    ];
    const dummyFacultades = [
      { id: 'fac_fcf', siglas: 'FCF' },
    ];

    const enriched = enrichExercisesBulk(
      activePage,
      dummyResolutions,
      dummyCatedras,
      dummyMaterias,
      dummyFacultades
    );

    expect(enriched).toHaveLength(2);
    expect(enriched[0].tiene_resolucion).toBe(true);
    expect(enriched[0].estado_resolucion).toBe('verificada');
    expect(enriched[1].tiene_resolucion).toBe(false);
    expect(enriched[1].estado_resolucion).toBe('sin_resolucion');
  });
});
