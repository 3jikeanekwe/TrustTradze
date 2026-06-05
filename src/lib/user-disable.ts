import {
  doc,
  updateDoc,
  getDoc
} from "firebase/firestore";

import {
  firebaseDb
} from "@/lib/firebase/client";

export async function disableUser(
  actorUid: string,
  targetUid: string
) {
  const db = firebaseDb();

  const actor =
    await getDoc(
      doc(
        db,
        "users",
        actorUid
      )
    );

  const role =
    actor.data()?.role;

  if (
    role !== "admin" &&
    role !==
      "super_admin"
  ) {
    throw new Error(
      "Unauthorized"
    );
  }

  await updateDoc(
    doc(
      db,
      "users",
      targetUid
    ),
    {
      isDisabled: true
    }
  );
}

export async function enableUser(
  actorUid: string,
  targetUid: string
) {
  const db = firebaseDb();

  const actor =
    await getDoc(
      doc(
        db,
        "users",
        actorUid
      )
    );

  const role =
    actor.data()?.role;

  if (
    role !== "admin" &&
    role !==
      "super_admin"
  ) {
    throw new Error(
      "Unauthorized"
    );
  }

  await updateDoc(
    doc(
      db,
      "users",
      targetUid
    ),
    {
      isDisabled: false
    }
  );
}
