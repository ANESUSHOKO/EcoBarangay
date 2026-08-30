import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import config from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(config) : getApp();

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      experimentalAutoDetectLongPolling: true,
    },
    config.firestoreDatabaseId || undefined
  );
} catch (e) {
  firestoreInstance = getFirestore(app, config.firestoreDatabaseId || undefined);
}

export const db = firestoreInstance;
export const storage = getStorage(app);

