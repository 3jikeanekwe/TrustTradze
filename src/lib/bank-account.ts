import {
  doc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";

import {
  firebaseDb
} from "@/lib/firebase/client";

export async function saveBankAccount(
  uid: string,
  bankData: {
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    recipientCode: string;
  }
) {
  await updateDoc(
    doc(firebaseDb(), "users", uid),
    {
      bankAccount: {
        ...bankData,
        verifiedAt:
          new Date().toISOString()
      },
      updatedAt:
        serverTimestamp()
    }
  );
}
