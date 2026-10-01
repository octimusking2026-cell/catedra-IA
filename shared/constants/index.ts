export const APP_NAME = 'Cátedra IA';

export const MEDIA_LIMITS = {
  MAX_FILE_BYTES: 10 * 1024 * 1024, // 10MB
  MAX_PDF_PAGES: 3,
  MAX_ENUNCIADO_CHARS: 4000,
  ALLOWED_MIME_TYPES: [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'application/pdf',
  ] as const,
};

export const QUOTA_DEFAULTS = {
  DAILY_LIMIT: 50,
  TIME_ZONE: 'America/Argentina/Buenos_Aires',
};

export const TERMS_VERSION = '30/09/2026';
