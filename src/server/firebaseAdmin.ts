import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

let firestoreDb: ReturnType<typeof getFirestore> | null = null;

try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (!getApps().length) {
      initializeApp({
        projectId: config.projectId,
      });
    }
    firestoreDb = getFirestore(config.firestoreDatabaseId || undefined);
    console.log('Firebase Admin Firestore initialized successfully for database:', config.firestoreDatabaseId);
  } else {
    console.warn('firebase-applet-config.json not found, skipping Firebase Admin initialization');
  }
} catch (err) {
  console.error('Failed to initialize Firebase Admin:', err);
}

export { firestoreDb };
