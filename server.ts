import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import {
  SEED_USUARIOS,
  SEED_FACULTADES,
  SEED_MATERIAS,
  SEED_CATEDRAS,
  SEED_EJERCICIOS,
  SEED_RESOLUCIONES,
} from './src/data/seed';
import {
  Usuario,
  Facultad,
  Materia,
  Catedra,
  Ejercicio,
  Resolucion,
  Suscripcion,
  PasoResolucion,
  VotoDetalle,
  ListaEsperaEntry,
} from './src/types';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Protection against runaway payloads: Max 10MB for images / PDFs
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Custom payload too large error handler
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return res.status(413).json({
      error: 'Archivo demasiado pesado',
      mensaje: 'El archivo excede el límite máximo de 10 MB. Comprimí la imagen o PDF para continuar.',
    });
  }
  next(err);
});

// -------------------------------------------------------------
// Lightweight File-based Persistence (/data/db.json)
// -------------------------------------------------------------
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface DatabaseStore {
  usuarios: Usuario[];
  facultades: Facultad[];
  materias: Materia[];
  catedras: Catedra[];
  ejercicios: Ejercicio[];
  resoluciones: Resolucion[];
  suscripciones: Suscripcion[];
  consultasDiarias: Record<string, number>;
  votosPorResolucion: Record<string, Record<string, VotoDetalle>>;
  listaEspera: ListaEsperaEntry[];
  aiCallsGlobales: Record<string, number>;
}

let dbUsuarios: Usuario[] = [...SEED_USUARIOS];
let dbFacultades: Facultad[] = [...SEED_FACULTADES];
let dbMaterias: Materia[] = [...SEED_MATERIAS];
let dbCatedras: Catedra[] = [...SEED_CATEDRAS];
let dbEjercicios: Ejercicio[] = [...SEED_EJERCICIOS];
let dbResoluciones: Resolucion[] = [...SEED_RESOLUCIONES];
let dbSuscripciones: Suscripcion[] = [];
let dbConsultasDiarias: Record<string, number> = {};
let dbVotosPorResolucion: Record<string, Record<string, VotoDetalle>> = {};
let dbListaEspera: ListaEsperaEntry[] = [];
let dbAiCallsGlobales: Record<string, number> = {};

// Load persistent DB on startup
function initDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const loaded: DatabaseStore = JSON.parse(raw);
      if (loaded.usuarios && loaded.usuarios.length > 0) dbUsuarios = loaded.usuarios;
      if (loaded.ejercicios) dbEjercicios = loaded.ejercicios;
      if (loaded.resoluciones) dbResoluciones = loaded.resoluciones;
      if (loaded.suscripciones) dbSuscripciones = loaded.suscripciones;
      if (loaded.consultasDiarias) dbConsultasDiarias = loaded.consultasDiarias;
      if (loaded.votosPorResolucion) dbVotosPorResolucion = loaded.votosPorResolucion;
      if (loaded.listaEspera) dbListaEspera = loaded.listaEspera;
      if (loaded.aiCallsGlobales) dbAiCallsGlobales = loaded.aiCallsGlobales;
      console.log('Database loaded successfully from persistent storage.');
    } else {
      saveDatabaseSync();
      console.log('Database initialized and seeded into persistent storage.');
    }
  } catch (err) {
    console.error('Error initializing database file, falling back to memory seed:', err);
  }
}

let saveTimer: NodeJS.Timeout | null = null;
function scheduleSaveDb() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveDatabaseSync();
  }, 250);
}

function saveDatabaseSync() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const data: DatabaseStore = {
      usuarios: dbUsuarios,
      facultades: dbFacultades,
      materias: dbMaterias,
      catedras: dbCatedras,
      ejercicios: dbEjercicios,
      resoluciones: dbResoluciones,
      suscripciones: dbSuscripciones,
      consultasDiarias: dbConsultasDiarias,
      votosPorResolucion: dbVotosPorResolucion,
      listaEspera: dbListaEspera,
      aiCallsGlobales: dbAiCallsGlobales,
    };
    const tmpFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
  } catch (err) {
    console.error('Error saving persistent database:', err);
  }
}

