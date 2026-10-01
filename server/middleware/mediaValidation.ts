import { z } from 'zod';
import { SERVER_CONFIG } from '../config';

export function validatePdfPayload(cleanBase64: string): { valid: boolean; error?: string } {
  const byteLength = Math.floor((cleanBase64.length * 3) / 4);
  if (byteLength > SERVER_CONFIG.maxFileBytes) {
    return {
      valid: false,
      error: `El archivo PDF supera el límite de ${SERVER_CONFIG.maxFileBytes / (1024 * 1024)} MB permitidos.`,
    };
  }
  try {
    const buffer = Buffer.from(cleanBase64, 'base64');
    const content = buffer.toString('binary');
    const pageMatches = content.match(/\/Type\s*\/Page(?=[\s\/])/g);
    const pageCount = pageMatches ? pageMatches.length : 1;
    if (pageCount > SERVER_CONFIG.maxPdfPages) {
      return {
        valid: false,
        error: `El documento PDF tiene ${pageCount} páginas. El máximo permitido por ejercicio es de ${SERVER_CONFIG.maxPdfPages} páginas.`,
      };
    }
  } catch (err) {
    console.error('Error al analizar archivo PDF:', err);
  }
  return { valid: true };
}

export function validateMediaPayload(
  cleanBase64: string,
  mimeType: string
): { valid: boolean; error?: string } {
  const byteLength = Math.floor((cleanBase64.length * 3) / 4);
  if (byteLength > SERVER_CONFIG.maxFileBytes) {
    return {
      valid: false,
      error: `El archivo supera el límite de ${SERVER_CONFIG.maxFileBytes / (1024 * 1024)} MB permitidos.`,
    };
  }
  if (!SERVER_CONFIG.allowedMimeTypes.includes(mimeType as any)) {
    return {
      valid: false,
      error: 'Solo se admiten archivos image/png, image/jpeg, image/webp y application/pdf.',
    };
  }
  if (mimeType === 'application/pdf') {
    return validatePdfPayload(cleanBase64);
  }
  return { valid: true };
}

export function parseBase64Media(
  rawString: string,
  requestedMime?: string
): { cleanBase64: string; mimeType: string } | null {
  if (!rawString || typeof rawString !== 'string') return null;

  let mimeType = (requestedMime || '').trim().toLowerCase();
  let clean = rawString.trim();

  const dataUrlMatch = clean.match(/^data:([^;,]+)(?:;charset=[^;,]+)?;base64,(.*)$/is);
  if (dataUrlMatch) {
    const extractedMime = dataUrlMatch[1].trim().toLowerCase();
    if (!mimeType || mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      mimeType = extractedMime;
    }
    clean = dataUrlMatch[2];
  } else {
    clean = clean.replace(/^data:[^,]+,/, '');
  }

  clean = clean.replace(/[\s\r\n'"]+/g, '');

  if (clean.startsWith('iVBORw0KGgo')) {
    mimeType = 'image/png';
  } else if (clean.startsWith('/9j/')) {
    mimeType = 'image/jpeg';
  } else if (clean.startsWith('JVBER')) {
    mimeType = 'application/pdf';
  } else if (clean.startsWith('UklGR')) {
    mimeType = 'image/webp';
  } else if (clean.startsWith('R0lGOD')) {
    mimeType = 'image/gif';
  }

  if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
  if (!mimeType) mimeType = 'image/jpeg';

  return { cleanBase64: clean, mimeType };
}

// Zod Schemas
export const mimeTypeSchema = z.enum([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
]);

export const ocrSchema = z.object({
  imagen_base64: z
    .string()
    .min(1, 'Se requiere la imagen en base64')
    .max(
      Math.ceil((SERVER_CONFIG.maxFileBytes * 4) / 3) + 2000,
      `El archivo supera el tamaño máximo permitido de ${SERVER_CONFIG.maxFileBytes / (1024 * 1024)}MB.`
    ),
  mime_type: mimeTypeSchema.optional(),
});

export const resolucionGenerarSchema = z.object({
  ejercicio_id: z.string().trim().max(100, 'El ID de ejercicio no es válido').optional(),
  catedra_id: z.string().trim().max(100, 'El ID de cátedra no es válido').optional(),
  enunciado: z
    .string()
    .min(5, 'El enunciado debe tener al menos 5 caracteres.')
    .max(SERVER_CONFIG.maxEnunciadoChars, `El enunciado no puede superar ${SERVER_CONFIG.maxEnunciadoChars} caracteres.`)
    .optional(),
  titulo: z
    .string()
    .min(2, 'El título debe tener al menos 2 caracteres.')
    .max(SERVER_CONFIG.maxTituloChars, `El título no puede superar ${SERVER_CONFIG.maxTituloChars} caracteres.`)
    .optional(),
  tema: z.string().trim().min(1, 'El tema no puede estar vacío.').max(100, 'El tema no puede superar 100 caracteres.').optional(),
  imagen_base64: z
    .string()
    .max(
      Math.ceil((SERVER_CONFIG.maxFileBytes * 4) / 3) + 2000,
      `El archivo supera el tamaño máximo permitido de ${SERVER_CONFIG.maxFileBytes / (1024 * 1024)}MB.`
    )
    .optional(),
  mime_type: mimeTypeSchema.optional(),
  incluir_imagen: z.boolean().optional(),
  visibilidad: z.enum(['privado', 'compartido']).optional(),
});

export const votarSchema = z.object({
  tipo: z.enum(['positivo', 'negativo']),
  comentario: z
    .string()
    .max(SERVER_CONFIG.maxComentarioChars, `El comentario no puede superar ${SERVER_CONFIG.maxComentarioChars} caracteres.`)
    .optional(),
});

export const feedbackSchema = z.object({
  mensaje: z
    .string()
    .min(1, 'El mensaje no puede estar vacío.')
    .max(SERVER_CONFIG.maxFeedbackChars, `El mensaje no puede superar ${SERVER_CONFIG.maxFeedbackChars} caracteres.`),
  pantalla: z.string().max(100, 'La pantalla no puede superar 100 caracteres.').optional(),
});

export const waitlistSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'El email es obligatorio')
    .email('Email no válido')
    .max(150, 'El email no puede superar 150 caracteres.'),
  materia_o_carrera: z.string().trim().max(100, 'La materia o carrera no puede superar 100 caracteres.').optional(),
});

export const aceptarTerminosSchema = z.object({
  version: z.string().trim().min(1, 'La versión de términos es requerida').max(50),
});

export const reporteSchema = z.object({
  motivo: z.string().trim().min(1, 'El motivo de reporte es requerido').max(200),
  detalle: z.string().trim().max(1000).optional(),
});

export const visibilidadAdminSchema = z.object({
  aprobado: z.boolean(),
});
