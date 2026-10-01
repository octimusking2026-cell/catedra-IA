export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  foto_url?: string;
  fecha_registro: string;
  es_admin?: boolean;
  terminos_version?: string;
  terminos_aceptados_en?: string;
}

export interface Facultad {
  id: string;
  nombre: string;
  universidad: string;
  siglas: string;
  logo_color?: string;
}

export interface Carrera {
  id: string;
  nombre: string;
  facultad_id: string;
  siglas?: string;
}

export interface Materia {
  id: string;
  nombre: string;
  facultad_id: string;
  codigo?: string;
  anio?: number;
  anio_por_carrera?: Record<string, number>;
  cuatrimestre?: '1' | '2' | 'anual';
  carreras_ids?: string[];
}

export interface Catedra {
  id: string;
  materia_id: string;
  nombre: string;
  profesor?: string;
  cuatrimestre: string;
  estilo_metodologico: string;
  contexto?: string;
  criterios_clave: string[];
  temas: string[];
  consejos_examen?: string[];
}

export interface Ejercicio {
  id: string;
  catedra_id: string;
  usuario_id_subio?: string;
  usuario_nombre?: string;
  usuario_foto?: string;
  titulo: string;
  imagen_url?: string;
  texto_ocr: string;
  tema: string;
  aprobado: boolean;
  fecha_subida: string;
  hash_enunciado?: string;
  visibilidad?: 'privado' | 'compartido';
  es_mio?: boolean;
}

export interface PasoResolucion {
  numero: number;
  titulo: string;
  explicacion: string;
  desarrollo_matematico: string;
  justificacion_catedra?: string;
  advertencia_examen?: string;
  chequeo?: string;
}

export interface Resolucion {
  id: string;
  ejercicio_id: string;
  contenido_paso_a_paso: PasoResolucion[];
  resultado_final: string;
  resumen_criterio: string;
  entendimiento?: string;
  estrategia?: string;
  supuestos?: string[];
  errores_comunes?: string[];
  confianza?: 'alta' | 'media' | 'baja';
  motivo_confianza?: string;
  advertencia?: string;
  votos_positivos: number;
  votos_negativos: number;
  estado: 'sin_verificar' | 'verificada' | 'en_revision' | 'archivada';
  fecha_generada: string;
  hash_enunciado?: string;
}

export interface ConsultasStatus {
  limite: number;
  usadas: number;
  restantes: number;
  upgrade_required?: boolean;
  tokens_usados_hoy?: number;
}

export interface EjercicioConDetalle extends Ejercicio {
  resolucion?: Resolucion;
  resoluciones_archivadas?: Resolucion[];
  catedra?: Catedra;
  materia?: Materia;
  facultad?: Facultad;
  mi_voto?: {
    tipo: 'positivo' | 'negativo';
    comentario?: string;
  };
}

export interface VotoDetalle {
  user_id: string;
  resolucion_id: string;
  tipo: 'positivo' | 'negativo';
  comentario?: string;
  fecha: string;
}

export interface ClientConfig {
  dailyLimit: number;
  maxFileBytes: number;
  maxPdfPages: number;
  maxEnunciadoChars: number;
  allowedMimeTypes: readonly string[];
  historyPageSize: number;
  modelOcr: string;
  modelResolver: string;
  timeZone: string;
}

export interface FeedbackMessage {
  id?: string;
  userId?: string;
  usuario_nombre?: string;
  usuario_email?: string;
  mensaje: string;
  pantalla?: string;
  fecha: string;
}

export interface ReporteEjercicio {
  id?: string;
  ejercicioId: string;
  motivo: string;
  detalle?: string;
  userId: string;
  usuario_nombre?: string;
  usuario_email?: string;
  fecha: string;
  estado?: 'pendiente' | 'revisado' | 'desestimado';
}