initDatabase();

// -------------------------------------------------------------
// Timezone: Argentina (America/Argentina/Buenos_Aires) & Atomic Quota
// -------------------------------------------------------------
function getTodayArgentinaString(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }
}

// -------------------------------------------------------------
// Isolated Anonymous Browser Identity
// -------------------------------------------------------------
function getOrCreateAnonUser(req: Request): Usuario {
  const rawHeader = req.headers['x-anon-user-id'];
  let anonId = (typeof rawHeader === 'string' && rawHeader.trim()) ? rawHeader.trim() : '';

  if (!anonId || !anonId.startsWith('anon_')) {
    anonId = 'anon_invitado_default';
  }

  let user = dbUsuarios.find((u) => u.id === anonId);
  if (!user) {
    const shortTag = anonId.length > 8 ? anonId.slice(-4) : 'Piloto';
    user = {
      id: anonId,
      email: `${anonId}@estudiante.catedraia.local`,
      nombre: `Estudiante ${shortTag}`,
      plan: 'free',
      fecha_registro: new Date().toISOString(),
    };
    dbUsuarios.push(user);
    scheduleSaveDb();
  }
  return user;
}

function getUserDailyQueries(userId: string): number {
  const key = `${userId}_${getTodayArgentinaString()}`;
  return dbConsultasDiarias[key] || 0;
}

function checkAndIncrementUserDailyQuota(userId: string, isPremium: boolean, limit = 3): { allowed: boolean; used: number; remaining: number } {
  if (isPremium) {
    return { allowed: true, used: 0, remaining: 9999 };
  }

  const key = `${userId}_${getTodayArgentinaString()}`;
  const used = dbConsultasDiarias[key] || 0;

  if (used >= limit) {
    return { allowed: false, used, remaining: 0 };
  }

  dbConsultasDiarias[key] = used + 1;
  scheduleSaveDb();

  return { allowed: true, used: used + 1, remaining: Math.max(0, limit - (used + 1)) };
}

// -------------------------------------------------------------
// Cost Protection: Rate Limiter & Global Google Account Cap
// -------------------------------------------------------------
const rateLimitMap: Record<string, number[]> = {};

function checkRateLimit(key: string, maxRequests = 12, windowMs = 60000): boolean {
  const now = Date.now();
  const history = (rateLimitMap[key] || []).filter((t) => now - t < windowMs);
  if (history.length >= maxRequests) {
    return false;
  }
  history.push(now);
  rateLimitMap[key] = history;
  return true;
}

// Global safety ceiling per day in Argentina to protect owner's Google Cloud credit
const DAILY_GLOBAL_AI_CAP = 450;
function canExecuteGlobalAiCall(): boolean {
  const today = getTodayArgentinaString();
  const count = dbAiCallsGlobales[today] || 0;
  return count < DAILY_GLOBAL_AI_CAP;
}

function registerGlobalAiCall() {
  const today = getTodayArgentinaString();
  dbAiCallsGlobales[today] = (dbAiCallsGlobales[today] || 0) + 1;
  scheduleSaveDb();
}

