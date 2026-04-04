import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCmQTYGuHZfHQf5yOqzNDC04WSNShxa_-w",
  authDomain: "novaresearch-75a0e.firebaseapp.com",
  projectId: "novaresearch-75a0e",
  storageBucket: "novaresearch-75a0e.firebasestorage.app",
  messagingSenderId: "1089882165756",
  appId: "1:1089882165756:web:ee338dcddd8c94a7fea279",
  measurementId: "G-DSQPBFGJJQ",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();

export function onAuthChange(handler) {
  return onAuthStateChanged(auth, handler);
}

export async function signInWithGoogle() {
  const credential = await signInWithPopup(auth, googleProvider);
  await upsertUserProfile(credential.user);
  return credential.user;
}

export function signOutUser() {
  return signOut(auth);
}

export async function upsertUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const existing = await getDoc(userRef);
  const base = {
    name: user.displayName || "User",
    email: user.email || "",
    image: user.photoURL || "",
    updatedAt: serverTimestamp(),
  };

  if (!existing.exists()) {
    await setDoc(userRef, {
      ...base,
      createdAt: serverTimestamp(),
    });
    return;
  }

  await updateDoc(userRef, base);
}

export {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
};
