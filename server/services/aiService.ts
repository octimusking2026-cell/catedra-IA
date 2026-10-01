import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import { SERVER_CONFIG } from '../config';
import { PasoResolucion } from '../../src/types';
import {
  reserveDailyTokens,
  refundDailyTokens,
  reconcileDailyTokens,
  recordUserTokenUsage,
  logAiCall,
  getTodayArgentinaString,
} from './quotaService';

let aiClient: GoogleGenAI | null = null;
if (SERVER_CONFIG.geminiApiKey) {
  aiClient = new GoogleGenAI({
    apiKey: SERVER_CONFIG.geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function isAiAvailable(): boolean {
  return aiClient !== null;
}

/**
 * Computes SHA-256 hash of (normalized statement + catedra_id) for caching and duplicate reuse
 */
export function computeStatementHash(enunciado: string, catedraId: string): string {
  const normalized = (enunciado || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.,:;¿?¡!]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
  const rawKey = `${normalized}|${catedraId}`;
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

/**
 * In-memory concurrency queue limiting active Gemini API calls
 */
class TaskQueue {
  private activeCount = 0;
  private queue: Array<{ resolve: () => void; reject: (err: any) => void }> = [];

  constructor(private concurrency: number) {}

  async run<T>(fn: (queuePosition: number) => Promise<T>): Promise<T> {
    const queuePosition = this.queue.length;
    if (this.activeCount >= this.concurrency) {
      console.log(
        `[Gemini Queue] Concurrency limit (${this.activeCount}/${this.concurrency}) reached. Waiting at position #${queuePosition + 1}`
      );
      await new Promise<void>((resolve, reject) => {
        this.queue.push({ resolve, reject });
      });
    }

    this.activeCount++;
    try {
      return await fn(queuePosition);
    } finally {
      this.activeCount--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        if (next) next.resolve();
      }
    }
  }
}

const geminiQueue = new TaskQueue(SERVER_CONFIG.concurrencyLimit);

/**
 * Wraps a promise with a timeout in ms
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationLabel = 'Llamada a Gemini'
): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err: any = new Error(
        `TIMEOUT: ${operationLabel} superó el tiempo límite de ${timeoutMs}ms.`
      );
      err.isTimeout = true;
      err.status = 408;
      reject(err);
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

/**
 * Determina si un error de Gemini es reintentable.
 * Reintenta SOLO ante 5xx, 429 (rate limit / quota) o timeout/red.
 * NUNCA reintenta errores 4xx del cliente (400, 401, 403, 404, etc.).
 */
export function isRetryableGeminiError(err: any): boolean {
  if (!err) return false;
  if (err.isTimeout) return true;

  const status = Number(err?.status || err?.statusCode || err?.httpStatus || 0);
  const msg = String(err?.message || err).toLowerCase();
  const code = String(err?.code || '').toLowerCase();

  // Errores 4xx del cliente (salvo 429 Too Many Requests y 408 Timeout) NUNCA se reintentan
  if (status >= 400 && status < 500 && status !== 429 && status !== 408) {
    return false;
  }

  if (
    msg.includes('invalid_argument') ||
    msg.includes('invalid argument') ||
    msg.includes('permission_denied') ||
    msg.includes('permission denied') ||
    msg.includes('unauthenticated') ||
    msg.includes('bad request') ||
    msg.includes('not found')
  ) {
    return false;
  }

  // 429 Quota / Rate limit
  if (
    status === 429 ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests')
  ) {
    return true;
  }

  // 5xx Server errors
  if (
    status >= 500 ||
    msg.includes('unavailable') ||
    msg.includes('internal') ||
    msg.includes('server error') ||
    msg.includes('service unavailable') ||
    msg.includes('bad gateway') ||
    msg.includes('gateway timeout')
  ) {
    return true;
  }

  // Timeout y caídas de conexión
  if (
    status === 408 ||
    code.includes('timeout') ||
    code.includes('econnreset') ||
    code.includes('etimedout') ||
    code.includes('econnrefused') ||
    msg.includes('timeout') ||
    msg.includes('socket hang up') ||
    msg.includes('network error')
  ) {
    return true;
  }

  return false;
}

export class TokenAccumulator {
  promptTokens = 0;
  candidatesTokens = 0;
  totalTokens = 0;

  add(usage?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } | null) {
    if (!usage) return;
    const p = usage.promptTokenCount || 0;
    const c = usage.candidatesTokenCount || 0;
    const t = usage.totalTokenCount || (p + c);
    this.promptTokens += p;
    this.candidatesTokens += c;
    this.totalTokens += t;
  }
}

/**
 * Executes generateContent with configurable timeout and up to maxRetries
 * ONLY on 5xx, 429, or timeout, using exponential backoff with jitter.
 * Tracks usageMetadata tokens across all attempts.
 */
async function executeWithRetries(
  modelName: string,
  contents: any,
  config?: any,
  timeoutMs = SERVER_CONFIG.timeoutMs,
  accumulator?: TokenAccumulator
): Promise<any> {
  let attempt = 0;

  while (true) {
    try {
      const callPromise = aiClient!.models.generateContent({
        model: modelName,
        contents,
        config,
      });

      const res = await withTimeout(callPromise, timeoutMs, `generateContent (${modelName})`);
      if (accumulator && res?.usageMetadata) {
        accumulator.add(res.usageMetadata);
      }
      return res;
    } catch (err: any) {
      if (accumulator && err?.response?.usageMetadata) {
        accumulator.add(err.response.usageMetadata);
      }
      const retryable = isRetryableGeminiError(err);

      if (retryable && attempt < SERVER_CONFIG.maxRetries) {
        attempt++;
        const backoffMs = Math.min(
          1000 * Math.pow(2, attempt) + Math.floor(Math.random() * 500),
          8000
        );
        console.warn(
          `[Gemini API] Retryable error (${err?.status || err?.message}) on ${modelName}. Retrying (${attempt}/${SERVER_CONFIG.maxRetries}) in ${backoffMs}ms...`
        );
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }
      throw err;
    }
  }
}

/**
 * Main Gemini caller: queued, checks daily token cap, uses configured model with timeout and selective retries,
 * and falls back to modelFallback on persistent 5xx errors.
 */
export async function callGeminiGenerate(
  contents: any,
  config?: any,
  modelName: string = SERVER_CONFIG.modelResolver,
  timeoutMs: number = SERVER_CONFIG.timeoutMs,
  userId = 'sistema',
  estimatedTokens = 1500
) {
  if (!aiClient) {
    throw new Error('IA no disponible');
  }

  // 1. Reserva atómica previa del tope global de tokens ("reservar antes, devolver si falla")
  const tokenReservation = await reserveDailyTokens(estimatedTokens, SERVER_CONFIG.dailyTokenCap);
  if (!tokenReservation.allowed) {
    throw new Error('DAILY_TOKEN_CAP_EXCEEDED');
  }

  return geminiQueue.run(async (_queuePosition) => {
    const startTime = Date.now();
    const accumulator = new TokenAccumulator();
    let response: any = null;
    let _usedModel = modelName;
    let lastErr: any = null;

    try {
      response = await executeWithRetries(modelName, contents, config, timeoutMs, accumulator);
    } catch (primaryErr: any) {
      lastErr = primaryErr;
      const status = primaryErr?.status || primaryErr?.statusCode || 0;
      const msg = String(primaryErr?.message || primaryErr).toLowerCase();
      const is5xx =
        status >= 500 ||
        msg.includes('unavailable') ||
        msg.includes('internal') ||
        msg.includes('server error');

      if (is5xx && SERVER_CONFIG.modelFallback !== modelName) {
        console.warn(
          `[Gemini API] Primary model ${modelName} returned persistent 5xx error. Falling back to ${SERVER_CONFIG.modelFallback}...`
        );
        try {
          _usedModel = SERVER_CONFIG.modelFallback;
          response = await executeWithRetries(
            SERVER_CONFIG.modelFallback,
            contents,
            config,
            timeoutMs,
            accumulator
          );
        } catch (fallbackErr: any) {
          lastErr = fallbackErr;
          console.warn(
            `[Gemini API] Secondary model ${SERVER_CONFIG.modelFallback} also failed with 5xx. Falling back to stable gemini-2.5-flash...`
          );
          try {
            _usedModel = 'gemini-2.5-flash';
            response = await executeWithRetries(
              'gemini-2.5-flash',
              contents,
              config,
              timeoutMs,
              accumulator
            );
          } catch (stableErr: any) {
            lastErr = stableErr;
          }
        }
      }
    }

    const latencyMs = Date.now() - startTime;
    const promptTokens = accumulator.promptTokens;
    const responseTokens = accumulator.candidatesTokens;
    const totalTokens = accumulator.totalTokens;

    if (response && response.text) {
      // Conciliar tokens estimados con tokens reales consumidos (sumando reintentos y fallbacks) y registrar por usuario
      await Promise.all([
        reconcileDailyTokens(estimatedTokens, totalTokens),
        recordUserTokenUsage(userId, totalTokens),
        logAiCall({
          userId,
          fecha: getTodayArgentinaString(),
          tokens_in: promptTokens,
          tokens_out: responseTokens,
          latencia_ms: latencyMs,
        }),
      ]);

      return response;
    }

    // Si la llamada falló o no devolvió texto, conciliar los tokens consumidos en reintentos/fallbacks si los hubo, o reembolsar
    if (totalTokens > 0) {
      await reconcileDailyTokens(estimatedTokens, totalTokens).catch(() => {});
      await recordUserTokenUsage(userId, totalTokens).catch(() => {});
    } else {
      await refundDailyTokens(estimatedTokens).catch(() => {});
    }

    await logAiCall({
      userId,
      fecha: getTodayArgentinaString(),
      tokens_in: 0,
      tokens_out: 0,
      latencia_ms: latencyMs,
      error: lastErr?.message || String(lastErr),
    }).catch(() => {});

    throw lastErr || new Error('IA no disponible');
  });
}

/**
 * Executes generateContentStream with configurable timeout and up to maxRetries
 * ONLY on 5xx, 429, or timeout, using exponential backoff with jitter.
 */
async function executeStreamWithRetries(
  modelName: string,
  contents: any,
  config?: any,
  timeoutMs = SERVER_CONFIG.solveTimeoutMs,
  accumulator?: TokenAccumulator
): Promise<any> {
  let attempt = 0;

  while (true) {
    try {
      const streamPromise = aiClient!.models.generateContentStream({
        model: modelName,
        contents,
        config,
      });

      return await withTimeout(
        streamPromise,
        timeoutMs,
        `generateContentStream (${modelName})`
      );
    } catch (err: any) {
      if (accumulator && err?.response?.usageMetadata) {
        accumulator.add(err.response.usageMetadata);
      }
      const retryable = isRetryableGeminiError(err);

      if (retryable && attempt < SERVER_CONFIG.maxRetries) {
        attempt++;
        const backoffMs = Math.min(
          1000 * Math.pow(2, attempt) + Math.floor(Math.random() * 500),
          8000
        );
        console.warn(
          `[Gemini API Stream] Retryable error (${err?.status || err?.message}) on ${modelName}. Retrying (${attempt}/${SERVER_CONFIG.maxRetries}) in ${backoffMs}ms...`
        );
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }
      throw err;
    }
  }
}

/**
 * Gemini Streaming caller: queued, checks daily token cap, uses configured model with timeout and retries,
 * falls back to modelFallback on persistent 5xx errors, and streams chunks.
 * Tracks usageMetadata across all retries, fallbacks, and stream chunks.
 */
export async function callGeminiStream(
  contents: any,
  config: any,
  modelName: string = SERVER_CONFIG.modelResolver,
  timeoutMs = SERVER_CONFIG.solveTimeoutMs,
  userId = 'sistema',
  onChunk?: (textChunk: string) => void,
  onQueuePos?: (pos: number) => void,
  estimatedTokens = 3000
): Promise<string> {
  if (!aiClient) {
    throw new Error('IA no disponible');
  }

  // 1. Reserva atómica previa del tope global de tokens
  const tokenReservation = await reserveDailyTokens(estimatedTokens, SERVER_CONFIG.dailyTokenCap);
  if (!tokenReservation.allowed) {
    throw new Error('DAILY_TOKEN_CAP_EXCEEDED');
  }

  return geminiQueue.run(async (queuePosition) => {
    if (onQueuePos && queuePosition > 0) {
      onQueuePos(queuePosition);
    }

    const startTime = Date.now();
    const accumulator = new TokenAccumulator();
    let streamResult: any = null;
    let _usedModel = modelName;
    let lastErr: any = null;

    try {
      streamResult = await executeStreamWithRetries(modelName, contents, config, timeoutMs, accumulator);
    } catch (primaryErr: any) {
      lastErr = primaryErr;
      const status = primaryErr?.status || primaryErr?.statusCode || 0;
      const msg = String(primaryErr?.message || primaryErr).toLowerCase();
      const is5xx =
        status >= 500 ||
        msg.includes('unavailable') ||
        msg.includes('internal') ||
        msg.includes('server error');

      if (is5xx && SERVER_CONFIG.modelFallback !== modelName) {
        console.warn(
          `[Gemini API Stream] Primary model ${modelName} returned 5xx error. Falling back to ${SERVER_CONFIG.modelFallback}...`
        );
        try {
          _usedModel = SERVER_CONFIG.modelFallback;
          streamResult = await executeStreamWithRetries(
            SERVER_CONFIG.modelFallback,
            contents,
            config,
            timeoutMs,
            accumulator
          );
        } catch (fallbackErr: any) {
          lastErr = fallbackErr;
          console.warn(
            `[Gemini API Stream] Secondary model ${SERVER_CONFIG.modelFallback} also failed with 5xx. Falling back to stable gemini-2.5-flash...`
          );
          try {
            _usedModel = 'gemini-2.5-flash';
            streamResult = await executeStreamWithRetries(
              'gemini-2.5-flash',
              contents,
              config,
              timeoutMs,
              accumulator
            );
          } catch (stableErr: any) {
            lastErr = stableErr;
          }
        }
      }
    }

    if (!streamResult) {
      const latencyMs = Date.now() - startTime;
      if (accumulator.totalTokens > 0) {
        await reconcileDailyTokens(estimatedTokens, accumulator.totalTokens).catch(() => {});
        await recordUserTokenUsage(userId, accumulator.totalTokens).catch(() => {});
      } else {
        await refundDailyTokens(estimatedTokens).catch(() => {});
      }
      await logAiCall({
        userId,
        fecha: getTodayArgentinaString(),
        tokens_in: accumulator.promptTokens,
        tokens_out: accumulator.candidatesTokens,
        latencia_ms: latencyMs,
        error: lastErr?.message || String(lastErr),
      }).catch(() => {});
      throw lastErr || new Error('IA no disponible');
    }

    let fullText = '';

    try {
      for await (const chunk of streamResult) {
        if (Date.now() - startTime > timeoutMs) {
          const timeoutErr: any = new Error(
            `TIMEOUT: generateContentStream superó el tiempo límite total de ${timeoutMs}ms.`
          );
          timeoutErr.status = 408;
          timeoutErr.isTimeout = true;
          throw timeoutErr;
        }
        if (chunk.usageMetadata) {
          accumulator.add(chunk.usageMetadata);
        }
        const textChunk = chunk.text || '';
        if (textChunk) {
          fullText += textChunk;
          if (onChunk) onChunk(textChunk);
        }
      }

      if (streamResult.response?.usageMetadata) {
        accumulator.add(streamResult.response.usageMetadata);
      }

      const promptTokens = accumulator.promptTokens;
      const responseTokens = accumulator.candidatesTokens;
      const totalTokens = accumulator.totalTokens;

      const latencyMs = Date.now() - startTime;

      // Conciliar la reserva de tokens estimados con el total real consumido en todos los intentos
      await Promise.all([
        reconcileDailyTokens(estimatedTokens, totalTokens),
        recordUserTokenUsage(userId, totalTokens),
        logAiCall({
          userId,
          fecha: getTodayArgentinaString(),
          tokens_in: promptTokens,
          tokens_out: responseTokens,
          latencia_ms: latencyMs,
        }),
      ]);

      return fullText;
    } catch (streamErr) {
      if (accumulator.totalTokens > 0) {
        await reconcileDailyTokens(estimatedTokens, accumulator.totalTokens).catch(() => {});
        await recordUserTokenUsage(userId, accumulator.totalTokens).catch(() => {});
      } else {
        await refundDailyTokens(estimatedTokens).catch(() => {});
      }
      throw streamErr;
    }
  });
}

/**
 * Helper to extract completed step objects from streaming partial JSON text
 */
export function extractStepsFromPartialJson(jsonText: string): PasoResolucion[] {
  const pasosIndex = jsonText.indexOf('"pasos"');
  if (pasosIndex === -1) return [];
  const arrayStart = jsonText.indexOf('[', pasosIndex);
  if (arrayStart === -1) return [];

  const steps: PasoResolucion[] = [];
  let depth = 0;
  let inString = false;
  let escape = false;
  let stepStart = -1;

  for (let i = arrayStart + 1; i < jsonText.length; i++) {
    const char = jsonText[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\' && inString) {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === '{') {
      if (depth === 0) stepStart = i;
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0 && stepStart !== -1) {
        const candidateObjStr = jsonText.substring(stepStart, i + 1);
        try {
          const p = JSON.parse(candidateObjStr);
          if (p && (p.titulo || p.explicacion || p.desarrollo_matematico)) {
            steps.push({
              numero: p.numero || steps.length + 1,
              titulo: (p.titulo || `Paso ${steps.length + 1}`).trim(),
              explicacion: (p.explicacion || '').trim(),
              desarrollo_matematico: (p.desarrollo_matematico || '').trim(),
              justificacion_catedra: (p.justificacion_catedra || '').trim() || undefined,
              advertencia_examen: (p.advertencia_examen || '').trim() || undefined,
              chequeo: (p.chequeo || '').trim() || undefined,
            });
          }
        } catch {
          // Incomplete snippet
        }
        stepStart = -1;
      }
    }
  }
  return steps;
}
