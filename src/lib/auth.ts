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
import { buildSearchKeywords } from "@/lib/marketplace";

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
    searchKeywords: buildSearchKeywords([fullName, email]),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return credential;
}

export async function loginUser(email: string, password: string) {
  const auth = firebaseAuth();
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logoutUser() {
  await signOut(firebaseAuth());

  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch {
    // Session cookie will expire; this is just a cleanup step.
  }
}

export async function forgotPassword(email: string) {
  return sendPasswordResetEmail(firebaseAuth(), email);
}

export async function getUserProfile(uid: string) {
  const db = firebaseDb();
  const snapshot = await getDoc(doc(db, "users", uid));

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data();
}

export async function createServerSessionForCurrentUser() {
  const auth = firebaseAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("No authenticated user found.");
  }

  const idToken = await currentUser.getIdToken();

  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ idToken })
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    throw new Error(
      payload?.error ?? "Unable to establish secure session."
    );
  }
}
