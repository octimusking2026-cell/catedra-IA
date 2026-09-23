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
} from '../types';

export const api = {
  async getPerfil(): Promise<{ usuario: Usuario; consultas: ConsultasStatus }> {
    const res = await fetch('/api/auth/perfil');
    if (!res.ok) throw new Error('Error al obtener perfil');
    return res.json();
  },

  async login(email: string): Promise<{ usuario: Usuario; token: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al iniciar sesión');
    }
    return res.json();
  },

  async registro(nombre: string, email: string): Promise<{ usuario: Usuario; token: string }> {
    const res = await fetch('/api/auth/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al registrarse');
    }
    return res.json();
  },

  async switchUser(usuario_id: string): Promise<{ usuario: Usuario }> {
    const res = await fetch('/api/auth/switch-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id }),
    });
    if (!res.ok) throw new Error('Error al cambiar usuario');
    return res.json();
  },

  async getFacultades(): Promise<Facultad[]> {
    const res = await fetch('/api/facultades');
    if (!res.ok) throw new Error('Error al cargar facultades');
    return res.json();
  },

  async getMaterias(facultad_id?: string): Promise<Materia[]> {
    const url = facultad_id ? `/api/materias?facultad_id=${encodeURIComponent(facultad_id)}` : '/api/materias';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al cargar materias');
    return res.json();
  },

  async getCatedras(materia_id?: string): Promise<Catedra[]> {
    const url = materia_id ? `/api/catedras?materia_id=${encodeURIComponent(materia_id)}` : '/api/catedras';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al cargar cátedras');
    return res.json();
  },

  async getCatedraDetalle(id: string): Promise<Catedra & { materia?: Materia; facultad?: Facultad }> {
    const res = await fetch(`/api/catedras/${id}`);
    if (!res.ok) throw new Error('Error al cargar detalle de la cátedra');
    return res.json();
  },

  async getEjercicios(filters?: { catedra_id?: string; tema?: string; query?: string }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.catedra_id) params.set('catedra_id', filters.catedra_id);
    if (filters?.tema) params.set('tema', filters.tema);
    if (filters?.query) params.set('query', filters.query);

    const res = await fetch(`/api/ejercicios?${params.toString()}`);
    if (!res.ok) throw new Error('Error al cargar ejercicios');
    return res.json();
  },

  async getEjercicioDetalle(id: string): Promise<EjercicioConDetalle> {
    const res = await fetch(`/api/ejercicios/${id}`);
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
    const res = await fetch('/api/ejercicios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al guardar ejercicio');
    }
    return res.json();
  },

  async extraerTextoOCR(imagen_base64: string, mime_type?: string): Promise<{ texto_ocr: string }> {
    const res = await fetch('/api/ocr/extraer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imagen_base64, mime_type }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al extraer texto con OCR');
    }
    return res.json();
  },

  async generarResolucion(data: {
    ejercicio_id?: string;
    catedra_id?: string;
    enunciado?: string;
    titulo?: string;
    imagen_base64?: string;
  }): Promise<Resolucion> {
    const res = await fetch('/api/resoluciones/generar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      const errorObj = new Error(err.error || err.mensaje || 'Error al resolver el ejercicio');
      (errorObj as any).upgrade_required = err.upgrade_required;
      (errorObj as any).status = res.status;
      throw errorObj;
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
  }> {
    const res = await fetch(`/api/resoluciones/${id}/votar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, comentario }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al registrar voto');
    }
    return res.json();
  },

  async getConsultasRestantes(): Promise<ConsultasStatus> {
    const res = await fetch('/api/consultas/restantes-hoy');
    if (!res.ok) throw new Error('Error al consultar límites diarios');
    return res.json();
  },

  async crearPagoMercadoPago(plan: 'mensual' | 'cuatrimestral' | 'anual'): Promise<{
    preference_id: string;
    plan: string;
    monto_ars: number;
    checkout_url: string;
    sandbox_init_point: string;
  }> {
    const res = await fetch('/api/suscripciones/crear-pago', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    if (!res.ok) throw new Error('Error al iniciar checkout de Mercado Pago');
    return res.json();
  },

  async webhookMercadoPago(data: {
    usuario_id?: string;
    plan: string;
    payment_id: string;
    status: string;
  }): Promise<{ success: boolean; usuario: Usuario; suscripcion: Suscripcion }> {
    const res = await fetch('/api/suscripciones/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error en webhook de confirmación');
    return res.json();
  },

  async getEstadoSuscripcion(): Promise<{
    plan: string;
    es_premium: boolean;
    suscripcion: Suscripcion | null;
  }> {
    const res = await fetch('/api/suscripciones/estado');
    if (!res.ok) throw new Error('Error al obtener estado de suscripción');
    return res.json();
  },

  async cancelarSuscripcion(): Promise<{ success: boolean; usuario: Usuario }> {
    const res = await fetch('/api/suscripciones/cancelar', { method: 'POST' });
    if (!res.ok) throw new Error('Error al cancelar suscripción');
    return res.json();
  },
};
