import { PasoResolucion } from '../../shared/types';

export interface RawAiParsedPayload {
  resumen_criterio?: string;
  resultado_final?: string;
  entendimiento?: string;
  estrategia?: string;
  confianza?: string;
  motivo_confianza?: string;
  supuestos?: string[];
  errores_comunes?: string[];
  pasos?: Array<{
    numero?: number;
    titulo?: string;
    explicacion?: string;
    desarrollo_matematico?: string;
    justificacion_catedra?: string;
    advertencia_examen?: string;
    chequeo?: string;
  }>;
}

export function normalizarPasos(
  parsed: RawAiParsedPayload,
  fallbackSinImagen = false
): {
  validSteps: PasoResolucion[];
  cleanedSummary: string;
  cleanedResult: string;
  cleanedEntendimiento?: string;
  cleanedEstrategia?: string;
  confianza: 'alta' | 'media' | 'baja';
  cleanedMotivoConfianza?: string;
  supuestos?: string[];
  erroresComunes?: string[];
} {
  if (!parsed || !Array.isArray(parsed.pasos) || parsed.pasos.length === 0) {
    throw new Error('La IA no generó pasos de resolución válidos.');
  }

  const cleanedSummary = (parsed.resumen_criterio || '').trim();
  const cleanedResult = (parsed.resultado_final || '').trim();
  const cleanedEntendimiento = (parsed.entendimiento || '').trim();
  const cleanedEstrategia = (parsed.estrategia || '').trim();
  const cleanedMotivoConfianza = (parsed.motivo_confianza || '').trim();
  const rawConfianza = String(parsed.confianza || '').toLowerCase().trim();
  const confianza: 'alta' | 'media' | 'baja' =
    rawConfianza === 'alta' || rawConfianza === 'media' || rawConfianza === 'baja'
      ? rawConfianza
      : 'alta';

  const supuestos: string[] = Array.isArray(parsed.supuestos)
    ? parsed.supuestos.map((s) => String(s || '').trim()).filter(Boolean)
    : [];

  if (fallbackSinImagen) {
    supuestos.unshift('La resolución no consideró la figura.');
  }

  const erroresComunes: string[] = Array.isArray(parsed.errores_comunes)
    ? parsed.errores_comunes.map((e) => String(e || '').trim()).filter(Boolean)
    : [];

  if (!cleanedResult) {
    throw new Error('La IA no devolvió un resultado final concluyente.');
  }

  const validSteps: PasoResolucion[] = (parsed.pasos || [])
    .map((p, idx) => {
      const justif = (p.justificacion_catedra || '').trim();
      const check = (p.chequeo || '').trim();
      const adv = (p.advertencia_examen || '').trim();

      return {
        numero: p.numero || idx + 1,
        titulo: (p.titulo || `Paso ${idx + 1}`).trim(),
        explicacion: (p.explicacion || '').trim(),
        desarrollo_matematico: (p.desarrollo_matematico || '').trim(),
        justificacion_catedra: justif || undefined,
        advertencia_examen: adv || undefined,
        chequeo: check || undefined,
      };
    })
    .filter((p) => p.titulo && (p.explicacion || p.desarrollo_matematico));

  if (validSteps.length === 0) {
    throw new Error('Los pasos de resolución recibidos estaban vacíos.');
  }

  return {
    validSteps,
    cleanedSummary,
    cleanedResult,
    cleanedEntendimiento: cleanedEntendimiento || undefined,
    cleanedEstrategia: cleanedEstrategia || undefined,
    confianza,
    cleanedMotivoConfianza: cleanedMotivoConfianza || undefined,
    supuestos: supuestos.length > 0 ? supuestos : undefined,
    erroresComunes: erroresComunes.length > 0 ? erroresComunes : undefined,
  };
}
