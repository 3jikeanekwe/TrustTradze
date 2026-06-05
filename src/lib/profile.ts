import {
  doc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";

import {
  firebaseDb
} from "@/lib/firebase/client";

export async function updateProfile(
  uid: string,
  data: {
    fullName?: string;
    phoneNumber?: string;
    state?: string;
    city?: string;
  }
) {
  await updateDoc(
    doc(firebaseDb(), "users", uid),
    {
      ...data,
      updatedAt: serverTimestamp()
    }
  );
}
