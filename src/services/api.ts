import {
  Usuario,
  Facultad,
  Carrera,
  Materia,
  Catedra,
  Resolucion,
  PasoResolucion,
  ConsultasStatus,
  EjercicioConDetalle,
  ClientConfig,
} from '../types';
import { getCurrentUserIdToken } from './firebase';

/**
 * Standard fetch wrapper that injects the Firebase Auth ID token as a Bearer header.
 * If a 401 Unauthorized is returned, it attempts to force refresh the token and retries once.
 */
async function fetchWithAuth(url: string, options: RequestInit = {}, isRetry = false): Promise<Response> {
  const token = await getCurrentUserIdToken(isRetry);
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 && !isRetry) {
    const refreshedToken = await getCurrentUserIdToken(true);
    if (refreshedToken) {
      return fetchWithAuth(url, options, true);
    }
  }

  if (response.status === 403) {
    const clone = response.clone();
    try {
      const data = await clone.json();
      if (data.error === 'terminos_pendientes') {
        window.dispatchEvent(new CustomEvent('terminos-pendientes-detected'));
      }
    } catch (_) {}
  }

  if (response.status === 429) {
    const clone = response.clone();
    try {
      const data = await clone.json();
      if (data.code === 'LIMIT_REACHED' || data.limite_alcanzado) {
        window.dispatchEvent(new CustomEvent('limite-alcanzado-detected', { detail: data }));
      }
    } catch (_) {}
  }

  return response;
}