// -------------------------------------------------------------
// Gemini Client Setup
// -------------------------------------------------------------
const geminiApiKey = process.env.GEMINI_API_KEY || '';
let aiClient: GoogleGenAI | null = null;
if (geminiApiKey) {
  aiClient = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const ACTIVE_GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.5-flash'];

async function callGeminiGenerate(contents: any, config?: any) {
  if (!aiClient) {
    throw new Error('IA no disponible');
  }

  if (!canExecuteGlobalAiCall()) {
    throw new Error('CAP_GLOBAL_ALCANZADO');
  }

  let lastErr: any = null;

  for (const model of ACTIVE_GEMINI_MODELS) {
    try {
      const response = await aiClient.models.generateContent({
        model,
        contents,
        config,
      });

      if (response && response.text) {
        registerGlobalAiCall();
        return response;
      }
    } catch (err: any) {
      lastErr = err;
      console.warn(`[Gemini API] Call failed on model ${model}:`, err?.status || err?.message || err);
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  throw lastErr || new Error('IA no disponible');
}

// -------------------------------------------------------------
// Auth & Profile Endpoints (Per Isolated Anon Identity)
// -------------------------------------------------------------
app.get('/api/auth/perfil', (req: Request, res: Response) => {
  const user = getOrCreateAnonUser(req);
  const queriesToday = getUserDailyQueries(user.id);
  const isPremium = user.plan === 'premium';

  res.json({
    usuario: user,
    consultas: {
      limite: 3,
      usadas: queriesToday,
      restantes: isPremium ? 9999 : Math.max(0, 3 - queriesToday),
      es_premium: isPremium,
    },
  });
});

app.post('/api/auth/switch-user', (req: Request, res: Response) => {
  const { usuario_id } = req.body;
  const user = getOrCreateAnonUser(req);

  // Allow tester to toggle demo premium on their own anonymous account safely
  if (usuario_id === 'usr_premium_demo' || usuario_id === 'premium') {
    user.plan = 'premium';
  } else if (usuario_id === 'usr_free_demo' || usuario_id === 'free') {
    user.plan = 'free';
  }
  scheduleSaveDb();

  res.json({ usuario: user });
});

// -------------------------------------------------------------
// Academic Structure Endpoints
// -------------------------------------------------------------
app.get('/api/facultades', (_req: Request, res: Response) => {
  // Only return faculties that have active subjects registered
  const facultadesConMaterias = dbFacultades.filter((f) =>
    dbMaterias.some((m) => m.facultad_id === f.id)
  );
  res.json(facultadesConMaterias);
});

app.get('/api/materias', (req: Request, res: Response) => {
  const { facultad_id } = req.query;
  if (facultad_id) {
    const filtradas = dbMaterias.filter((m) => m.facultad_id === String(facultad_id));
    return res.json(filtradas);
  }
  res.json(dbMaterias);
});

app.get('/api/catedras', (req: Request, res: Response) => {
  const { materia_id } = req.query;
  if (materia_id) {
    const filtradas = dbCatedras.filter((c) => c.materia_id === String(materia_id));
    return res.json(filtradas);
  }
  res.json(dbCatedras);
});

app.get('/api/catedras/:id', (req: Request, res: Response) => {
  const catedra = dbCatedras.find((c) => c.id === req.params.id);
  if (!catedra) {
    return res.status(404).json({ error: 'Cátedra no encontrada' });
  }
  const materia = dbMaterias.find((m) => m.id === catedra.materia_id);
  const facultad = materia ? dbFacultades.find((f) => f.id === materia.facultad_id) : undefined;

  res.json({
    ...catedra,
    materia,
    facultad,
  });
});

// -------------------------------------------------------------
// Ejercicios Endpoints
// -------------------------------------------------------------
app.get('/api/ejercicios', (req: Request, res: Response) => {
  const { catedra_id, tema, query } = req.query;
  const user = getOrCreateAnonUser(req);
  let items = [...dbEjercicios];

  if (catedra_id) {
    items = items.filter((e) => e.catedra_id === String(catedra_id));
  }

  if (tema && tema !== 'todos') {
    items = items.filter((e) => e.tema.toLowerCase() === String(tema).toLowerCase());
  }

  if (query) {
    const q = String(query).toLowerCase();
    items = items.filter(
      (e) =>
        e.titulo.toLowerCase().includes(q) ||
        e.texto_ocr.toLowerCase().includes(q) ||
        e.tema.toLowerCase().includes(q)
    );
  }

  const enriched = items.map((e) => {
    const res = dbResoluciones.find((r) => r.ejercicio_id === e.id);
    const cat = dbCatedras.find((c) => c.id === e.catedra_id);
    const mat = cat ? dbMaterias.find((m) => m.id === cat.materia_id) : undefined;
    const fac = mat ? dbFacultades.find((f) => f.id === mat.facultad_id) : undefined;

    return {
      ...e,
      tiene_resolucion: !!res,
      votos_positivos: res?.votos_positivos || 0,
      votos_negativos: res?.votos_negativos || 0,
      estado_resolucion: res?.estado || 'sin_resolucion',
      catedra_nombre: cat?.nombre || 'Cátedra General',
      catedra_profesor: cat?.profesor || '',
      materia_nombre: mat?.nombre || '',
      facultad_siglas: fac?.siglas || '',
      es_mio: e.usuario_id_subio === user.id,
    };
  });

  res.json(enriched);
});

app.get('/api/ejercicios/:id', (req: Request, res: Response) => {
  const user = getOrCreateAnonUser(req);
  const ejercicio = dbEjercicios.find((e) => e.id === req.params.id);
  if (!ejercicio) {
    return res.status(404).json({ error: 'Ejercicio no encontrado' });
  }

  const resolucion = dbResoluciones.find((r) => r.ejercicio_id === ejercicio.id);
  const catedra = dbCatedras.find((c) => c.id === ejercicio.catedra_id);
  const materia = catedra ? dbMaterias.find((m) => m.id === catedra.materia_id) : undefined;
  const facultad = materia ? dbFacultades.find((f) => f.id === materia.facultad_id) : undefined;

  // Retrieve isolated vote for this anonymous browser session
  const miVoto = resolucion && dbVotosPorResolucion[resolucion.id]
    ? dbVotosPorResolucion[resolucion.id][user.id]
    : undefined;

  res.json({
    ...ejercicio,
    resolucion,
    catedra,
    materia,
    facultad,
    mi_voto: miVoto ? { tipo: miVoto.tipo, comentario: miVoto.comentario } : undefined,
  });
});

app.post('/api/ejercicios', (req: Request, res: Response) => {
  const { catedra_id, titulo, texto_ocr, imagen_url, tema } = req.body;
  const user = getOrCreateAnonUser(req);

  if (!catedra_id || !titulo || !texto_ocr) {
    return res.status(400).json({ error: 'Faltan campos obligatorios (cátedra, título, enunciado)' });
  }

  const catedra = dbCatedras.find((c) => c.id === catedra_id);
  if (!catedra) {
    return res.status(404).json({ error: 'Cátedra no válida' });
  }

  const nuevoEjercicio: Ejercicio = {
    id: `ej_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    catedra_id,
    usuario_id_subio: user.id,
    usuario_nombre: user.nombre,
    titulo: titulo.trim(),
    texto_ocr: texto_ocr.trim(),
    tema: tema || catedra.temas[0] || 'General',
    imagen_url: imagen_url || undefined,
    aprobado: true,
    fecha_subida: new Date().toISOString(),
  };

  dbEjercicios.unshift(nuevoEjercicio);
  scheduleSaveDb();
  res.status(201).json(nuevoEjercicio);
});

// Helper: Parse base64 and ensure strict MIME matching
function parseBase64Media(rawString: string, requestedMime?: string): { cleanBase64: string; mimeType: string } | null {
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

// -------------------------------------------------------------
// OCR Endpoint (Within Quota & Rate Limited)
// -------------------------------------------------------------
app.post('/api/ocr/extraer', async (req: Request, res: Response) => {
  const { imagen_base64, mime_type } = req.body;
  const user = getOrCreateAnonUser(req);

  // Rate Limiting per anonymous user
  if (!checkRateLimit(`ocr_${user.id}`, 8, 60000)) {
    return res.status(429).json({
      error: 'Límite de velocidad superado',
      mensaje: 'Demasiadas solicitudes en poco tiempo. Por favor esperá un minuto antes de reintentar.',
    });
  }

  // Cost Protection: Verify that free user has daily queries left before processing OCR with Gemini
  const queriesToday = getUserDailyQueries(user.id);
  if (user.plan !== 'premium' && queriesToday >= 3) {
    return res.status(429).json({
      error: 'Límite diario alcanzado',
      mensaje: 'Alcanzaste tu límite de 3 consultas gratuitas por hoy (horario de Argentina). Para cuidar los costos de IA del piloto, la extracción de OCR requiere cuota disponible.',
      limite_alcanzado: true,
    });
  }

  if (!imagen_base64) {
    return res.status(400).json({ error: 'Se requiere la imagen en base64' });
  }

  if (!aiClient) {
    return res.status(503).json({
      error: 'IA no disponible',
      texto_ocr: '',
      advertencia: 'IA no disponible. Podés transcribir o pegar el enunciado manualmente en el cuadro de texto.',
    });
  }

  const parsed = parseBase64Media(imagen_base64, mime_type);
  if (!parsed || !parsed.cleanBase64) {
    return res.status(400).json({ error: 'Formato de imagen base64 inválido' });
  }

  try {
    const response = await callGeminiGenerate([
      {
        inlineData: {
          mimeType: parsed.mimeType,
          data: parsed.cleanBase64,
        },
      },
      {
        text: 'Transcribe exactamente el enunciado de este ejercicio académico universitario. No lo resuelvas todavía. Solo extrae el texto completo, fórmulas matemáticas, variables y consignas con la máxima fidelidad.',
      },
    ]);

    const extractedText = response?.text?.trim() || '';
    if (extractedText) {
      return res.json({ texto_ocr: extractedText });
    }

    return res.json({
      texto_ocr: '',
      advertencia: 'No se detectó texto legible en el archivo. Podés transcribir el enunciado en el cuadro de texto.',
    });
  } catch (err: any) {
    if (err?.message === 'CAP_GLOBAL_ALCANZADO') {
      return res.status(503).json({
        error: 'Capacidad diaria del piloto alcanzada',
        mensaje: 'Se alcanzó el tope diario de seguridad de IA del piloto universitario (horario Argentina). Podés ingresar el enunciado manualmente.',
      });
    }
    console.error('Error in OCR extraction:', err?.message || err);
    return res.status(503).json({
      error: 'IA no disponible',
      texto_ocr: '',
      advertencia: 'IA no disponible para procesar el archivo en este momento. Podés ingresar el enunciado manualmente.',
    });
  }
});

// -------------------------------------------------------------
// Resoluciones & AI Solving Engine
// -------------------------------------------------------------
app.post('/api/resoluciones/generar', async (req: Request, res: Response) => {
  const { ejercicio_id, catedra_id, enunciado, titulo, tema, imagen_base64, mime_type } = req.body;
  const user = getOrCreateAnonUser(req);

  // Rate Limiting per anonymous user
  if (!checkRateLimit(`solve_${user.id}`, 6, 60000)) {
    return res.status(429).json({
      error: 'Límite de velocidad superado',
      mensaje: 'Por favor aguardá un minuto entre resoluciones sucesivas.',
    });
  }

  // 1. Quota check
  const esPremium = user.plan === 'premium';
  const queriesToday = getUserDailyQueries(user.id);
  if (!esPremium && queriesToday >= 3) {
    return res.status(429).json({
      error: 'Límite diario alcanzado',
      mensaje: 'Alcanzaste tu límite de 3 consultas gratuitas por hoy (horario de Argentina). Uníte a la lista de espera Premium o volvé a consultar mañana.',
      limite_alcanzado: true,
    });
  }

  if (!aiClient) {
    return res.status(503).json({
      error: 'IA no disponible',
      mensaje: 'IA no disponible. No se pudo conectar con el servicio de resolución.',
    });
  }

  // 2. Identify Cátedra
  const targetCatedraId = catedra_id || (ejercicio_id ? dbEjercicios.find((e) => e.id === ejercicio_id)?.catedra_id : undefined);
  const catedra = dbCatedras.find((c) => c.id === targetCatedraId) || dbCatedras[0];
  const materia = dbMaterias.find((m) => m.id === catedra.materia_id);
  const facultad = materia ? dbFacultades.find((f) => f.id === materia.facultad_id) : undefined;

  const selectedTema = (tema && typeof tema === 'string' && tema.trim())
    ? tema.trim()
    : (ejercicio_id ? dbEjercicios.find((e) => e.id === ejercicio_id)?.tema : undefined)
    || catedra.temas[0]
    || 'General';

  let finalEjercicioId = ejercicio_id;
  let statementText = enunciado;
  let candidateEj: Ejercicio | null = null;

  if (ejercicio_id) {
    const existingEj = dbEjercicios.find((e) => e.id === ejercicio_id);
    if (existingEj) {
      if (!statementText) {
        statementText = existingEj.texto_ocr;
      }
    }
  } else {
    candidateEj = {
      id: `ej_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      catedra_id: catedra.id,
      usuario_id_subio: user.id,
      usuario_nombre: user.nombre,
      titulo: titulo || `Ejercicio de ${materia?.nombre || 'la Cátedra'}`,
      texto_ocr: statementText || 'Ejercicio sin enunciado textual',
      tema: selectedTema,
      aprobado: true,
      fecha_subida: new Date().toISOString(),
    };
    finalEjercicioId = candidateEj.id;
  }

  try {
    const prompt = `Actúa como el profesor titular y jefe de trabajos prácticos de la siguiente cátedra universitaria argentina:
Universidad / Facultad: ${facultad?.siglas || 'Universidad Nacional'} - ${facultad?.nombre || ''}
Materia: ${materia?.nombre || ''}
Cátedra: ${catedra.nombre} (Titular: ${catedra.profesor})
Tema específico a resolver: ${selectedTema}
Estilo Metodológico y Criterios Oficiales de la Cátedra:
${catedra.estilo_metodologico}

Criterios clave irrenunciables:
${catedra.criterios_clave.map((c) => `- ${c}`).join('\n')}

Consejos / Advertencias de examen de la cátedra:
${(catedra.consejos_examen || []).map((c) => `- ${c}`).join('\n')}

ENUNCIADO DEL EJERCICIO:
${statementText || 'Analizar y resolver el ejercicio adjunto en la imagen según el criterio metodológico.'}

INSTRUCCIONES DE RESOLUCIÓN:
1. Resuelve el ejercicio ESTRICTAMENTE respetando los métodos, notaciones y criterios específicos de esta cátedra.
2. Desglosa la resolución en pasos didácticos y rigurosos correspondientes al tema "${selectedTema}".
3. Para cada paso proporciona:
   - numero: entero secuencial (1, 2, 3...)
   - titulo: nombre claro del paso
   - explicacion: fundamentación conceptual según la cátedra
   - desarrollo_matematico: fórmulas matemáticas en formato LaTeX legible (ej: $...$ o fórmulas en líneas claras)
   - justificacion_catedra: por qué se aplica este método específico en esta cátedra
   - advertencia_examen: qué error típico desaprueba el parcial en este paso (opcional)`;

    let contentsPayload: any = prompt;
    if (imagen_base64) {
      const parsedMedia = parseBase64Media(imagen_base64, mime_type);
      if (parsedMedia && parsedMedia.cleanBase64) {
        contentsPayload = {
          parts: [
            {
              inlineData: {
                mimeType: parsedMedia.mimeType,
                data: parsedMedia.cleanBase64,
              },
            },
            {
              text: prompt,
            },
          ],
        };
      }
    }

    const solveSchema = {
      type: Type.OBJECT,
      properties: {
        resumen_criterio: {
          type: Type.STRING,
          description: 'Resumen sintético de qué métodos y criterios de la cátedra se aplicaron para llegar al resultado.',
        },
        resultado_final: {
          type: Type.STRING,
          description: 'Expresión final simplificada enmarcada (ej: x = 4 o [-\\infty, 2)).',
        },
        pasos: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              numero: { type: Type.INTEGER },
              titulo: { type: Type.STRING },
              explicacion: { type: Type.STRING },
              desarrollo_matematico: { type: Type.STRING },
              justificacion_catedra: { type: Type.STRING },
              advertencia_examen: { type: Type.STRING },
            },
            required: ['numero', 'titulo', 'explicacion', 'desarrollo_matematico', 'justificacion_catedra'],
          },
        },
      },
      required: ['resumen_criterio', 'resultado_final', 'pasos'],
    };

    let response: any;
    try {
      response = await callGeminiGenerate(contentsPayload, {
        responseMimeType: 'application/json',
        responseSchema: solveSchema,
      });
    } catch (geminiErr: any) {
      if (geminiErr?.message === 'CAP_GLOBAL_ALCANZADO') {
        throw new Error('CAP_GLOBAL_ALCANZADO');
      }
      console.warn('Multimodal resolution failed, retrying with text prompt:', geminiErr?.message || geminiErr);
      response = await callGeminiGenerate(prompt, {
        responseMimeType: 'application/json',
        responseSchema: solveSchema,
      });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(response?.text || '{}');
    } catch {
      throw new Error('La respuesta de la IA no tuvo un formato JSON interpretable.');
    }

    if (!parsed || !Array.isArray(parsed.pasos) || parsed.pasos.length === 0) {
      throw new Error('La IA no generó pasos de resolución válidos.');
    }

    const cleanedSummary = (parsed.resumen_criterio || '').trim();
    const cleanedResult = (parsed.resultado_final || '').trim();

    if (!cleanedSummary || !cleanedResult) {
      throw new Error('La IA no devolvió un resultado final concluyente o resumen de criterio.');
    }

    const validSteps: PasoResolucion[] = (parsed.pasos || [])
      .map((p: any, idx: number) => ({
        numero: p.numero || idx + 1,
        titulo: (p.titulo || `Paso ${idx + 1}`).trim(),
        explicacion: (p.explicacion || '').trim(),
        desarrollo_matematico: (p.desarrollo_matematico || '').trim(),
        justificacion_catedra: (p.justificacion_catedra || catedra.criterios_clave[0] || '').trim(),
        advertencia_examen: (p.advertencia_examen || '').trim() || undefined,
      }))
      .filter((p: PasoResolucion) => p.titulo && (p.explicacion || p.desarrollo_matematico));

    if (validSteps.length === 0) {
      throw new Error('Los pasos de resolución recibidos estaban vacíos.');
    }

    // Persist new exercise only upon validated AI success
    if (candidateEj) {
      dbEjercicios.unshift(candidateEj);
    }

    const nuevaResolucion: Resolucion = {
      id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ejercicio_id: finalEjercicioId,
      resumen_criterio: cleanedSummary,
      resultado_final: cleanedResult,
      votos_positivos: 1,
      votos_negativos: 0,
      estado: 'aprobada',
      fecha_generada: new Date().toISOString(),
      contenido_paso_a_paso: validSteps,
    };

    dbResoluciones = dbResoluciones.filter((r) => r.ejercicio_id !== finalEjercicioId);
    dbResoluciones.push(nuevaResolucion);

    // Increment user quota only after validated success
    checkAndIncrementUserDailyQuota(user.id, esPremium);
    scheduleSaveDb();

    res.status(201).json(nuevaResolucion);
  } catch (error: any) {
    if (error?.message === 'CAP_GLOBAL_ALCANZADO') {
      return res.status(503).json({
        error: 'Capacidad diaria del piloto alcanzada',
        mensaje: 'Se alcanzó el tope diario de seguridad de IA del piloto universitario (horario Argentina) para proteger los créditos de la cuenta.',
      });
    }
    console.error('Error generating resolution:', error);
    res.status(503).json({
      error: 'IA no disponible',
      mensaje: 'IA no disponible. No se pudo generar la resolución con IA en este momento. Verificá tu conexión o reintentá más tarde.',
      details: error?.message || String(error),
    });
  }
});

