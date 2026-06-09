import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "FILL_IN",
  authDomain:        "FILL_IN",
  projectId:         "FILL_IN",
  storageBucket:     "FILL_IN",
  messagingSenderId: "FILL_IN",
  appId:             "FILL_IN",
};

const app = initializeApp(firebaseConfig);

export const auth           = getAuth(app);
export const db             = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const loginGoogle    = () => signInWithPopup(auth, googleProvider);
export const logoutUser     = () => signOut(auth);
export { onAuthStateChanged };
