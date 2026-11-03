import 'dotenv/config';
import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

type FirebaseConfig = {
  projectId: string;
  firestoreDatabaseId?: string;
};

function parseServiceAccount(value: string): ServiceAccount {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT must contain valid service-account JSON.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT must contain a JSON object.');
  }

  const account = parsed as Record<string, unknown>;
  const projectId = account.project_id ?? account.projectId;
  const clientEmail = account.client_email ?? account.clientEmail;
  const privateKey = account.private_key ?? account.privateKey;
  if (typeof projectId !== 'string' || typeof clientEmail !== 'string' || typeof privateKey !== 'string') {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is missing project ID, client email, or private key.');
  }

  return {
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'),
  };
}

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
if (!fs.existsSync(configPath)) {
  throw new Error('firebase-applet-config.json is required to initialize Firebase Admin.');
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as FirebaseConfig;
const useEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
const useProductionData = process.env.FIREBASE_DATA_MODE === 'production';
// `NETLIFY` is only set during builds, so also detect the Functions (Lambda) runtime.
const isNetlifyRuntime = process.env.NETLIFY === 'true' ||
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);

if (isNetlifyRuntime && useEmulator) {
  throw new Error('Firebase Emulator variables must not be set in the Netlify production environment.');
}
if (useProductionData && (
  useEmulator ||
  Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST) ||
  process.env.VITE_USE_FIREBASE_EMULATORS === 'true'
)) {
  throw new Error('Emulator settings conflict with FIREBASE_DATA_MODE=production. Unset emulator variables before using real Firebase.');
}
if (useProductionData && !serviceAccountJson && !credentialsPath) {
  throw new Error('Real Firebase mode requires GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT.');
}
if (useProductionData && credentialsPath && !fs.existsSync(credentialsPath)) {
  throw new Error(`Firebase service-account file was not found at GOOGLE_APPLICATION_CREDENTIALS: ${credentialsPath}`);
}
if (isNetlifyRuntime && !serviceAccountJson) {
  throw new Error('Set FIREBASE_SERVICE_ACCOUNT in Netlify environment variables for Firebase Admin access.');
}

const projectId = useEmulator
  ? process.env.GCLOUD_PROJECT || 'demo-ecobarangay'
  : config.projectId;
const serviceAccount = serviceAccountJson ? parseServiceAccount(serviceAccountJson) : undefined;
if (serviceAccount?.projectId && serviceAccount.projectId !== projectId) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT project does not match firebase-applet-config.json.');
}

const app = getApps()[0] || initializeApp({
  projectId,
  ...(serviceAccount && !useEmulator ? { credential: cert(serviceAccount) } : {}),
});

export const firestoreDb = getFirestore(
  app,
  useEmulator ? undefined : config.firestoreDatabaseId || undefined,
);
export const firebaseAuth = getAuth(app);

console.log(
  useEmulator
    ? `Firebase Admin initialized with local emulators for project ${projectId}.`
    : `Firebase Admin initialized for database ${config.firestoreDatabaseId || '(default)'}.`,
);