// -------------------------------------------------------------
// Reliable Voting System: 1 Vote Per Anon Browser & Discrepancy Log
// -------------------------------------------------------------
app.post('/api/resoluciones/:id/votar', (req: Request, res: Response) => {
  const { id } = req.params;
  const { tipo, comentario } = req.body; // 'positivo' | 'negativo'
  const user = getOrCreateAnonUser(req);

  const resolucion = dbResoluciones.find((r) => r.id === id);
  if (!resolucion) {
    return res.status(404).json({ error: 'Resolución no encontrada' });
  }

  if (tipo !== 'positivo' && tipo !== 'negativo') {
    return res.status(400).json({ error: 'Tipo de voto inválido. Usar positivo o negativo.' });
  }

  if (!dbVotosPorResolucion[id]) {
    dbVotosPorResolucion[id] = {};
  }

  // Store or update vote for this specific anonymous browser
  const cleanComment = typeof comentario === 'string' ? comentario.trim() : undefined;
  dbVotosPorResolucion[id][user.id] = {
    anon_user_id: user.id,
    resolucion_id: id,
    tipo,
    comentario: cleanComment,
    fecha: new Date().toISOString(),
  };

  // Recalculate unique votes
  const allVotes = Object.values(dbVotosPorResolucion[id]);
  const positivos = allVotes.filter((v) => v.tipo === 'positivo').length;
  const negativos = allVotes.filter((v) => v.tipo === 'negativo').length;

  resolucion.votos_positivos = Math.max(1, positivos);
  resolucion.votos_negativos = negativos;

  if (negativos >= 2 && negativos > positivos) {
    resolucion.estado = 'en_revision';
  } else {
    resolucion.estado = 'aprobada';
  }

  scheduleSaveDb();

  res.json({
    id: resolucion.id,
    votos_positivos: resolucion.votos_positivos,
    votos_negativos: resolucion.votos_negativos,
    estado: resolucion.estado,
    mi_voto: {
      tipo,
      comentario: cleanComment,
    },
    mensaje: tipo === 'positivo'
      ? '¡Voto registrado! Confirmaste que coincide con el criterio de tu cátedra.'
      : 'Voto y discrepancia guardados. Esto ayuda a recalibrar el criterio oficial.',
  });
});

