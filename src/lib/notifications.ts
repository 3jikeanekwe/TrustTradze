import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";

import { firebaseDb } from "@/lib/firebase/client";

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
  return addDoc(collection(firebaseDb(), "notifications"), {
    userId,
    title,
    body,
    type,
    read: false,
    createdAt: serverTimestamp()
  });
}

export async function markNotificationAsRead(notificationId: string) {
  await updateDoc(doc(firebaseDb(), "notifications", notificationId), {
    read: true
  });
}

export async function markAllNotificationsAsRead(userId: string) {
  const db = firebaseDb();

  const snapshot = await getDocs(
    query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("read", "==", false),
      orderBy("createdAt", "desc"),
      limit(200)
    )
  );

  await Promise.all(
    snapshot.docs.map((item) =>
      updateDoc(item.ref, {
        read: true
      })
    )
  );
}

export async function getLatestNotifications(userId: string) {
  const db = firebaseDb();

  const snapshot = await getDocs(
    query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(20)
    )
  );

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
}
