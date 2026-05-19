import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { environment } from '../../environments/environment';

export const app = initializeApp(environment.firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  client_id: environment.googleOAuthClientId,
  prompt: 'select_account',
});
export const db = getFirestore(app);
