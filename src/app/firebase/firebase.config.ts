import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { environment } from '../../environments/environment';

export const app = initializeApp(environment.firebaseConfig);
export const auth = getAuth(app);
// export const authPersistenceReady =
  setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn('[Firebase] Failed to set auth persistence:', error);
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

let dbInstance: ReturnType<typeof initializeFirestore> | null = null;
// initializeFirestore may only be called once per app; later calls with any options throw
export const db = () => {
  if (dbInstance) return dbInstance;
  try {
    dbInstance = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch (error) {
    console.warn('[Firebase] Persistent Firestore cache unavailable, falling back to memory cache:', error);
    dbInstance = initializeFirestore(app, {
      localCache: memoryLocalCache(),
    });
  }
  return dbInstance;
};


