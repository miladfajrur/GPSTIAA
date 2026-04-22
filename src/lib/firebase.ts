import { initializeApp } from 'firebase/app';
import { getFirestore, memoryLocalCache, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Use memory cache to avoid IndexedDB locking issues in iframes
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache()
}, firebaseConfig.firestoreDatabaseId);

export const storage = getStorage(app);
export const auth = getAuth(app);
