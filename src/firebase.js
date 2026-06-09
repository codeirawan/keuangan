import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

export const configValid = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

let auth, db, googleProvider;

if (configValid) {
  const app   = initializeApp(firebaseConfig);
  auth         = getAuth(app);
  db           = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  googleProvider = new GoogleAuthProvider();
}

export { auth, db, googleProvider };
export const loginGoogle       = () => signInWithRedirect(auth, googleProvider);
export const getLoginRedirect  = () => getRedirectResult(auth);
export const logoutUser  = () => signOut(auth);
export { onAuthStateChanged };
