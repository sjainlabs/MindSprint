import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { environment } from '../../environments/environment';

export const app = initializeApp(environment.firebaseConfig);
export const auth = getAuth(app);
void setPersistence(auth, browserLocalPersistence);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters(
  environment.googleOAuthClientId
    ? {
        client_id: environment.googleOAuthClientId,
        prompt: 'select_account',
      }
    : {
        prompt: 'select_account',
      },
);

export const db = getFirestore(app);

// Enable offline persistence for Firestore
void enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a time
    console.log('[Firebase] Multiple tabs detected - offline persistence disabled in this tab');
  } else if (err.code === 'unimplemented') {
    // The current browser does not support offline persistence
    console.log('[Firebase] Browser does not support offline persistence');
  }
  // For any other errors, just log and continue
});


