import { cert, getApps, initializeApp, applicationDefault, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    return null;
  }

  const parsed = JSON.parse(raw) as ServiceAccount;
  if (parsed.private_key) {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }
  return parsed;
}

function initAdmin() {
  if (getApps().length) {
    return getApps()[0]!;
  }

  const serviceAccount = loadServiceAccount();

  if (serviceAccount) {
    return initializeApp({
      credential: cert(serviceAccount)
    });
  }

  return initializeApp({
    credential: applicationDefault()
  });
}

export const firebaseAdminApp = initAdmin();
export const adminAuth = getAuth(firebaseAdminApp);
export const adminDb = getFirestore(firebaseAdminApp);
