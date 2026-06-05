import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  UserCredential
} from "firebase/auth";

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

import { firebaseAuth, firebaseDb } from "@/lib/firebase/client";
import { SUPER_ADMIN_EMAIL } from "@/lib/constants";

export async function registerUser(
  fullName: string,
  email: string,
  password: string
): Promise<UserCredential> {
  const auth = firebaseAuth();
  const db = firebaseDb();

  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  const role =
    email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
      ? "super_admin"
      : "user";

  // Updated user document creation
  await setDoc(doc(db, "users", credential.user.uid), {
    uid: credential.user.uid,
    email,
    fullName,
    role,
    avatarUrl: null,
    phoneNumber: null,
    city: null,
    state: null,
    bankAccount: null,
    isDisabled: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return credential;
}

export async function loginUser(
  email: string,
  password: string
) {
  const auth = firebaseAuth();

  return signInWithEmailAndPassword(
    auth,
    email,
    password
  );
}

export async function logoutUser() {
  return signOut(firebaseAuth());
}

export async function forgotPassword(email: string) {
  return sendPasswordResetEmail(
    firebaseAuth(),
    email
  );
}

export async function getUserProfile(uid: string) {
  const db = firebaseDb();

  const snapshot = await getDoc(
    doc(db, "users", uid)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data();
}