// -------------------------------------------------------------
// Consultas Restantes Hoy (Argentina Timezone)
// -------------------------------------------------------------
app.get('/api/consultas/restantes-hoy', (req: Request, res: Response) => {
  const user = getOrCreateAnonUser(req);
  const usadas = getUserDailyQueries(user.id);
  const esPremium = user.plan === 'premium';
  const limite = 3;
  const restantes = esPremium ? 9999 : Math.max(0, limite - usadas);

  res.json({
    limite,
    usadas,
    restantes,
    es_premium: esPremium,
    usuario_nombre: user.nombre,
    zona_horaria: 'America/Argentina/Buenos_Aires',
    fecha_hoy: getTodayArgentinaString(),
  });
});

// -------------------------------------------------------------
// Honest Willingness-to-Pay: Waitlist & Feedback (No Fake Payments)
// -------------------------------------------------------------
app.post('/api/waitlist', (req: Request, res: Response) => {
  const { email, plan_interes = 'cuatrimestral', catedra_id, catedra_nombre } = req.body;
  const user = getOrCreateAnonUser(req);

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Ingresá un correo electrónico válido' });
  }

  const existing = dbListaEspera.find(
    (e) => e.email.toLowerCase() === email.toLowerCase() && e.plan_interes === plan_interes
  );

  if (existing) {
    return res.json({
      success: true,
      mensaje: 'Ya estabas anotado en la lista de espera con este plan. ¡Muchas gracias por tu interés!',
      registro: existing,
    });
  }

  const entry: ListaEsperaEntry = {
    id: `wait_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    email: email.trim().toLowerCase(),
    plan_interes,
    catedra_id: catedra_id || undefined,
    catedra_nombre: catedra_nombre || undefined,
    anon_user_id: user.id,
    fecha: new Date().toISOString(),
  };

  dbListaEspera.unshift(entry);
  scheduleSaveDb();

  res.status(201).json({
    success: true,
    mensaje: '¡Listo! Quedaste registrado en la lista de espera prioritaria sin ningún cargo. Te avisaremos cuando habilitemos los pagos oficiales.',
    registro: entry,
  });
});

app.get('/api/suscripciones/estado', (req: Request, res: Response) => {
  const user = getOrCreateAnonUser(req);
  const sub = dbSuscripciones.find((s) => s.usuario_id === user.id && s.estado === 'activa');

  res.json({
    plan: user.plan,
    es_premium: user.plan === 'premium',
    suscripcion: sub || null,
  });
});

app.post('/api/suscripciones/cancelar', (req: Request, res: Response) => {
  const user = getOrCreateAnonUser(req);
  user.plan = 'free';
  scheduleSaveDb();
  res.json({ success: true, usuario: user });
});

// -------------------------------------------------------------
// Vite Middleware / Static Serving Setup
// -------------------------------------------------------------
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CátedraIA server running on http://0.0.0.0:${PORT} (Timezone: America/Argentina/Buenos_Aires)`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
