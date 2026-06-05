import {
  addDoc,
  collection,
  serverTimestamp
} from "firebase/firestore";

import {
  firebaseDb
} from "@/lib/firebase/client";

export async function createNotification(
  userId: string,
  title: string,
  body: string,
  type:
    | "system"
    | "payment"
    | "escrow"
    | "refund"
    | "dispute"
    | "admin"
) {
  return addDoc(
    collection(
      firebaseDb(),
      "notifications"
    ),
    {
      userId,
      title,
      body,
      type,
      read: false,
      createdAt: serverTimestamp()
    }
  );
}
