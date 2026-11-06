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
