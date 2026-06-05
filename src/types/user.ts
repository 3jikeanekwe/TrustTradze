export type UserRole =
  | "super_admin"
  | "admin"
  | "user";

export interface BankAccount {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  recipientCode: string | null;
  verifiedAt: string | null;
}

export interface UserProfile {
  uid: string;

  email: string;

  fullName: string;

  role: UserRole;

  createdAt: string;

  updatedAt: string;

  isDisabled: boolean;

  avatarUrl: string | null;

  phoneNumber: string | null;

  state: string | null;

  city: string | null;

  bankAccount: BankAccount | null;
}
