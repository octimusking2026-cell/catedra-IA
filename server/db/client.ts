import { initializeApp, getApps, getApp, cert, applicationDefault } from 'firebase-admin/app';
import type { ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: {
  projectId?: string;
  firestoreDatabaseId?: string;
  [key: string]: any;
} = {};

if (fs.existsSync(configPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (err) {
    console.error('Error reading firebase-applet-config.json:', err);
  }
}

// Credencial secreta: SOLO por variable de entorno (Secrets), nunca en archivos.
function loadServiceAccount(): Record<string, any> | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64?.trim();

  let json: string | undefined;
  if (raw) {
    json = raw;
  } else if (b64) {
    if (b64.startsWith('{')) {
      // Robust fallback: if it already starts with '{', it's raw JSON rather than base64.
      json = b64;
    } else {
      json = Buffer.from(b64, 'base64').toString('utf-8');
    }
  }
  if (!json) return null;

  let parsed: Record<string, any>;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT / FIREBASE_SERVICE_ACCOUNT_B64 no contiene un JSON válido.'
    );
  }

  if (typeof parsed.private_key === 'string') {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  }
  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error('La clave de servicio está incompleta (faltan project_id, client_email o private_key).');
  }
  return parsed;
}

const serviceAccount = loadServiceAccount();

const projectId: string | undefined =
  serviceAccount?.project_id || firebaseConfig.projectId || process.env.GOOGLE_CLOUD_PROJECT;

if (!projectId) {
  throw new Error('No se pudo resolver el projectId de Firebase.');
}

if (firebaseConfig.projectId && firebaseConfig.projectId !== projectId) {
  console.error(
    `[Firebase] ATENCIÓN: firebase-applet-config.json apunta a "${firebaseConfig.projectId}" ` +
      `pero el servidor usa "${projectId}". El login con Google va a fallar hasta que coincidan.`
  );
}

if (!serviceAccount) {
  console.error(
    '[Firebase] No hay FIREBASE_SERVICE_ACCOUNT configurada: se usan credenciales por defecto del entorno ' +
      '(pueden no tener permisos sobre Firestore → error 7 PERMISSION_DENIED).'
  );
}

if (!getApps().length) {
  initializeApp({
    projectId,
    credential: serviceAccount ? cert(serviceAccount as ServiceAccount) : applicationDefault(),
  });
}

const adminApp = getApp();

const databaseId: string =
  serviceAccount && serviceAccount.project_id !== firebaseConfig.projectId
    ? '(default)'
    : (firebaseConfig.firestoreDatabaseId || '(default)');

export const db =
  databaseId === '(default)' ? getFirestore(adminApp) : getFirestore(adminApp, databaseId);

export const adminAuth = getAuth(adminApp);

// Si firebaseConfig tiene un projectId distinto al del serviceAccount, inicializar una app secundaria para verificar tokens de ese proyecto
export let clientAppAuth: any = null;
if (firebaseConfig.projectId && firebaseConfig.projectId !== projectId) {
  try {
    const existing = getApps().find((a) => a.name === 'client-web-app');
    const clientApp = existing || initializeApp({ projectId: firebaseConfig.projectId }, 'client-web-app');
    clientAppAuth = getAuth(clientApp);
  } catch (err) {
    console.warn('[Firebase] No se pudo inicializar clientAppAuth secundario:', err);
  }
}

console.log(
  `[Firestore Client Startup] PROJECT_ID="${projectId}" DATABASE_ID="${databaseId}" ` +
    `CREDENTIAL=${serviceAccount ? `service-account (${serviceAccount.client_email})` : 'application-default'}`
);

export { adminApp, projectId, databaseId, firebaseConfig };
