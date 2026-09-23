import {
  Usuario,
  Facultad,
  Materia,
  Catedra,
  Ejercicio,
  Resolucion,
  ConsultasStatus,
  EjercicioConDetalle,
  Suscripcion,
  ListaEsperaEntry,
} from '../types';

/**
 * Retrieves or generates an isolated, persistent anonymous user ID per browser session.
 * This guarantees testers don't share quota, sessions, or votes.
 */
export function getAnonUserId(): string {
  if (typeof window === 'undefined') return 'anon_server';
  const STORAGE_KEY = 'catedraia_anon_id_v2';
  let anonId = localStorage.getItem(STORAGE_KEY);
  if (!anonId || !anonId.startsWith('anon_')) {
    const randomPart = Math.random().toString(36).substring(2, 10);
    const timePart = Date.now().toString(36);
    anonId = `anon_${randomPart}_${timePart}`;
    localStorage.setItem(STORAGE_KEY, anonId);
  }
  return anonId;
}

/**
 * Standard fetch wrapper that injects the anonymous identity header on every request.
 */
async function fetchWithAnon(url: string, options: RequestInit = {}): Promise<Response> {
  const anonId = getAnonUserId();
  const headers = new Headers(options.headers || {});
  headers.set('X-Anon-User-Id', anonId);

  return fetch(url, {
    ...options,
    headers,
  });
}

export const api = {
  getAnonUserId,

  async getPerfil(): Promise<{ usuario: Usuario; consultas: ConsultasStatus }> {
    const res = await fetchWithAnon('/api/auth/perfil');
    if (!res.ok) throw new Error('Error al obtener perfil');
    return res.json();
  },

  async login(email: string): Promise<{ usuario: Usuario; token: string }> {
    const res = await fetchWithAnon('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al iniciar sesión');
    }
    return res.json();
  },

  async registro(nombre: string, email: string): Promise<{ usuario: Usuario; token: string }> {
    const res = await fetchWithAnon('/api/auth/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al registrarse');
    }
    return res.json();
  },

  async switchUser(usuario_id: string): Promise<{ usuario: Usuario }> {
    const res = await fetchWithAnon('/api/auth/switch-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id }),
    });
    if (!res.ok) throw new Error('Error al cambiar usuario');
    return res.json();
  },

  async getFacultades(): Promise<Facultad[]> {
    const res = await fetchWithAnon('/api/facultades');
    if (!res.ok) throw new Error('Error al cargar facultades');
    return res.json();
  },

  async getMaterias(facultad_id?: string): Promise<Materia[]> {
    const url = facultad_id ? `/api/materias?facultad_id=${encodeURIComponent(facultad_id)}` : '/api/materias';
    const res = await fetchWithAnon(url);
    if (!res.ok) throw new Error('Error al cargar materias');
    return res.json();
  },

  async getCatedras(materia_id?: string): Promise<Catedra[]> {
    const url = materia_id ? `/api/catedras?materia_id=${encodeURIComponent(materia_id)}` : '/api/catedras';
    const res = await fetchWithAnon(url);
    if (!res.ok) throw new Error('Error al cargar cátedras');
    return res.json();
  },

  async getCatedraDetalle(id: string): Promise<Catedra & { materia?: Materia; facultad?: Facultad }> {
    const res = await fetchWithAnon(`/api/catedras/${id}`);
    if (!res.ok) throw new Error('Error al cargar detalle de la cátedra');
    return res.json();
  },

  async getEjercicios(filters?: { catedra_id?: string; tema?: string; query?: string }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.catedra_id) params.set('catedra_id', filters.catedra_id);
    if (filters?.tema) params.set('tema', filters.tema);
    if (filters?.query) params.set('query', filters.query);

    const res = await fetchWithAnon(`/api/ejercicios?${params.toString()}`);
    if (!res.ok) throw new Error('Error al cargar ejercicios');
    return res.json();
  },

  async getEjercicioDetalle(id: string): Promise<EjercicioConDetalle> {
    const res = await fetchWithAnon(`/api/ejercicios/${id}`);
    if (!res.ok) throw new Error('Error al cargar ejercicio');
    return res.json();
  },

  async subirEjercicio(data: {
    catedra_id: string;
    titulo: string;
    texto_ocr: string;
    tema?: string;
    imagen_url?: string;
  }): Promise<Ejercicio> {
    const res = await fetchWithAnon('/api/ejercicios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al guardar ejercicio');
    }
    return res.json();
  },

  async extraerTextoOCR(
    imagen_base64: string,
    mime_type?: string
  ): Promise<{ texto_ocr: string; advertencia?: string }> {
    const res = await fetchWithAnon('/api/ocr/extraer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imagen_base64, mime_type }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.mensaje || err.error || 'Error al extraer texto con OCR');
    }
    return res.json();
  },

  async generarResolucion(data: {
    ejercicio_id?: string;
    catedra_id?: string;
    enunciado?: string;
    titulo?: string;
    tema?: string;
    imagen_base64?: string;
    mime_type?: string;
  }): Promise<Resolucion> {
    const res = await fetchWithAnon('/api/resoluciones/generar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.mensaje || err.error || 'No se pudo generar la resolución');
    }
    return res.json();
  },

  async votarResolucion(
    id: string,
    tipo: 'positivo' | 'negativo',
    comentario?: string
  ): Promise<{
    id: string;
    votos_positivos: number;
    votos_negativos: number;
    estado: 'aprobada' | 'en_revision';
    mensaje: string;
    mi_voto?: {
      tipo: 'positivo' | 'negativo';
      comentario?: string;
    };
  }> {
    const res = await fetchWithAnon(`/api/resoluciones/${id}/votar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, comentario }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al registrar voto');
    }
    return res.json();
  },

  async getConsultasRestantes(): Promise<ConsultasStatus> {
    const res = await fetchWithAnon('/api/consultas/restantes-hoy');
    if (!res.ok) throw new Error('Error al consultar límites diarios');
    return res.json();
  },

  // Waitlist (honest willingness to pay / interest measuring)
  async unirseListaEspera(data: {
    email: string;
    plan_interes: 'mensual' | 'cuatrimestral' | 'anual';
    catedra_id?: string;
    catedra_nombre?: string;
  }): Promise<{ success: boolean; mensaje: string; registro: ListaEsperaEntry }> {
    const res = await fetchWithAnon('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al registrarte en la lista de espera');
    }
    return res.json();
  },

  async getEstadoSuscripcion(): Promise<{
    plan: string;
    es_premium: boolean;
    suscripcion: Suscripcion | null;
  }> {
    const res = await fetchWithAnon('/api/suscripciones/estado');
    if (!res.ok) throw new Error('Error al obtener estado de suscripción');
    return res.json();
  },

  async cancelarSuscripcion(): Promise<{ success: boolean; usuario: Usuario }> {
    const res = await fetchWithAnon('/api/suscripciones/cancelar', { method: 'POST' });
    if (!res.ok) throw new Error('Error al cancelar suscripción');
    return res.json();
  },
};
