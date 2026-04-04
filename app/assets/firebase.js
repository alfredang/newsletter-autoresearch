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

const firebaseConfig = window.FIREBASE_CONFIG;

if (!firebaseConfig || !firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error(
    "Firebase config is missing. Copy firebase-config.example.js to firebase-config.js and fill your Firebase values."
  );
}

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
