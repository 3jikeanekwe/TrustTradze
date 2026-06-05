import {
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
  collection,
  addDoc
} from "firebase/firestore";

import {
  firebaseDb
} from "@/lib/firebase/client";

import {
  createNotification
} from "@/lib/notifications";

export async function promoteToAdmin(
  actorUid: string,
  targetUid: string
) {
  const db = firebaseDb();

  const actorRef = doc(
    db,
    "users",
    actorUid
  );

  const actorSnap =
    await getDoc(actorRef);

  if (
    !actorSnap.exists() ||
    actorSnap.data().role !==
      "super_admin"
  ) {
    throw new Error(
      "Unauthorized"
    );
  }

  await updateDoc(
    doc(db, "users", targetUid),
    {
      role: "admin",
      updatedAt:
        serverTimestamp()
    }
  );

  await addDoc(
    collection(
      db,
      "admin_logs"
    ),
    {
      actorUid,
      targetUid,
      action:
        "promote_admin",
      createdAt:
        serverTimestamp()
    }
  );

  await createNotification(
    targetUid,
    "Admin Access Granted",
    "Your account is now an admin account.",
    "admin"
  );
}

export async function removeAdmin(
  actorUid: string,
  targetUid: string
) {
  const db = firebaseDb();

  const actorRef = doc(
    db,
    "users",
    actorUid
  );

  const actorSnap =
    await getDoc(actorRef);

  if (
    !actorSnap.exists() ||
    actorSnap.data().role !==
      "super_admin"
  ) {
    throw new Error(
      "Unauthorized"
    );
  }

  await updateDoc(
    doc(db, "users", targetUid),
    {
      role: "user",
      updatedAt:
        serverTimestamp()
    }
  );

  await addDoc(
    collection(
      db,
      "admin_logs"
    ),
    {
      actorUid,
      targetUid,
      action:
        "remove_admin",
      createdAt:
        serverTimestamp()
    }
  );
}
