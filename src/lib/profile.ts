import {
  doc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";

import {
  firebaseDb
} from "@/lib/firebase/client";
import { buildSearchKeywords } from "@/lib/marketplace";

export async function updateProfile(
  uid: string,
  email: string,
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
      searchKeywords: buildSearchKeywords([
        data.fullName ?? "",
        email,
        data.phoneNumber ?? "",
        data.state ?? "",
        data.city ?? ""
      ]),
      updatedAt: serverTimestamp()
    }
  );
}
