import { initializeApp, getApps, getApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import config from '../../firebase-applet-config.json';

const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
const app = !getApps().length
  ? initializeApp({ ...config, ...(useEmulators ? { projectId: 'demo-ecobarangay' } : {}) })
  : getApp();

export const storage = getStorage(app);
export const auth = getAuth(app);
export const db = getFirestore(app, config.firestoreDatabaseId);

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
}

// Validate connection to Firestore on initial boot
async function testConnection() {
  try {
    await import('firebase/firestore').then(({ doc, getDocFromServer }) =>
      getDocFromServer(doc(db, 'test', 'connection'))
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Please check your Firebase configuration.');
    }
  }
}
testConnection();
