import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { environment } from '../../environments/environment';

export const app = initializeApp(environment.firebaseConfig);
export const auth = getAuth(app);
export const authPersistenceReady = setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn('[Firebase] Failed to set auth persistence:', error);
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export const db = (() => {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch (error) {
    console.warn('[Firebase] Persistent Firestore cache unavailable, falling back to memory cache:', error);
    return initializeFirestore(app, {
      localCache: memoryLocalCache(),
    });
  }
})();


