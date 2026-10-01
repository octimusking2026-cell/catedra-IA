import dotenv from 'dotenv';

dotenv.config();

export const SERVER_CONFIG = {
  // Server runtime
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // Limits
  dailyLimit: process.env.DAILY_LIMIT ? parseInt(process.env.DAILY_LIMIT, 10) : 50,
  dailyTokenCap: process.env.DAILY_TOKEN_CAP ? parseInt(process.env.DAILY_TOKEN_CAP, 10) : 5000000,
  concurrencyLimit: process.env.GEMINI_CONCURRENCY ? parseInt(process.env.GEMINI_CONCURRENCY, 10) : 3,
  historyPageSize: 20,

  // Admin access control
  adminUids: [
    ...(process.env.ADMIN_UIDS ? process.env.ADMIN_UIDS.split(',').map((s) => s.trim()) : []),
    ...(process.env.ADMIN_UID ? process.env.ADMIN_UID.split(',').map((s) => s.trim()) : []),
    ...(process.env.VITE_ADMIN_UID ? process.env.VITE_ADMIN_UID.split(',').map((s) => s.trim()) : []),
  ].filter(Boolean),

  // Payload and Media validation limits
  maxFileBytes: 10 * 1024 * 1024, // 10 MB
  maxPdfPages: 5,
  maxEnunciadoChars: 5000,
  maxTituloChars: 200,
  maxComentarioChars: 1000,
  maxFeedbackChars: 1000,
  allowedMimeTypes: [
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/pdf',
  ] as const,

  // Gemini AI Models & Settings
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  modelOcr: process.env.GEMINI_MODEL_OCR || process.env.GEMINI_MODEL_CHEAP || 'gemini-2.5-flash',
  modelResolver: process.env.GEMINI_MODEL_RESOLVER || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  modelFallback: process.env.GEMINI_FALLBACK || 'gemini-2.5-flash',
  timeoutMs: process.env.GEMINI_TIMEOUT_MS ? parseInt(process.env.GEMINI_TIMEOUT_MS, 10) : 60000,
  ocrTimeoutMs: 45000,
  solveTimeoutMs: 90000,
  maxRetries: 2, // Up to 2 retries (3 attempts total)
  promptVersion: 'v1',

  // Rate Limiting (Requests per 60 seconds)
  rateLimits: {
    ocrUid: 8,
    ocrIp: 20,
    solveUid: 6,
    solveIp: 20,
    voteUid: 15,
    feedbackUid: 10,
    waitlistIp: 5,
    windowMs: 60000,
  },
};

export const TERMS_VERSION = '30/09/2026';

/**
 * Public configuration exposed to the frontend via /api/config
 */
export const CLIENT_CONFIG = {
  dailyLimit: SERVER_CONFIG.dailyLimit,
  maxFileBytes: SERVER_CONFIG.maxFileBytes,
  maxPdfPages: SERVER_CONFIG.maxPdfPages,
  maxEnunciadoChars: SERVER_CONFIG.maxEnunciadoChars,
  allowedMimeTypes: SERVER_CONFIG.allowedMimeTypes,
  historyPageSize: SERVER_CONFIG.historyPageSize,
  modelOcr: SERVER_CONFIG.modelOcr,
  modelResolver: SERVER_CONFIG.modelResolver,
  timeZone: 'America/Argentina/Buenos_Aires',
  terminosVersion: TERMS_VERSION,
};
