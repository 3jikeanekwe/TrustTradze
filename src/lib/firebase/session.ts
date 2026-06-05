import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/collections";
import type { UserProfile } from "@/types/user";

export const SESSION_COOKIE_NAME = "trusttradze_session";
const SESSION_EXPIRES_IN_MS = 1000 * 60 * 60 * 24 * 5;

export async function createSessionCookie(idToken: string) {
  return adminAuth.createSessionCookie(idToken, {
    expiresIn: SESSION_EXPIRES_IN_MS
  });
}

export async function verifySessionCookie(sessionCookie: string) {
  return adminAuth.verifySessionCookie(sessionCookie, true);
}

export async function getServerSessionProfile(): Promise<UserProfile | null> {
  const sessionCookie = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await verifySessionCookie(sessionCookie);
    const snap = await adminDb.collection(COLLECTIONS.USERS).doc(decoded.uid).get();

    if (!snap.exists) return null;

    return snap.data() as UserProfile;
  } catch {
    return null;
  }
}