export const api = {
  async getConfig(): Promise<ClientConfig> {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Error al cargar configuración del servidor');
    return res.json();
  },

  async getPerfil(): Promise<{ usuario: Usuario; consultas: ConsultasStatus; terminos_aceptados?: boolean }> {
    const res = await fetchWithAuth('/api/auth/perfil');
    if (!res.ok) {
      if (res.status === 401) throw new Error('NO_AUTH');
      throw new Error('Error al obtener perfil');
    }
    return res.json();
  },

  async getCarreras(facultad_id?: string): Promise<Carrera[]> {
    const url = facultad_id ? `/api/carreras?facultad_id=${encodeURIComponent(facultad_id)}` : '/api/carreras';
    const res = await fetchWithAuth(url);
    if (!res.ok) throw new Error('Error al cargar carreras');
    return res.json();
  },

  async getFacultades(): Promise<Facultad[]> {
    const res = await fetchWithAuth('/api/facultades');
    if (!res.ok) throw new Error('Error al cargar facultades');
    return res.json();
  },

  async getMaterias(filters?: { facultad_id?: string; carrera_id?: string; anio?: number }): Promise<Materia[]> {
    const params = new URLSearchParams();
    if (filters?.facultad_id) params.append('facultad_id', filters.facultad_id);
    if (filters?.carrera_id) params.append('carrera_id', filters.carrera_id);
    if (filters?.anio) params.append('anio', String(filters.anio));

    const url = params.toString() ? `/api/materias?${params.toString()}` : '/api/materias';
    const res = await fetchWithAuth(url);
    if (!res.ok) throw new Error('Error al cargar materias');
    return res.json();
  },

  async getCatedras(materia_id?: string): Promise<Catedra[]> {
    const url = materia_id ? `/api/catedras?materia_id=${encodeURIComponent(materia_id)}` : '/api/catedras';
    const res = await fetchWithAuth(url);
    if (!res.ok) throw new Error('Error al cargar cátedras');
    return res.json();
  },

  async getCatedraDetalle(id: string): Promise<Catedra & { materia?: Materia; facultad?: Facultad }> {
    const res = await fetchWithAuth(`/api/catedras/${id}`);
    if (!res.ok) throw new Error('Error al cargar detalle de la cátedra');
    return res.json();
  },

  async getEjercicios(filters?: {
    catedra_id?: string;
    materia_id?: string;
    tema?: string;
    query?: string;
    orden?: 'recientes' | 'antiguos';
    page?: number;
    limit?: number;
  }): Promise<{
    ejercicios: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams();
    if (filters?.catedra_id) params.set('catedra_id', filters.catedra_id);
    if (filters?.materia_id) params.set('materia_id', filters.materia_id);
    if (filters?.tema) params.set('tema', filters.tema);
    if (filters?.query) params.set('query', filters.query);
    if (filters?.orden) params.set('orden', filters.orden);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));

    const res = await fetchWithAuth(`/api/ejercicios?${params.toString()}`);
    if (!res.ok) throw new Error('Error al cargar ejercicios');
    return res.json();
  },

  async getHistorial(filters?: { materia_id?: string; page?: number }): Promise<{
    ejercicios: any[];
    total: number;
    pagina: number;
    total_paginas: number;
    materias_con_historial: { id: string; nombre: string; cantidad: number }[];
  }> {
    const params = new URLSearchParams();
    if (filters?.materia_id) params.set('materia_id', filters.materia_id);
    if (filters?.page) params.set('page', String(filters.page));

    const res = await fetchWithAuth(`/api/historial?${params.toString()}`);
    if (!res.ok) throw new Error('Error al cargar historial');
    return res.json();
  },

  async getEjercicioDetalle(id: string): Promise<EjercicioConDetalle> {
    const res = await fetchWithAuth(`/api/ejercicios/${id}`);
    if (!res.ok) throw new Error('Error al cargar ejercicio');
    return res.json();
  },

  async borrarEjercicio(id: string): Promise<{ ok: boolean; mensaje: string }> {
    const res = await fetchWithAuth(`/api/ejercicios/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al eliminar ejercicio');
    }
    return res.json();
  },

  async extraerTextoOCR(
    imagen_base64: string,
    mime_type?: string
  ): Promise<{ texto_ocr: string; advertencia?: string }> {
    const res = await fetchWithAuth('/api/ocr/extraer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imagen_base64, mime_type }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const errorObj = new Error(err.mensaje || err.error || 'Error al extraer texto con OCR') as any;
      errorObj.status = res.status;
      errorObj.limite_alcanzado = err.limite_alcanzado || res.status === 429;
      if (err?.code === 'LIMIT_REACHED' || errorObj.limite_alcanzado) {
        window.dispatchEvent(new CustomEvent('limite-alcanzado-detected', { detail: err }));
      }
      throw errorObj;
    }
    const ocrData = await res.json();
    window.dispatchEvent(new CustomEvent('quota-changed'));
    return ocrData;
  },

  async generarResolucionStream(
    data: {
      ejercicio_id?: string;
      catedra_id?: string;
      enunciado?: string;
      titulo?: string;
      tema?: string;
      imagen_base64?: string;
      mime_type?: string;
      incluir_imagen?: boolean;
      visibilidad?: 'privado' | 'compartido';
    },
    callbacks?: {
      onPaso?: (paso: PasoResolucion) => void;
      onStatus?: (status: { estado: string; posicion?: number; mensaje: string }) => void;
      onAviso?: (aviso: { tipo?: string; mensaje: string }) => void;
    }
  ): Promise<Resolucion> {
    const res = await fetchWithAuth('/api/resoluciones/generar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const errorObj = new Error(err.mensaje || err.error || 'No se pudo generar la resolución') as any;
      errorObj.status = res.status;
      errorObj.limite_alcanzado = err.limite_alcanzado || res.status === 429;
      if (err?.code === 'LIMIT_REACHED' || errorObj.limite_alcanzado) {
        window.dispatchEvent(new CustomEvent('limite-alcanzado-detected', { detail: err }));
      }
      throw errorObj;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      throw new Error('El navegador no soporta streaming de respuesta.');
    }

    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let finalResolucion: Resolucion | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() || '';

      for (const block of blocks) {
        if (!block.trim()) continue;
        const lines = block.split('\n');
        let eventName = 'message';
        let rawData = '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventName = line.replace('event:', '').trim();
          } else if (line.startsWith('data:')) {
            rawData = line.replace('data:', '').trim();
          }
        }

        if (!rawData) continue;

        try {
          const payload = JSON.parse(rawData);
          if (eventName === 'paso') {
            callbacks?.onPaso?.(payload);
          } else if (eventName === 'status') {
            callbacks?.onStatus?.(payload);
          } else if (eventName === 'aviso') {
            callbacks?.onAviso?.(payload);
            if (payload?.mensaje) {
              callbacks?.onStatus?.({ estado: 'aviso', mensaje: payload.mensaje });
            }
          } else if (eventName === 'final') {
            finalResolucion = payload;
          } else if (eventName === 'error') {
            if (payload?.code === 'LIMIT_REACHED' || payload?.limite_alcanzado) {
              window.dispatchEvent(new CustomEvent('limite-alcanzado-detected', { detail: payload }));
            }
            const errObj = new Error(payload.mensaje || payload.error || 'Error al generar resolución') as any;
            throw errObj;
          }
        } catch (parseErr: any) {
          if (eventName === 'error') throw parseErr;
          console.warn('[SSE Parse Error]', parseErr, rawData);
        }
      }
    }

    if (!finalResolucion) {
      throw new Error('La conexión se cortó antes de recibir la resolución completa. Podés reintentar.');
    }

    window.dispatchEvent(new CustomEvent('quota-changed'));
    return finalResolucion;
  },

  async votarResolucion(
    id: string,
    tipo: 'positivo' | 'negativo',
    comentario?: string
  ): Promise<{
    id: string;
    votos_positivos: number;
    votos_negativos: number;
    estado: 'sin_verificar' | 'verificada' | 'en_revision' | 'archivada';
    mensaje: string;
    mi_voto?: {
      tipo: 'positivo' | 'negativo';
      comentario?: string;
    };
  }> {
    const res = await fetchWithAuth(`/api/resoluciones/${id}/votar`, {
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
    const res = await fetchWithAuth('/api/consultas/restantes-hoy');
    if (!res.ok) throw new Error('Error al consultar límites diarios');
    return res.json();
  },

  async borrarMisDatos(): Promise<{ success: boolean; mensaje: string }> {
    const res = await fetchWithAuth('/api/usuario/mis-datos', {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al solicitar el borrado de datos');
    }
    return res.json();
  },

  async enviarFeedback(data: { mensaje: string; pantalla: string }): Promise<{ success: boolean; mensaje: string }> {
    const res = await fetchWithAuth('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al enviar el comentario');
    }
    return res.json();
  },

  async reportarEjercicio(ejercicioId: string, motivo: string, detalle?: string): Promise<{ ok: boolean; mensaje: string }> {
    const res = await fetchWithAuth(`/api/ejercicios/${ejercicioId}/reportar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo, detalle }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al enviar reporte');
    }
    return res.json();
  },

  async getAdminReportes(): Promise<{ reportes: any[]; votosNegativos: any[] }> {
    const res = await fetchWithAuth('/api/admin/reportes');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al cargar panel de administración');
    }
    return res.json();
  },

  async setEjercicioVisibilidad(ejercicioId: string, aprobado: boolean): Promise<{ ok: boolean; mensaje: string }> {
    const res = await fetchWithAuth(`/api/admin/ejercicios/${ejercicioId}/visibilidad`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aprobado }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al cambiar visibilidad');
    }
    return res.json();
  },

  async anotarseEnWaitlist(data: { email: string; materia_o_carrera?: string }): Promise<{ ok: boolean }> {
    const res = await fetchWithAuth('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.mensaje || err.error || 'Error al solicitar agregado de materia o carrera');
    }
    return res.json();
  },

  // --- Academic Admin APIs ---
  async createFacultad(data: any): Promise<{ ok: boolean; facultad: any }> {
    const res = await fetchWithAuth('/api/admin/facultades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al crear facultad');
    }
    return res.json();
  },

  async updateFacultad(id: string, data: any): Promise<{ ok: boolean; facultad: any }> {
    const res = await fetchWithAuth(`/api/admin/facultades/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al actualizar facultad');
    }
    return res.json();
  },

  async deleteFacultad(id: string): Promise<{ ok: boolean }> {
    const res = await fetchWithAuth(`/api/admin/facultades/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al eliminar facultad');
    }
    return res.json();
  },

  async createMateria(data: any): Promise<{ ok: boolean; materia: any }> {
    const res = await fetchWithAuth('/api/admin/materias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al crear materia');
    }
    return res.json();
  },

  async updateMateria(id: string, data: any): Promise<{ ok: boolean; materia: any }> {
    const res = await fetchWithAuth(`/api/admin/materias/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al actualizar materia');
    }
    return res.json();
  },

  async deleteMateria(id: string): Promise<{ ok: boolean }> {
    const res = await fetchWithAuth(`/api/admin/materias/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al eliminar materia');
    }
    return res.json();
  },

  async createCatedra(data: any): Promise<{ ok: boolean; catedra: any }> {
    const res = await fetchWithAuth('/api/admin/catedras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al crear cátedra');
    }
    return res.json();
  },

  async updateCatedra(id: string, data: any): Promise<{ ok: boolean; catedra: any }> {
    const res = await fetchWithAuth(`/api/admin/catedras/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al actualizar cátedra');
    }
    return res.json();
  },

  async deleteCatedra(id: string): Promise<{ ok: boolean }> {
    const res = await fetchWithAuth(`/api/admin/catedras/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al eliminar cátedra');
    }
    return res.json();
  },
};
