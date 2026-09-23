export type PlanType = 'free' | 'premium';

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  plan: PlanType;
  fecha_registro: string;
}

export interface Facultad {
  id: string;
  nombre: string;
  universidad: string;
  siglas: string;
  logo_color?: string;
}

export interface Materia {
  id: string;
  nombre: string;
  facultad_id: string;
  codigo?: string;
}

export interface Catedra {
  id: string;
  materia_id: string;
  nombre: string;
  profesor: string;
  cuatrimestre: string;
  estilo_metodologico: string;
  criterios_clave: string[];
  temas: string[];
  consejos_examen?: string[];
}

export interface Ejercicio {
  id: string;
  catedra_id: string;
  usuario_id_subio: string;
  usuario_nombre?: string;
  titulo: string;
  imagen_url?: string;
  texto_ocr: string;
  tema: string;
  aprobado: boolean;
  fecha_subida: string;
}

export interface PasoResolucion {
  numero: number;
  titulo: string;
  explicacion: string;
  desarrollo_matematico: string;
  justificacion_catedra: string;
  advertencia_examen?: string;
}

export interface Resolucion {
  id: string;
  ejercicio_id: string;
  contenido_paso_a_paso: PasoResolucion[];
  resultado_final: string;
  resumen_criterio: string;
  votos_positivos: number;
  votos_negativos: number;
  estado: 'aprobada' | 'en_revision';
  fecha_generada: string;
}

export interface ConsultaDiaria {
  id: string;
  usuario_id: string;
  fecha: string;
  cantidad: number;
}

export interface Suscripcion {
  id: string;
  usuario_id: string;
  estado: 'activa' | 'cancelada' | 'pendiente';
  fecha_inicio: string;
  fecha_fin: string;
  mercado_pago_id: string;
  plan: 'mensual' | 'cuatrimestral' | 'anual';
  monto_ars: number;
}

export interface ConsultasStatus {
  limite: number;
  usadas: number;
  restantes: number;
  es_premium: boolean;
}

export interface EjercicioConDetalle extends Ejercicio {
  resolucion?: Resolucion;
  catedra?: Catedra;
  materia?: Materia;
  facultad?: Facultad;
}
