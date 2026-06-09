import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "AIzaSyCtk2xdAX5W98pGAgHnZ12d2ZdVEHQZUAQ",
  authDomain:        "sisauang.firebaseapp.com",
  projectId:         "sisauang",
  storageBucket:     "sisauang.firebasestorage.app",
  messagingSenderId: "371688435932",
  appId:             "1:371688435932:web:fed6bc5b0d7353d4f7c419",
};

const app = initializeApp(firebaseConfig);

export const auth           = getAuth(app);
export const db             = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const loginGoogle    = () => signInWithPopup(auth, googleProvider);
export const logoutUser     = () => signOut(auth);
export { onAuthStateChanged };
