export type UserRole = "super_admin" | "admin" | "user";

export type EscrowRole = "buyer" | "seller";

export type EscrowCategoryGroup = "products" | "services";

export type ProductCategory =
  | "Agriculture"
  | "Electronics"
  | "Fashion"
  | "Vehicles"
  | "Construction"
  | "Home & Living"
  | "Industrial"
  | "Other";

export type ServiceCategory =
  | "Repair"
  | "Logistics"
  | "Freelancing"
  | "Construction"
  | "Technology"
  | "Education"
  | "Consulting"
  | "Other";

export type ServiceLocationType = "Physical" | "Home Service" | "Online";

export type EscrowStatus =
  | "created"
  | "invited"
  | "accepted"
  | "awaiting_payment"
  | "funded"
  | "in_progress"
  | "completed"
  | "refund_requested"
  | "refunded"
  | "disputed"
  | "cancelled";

export type NotificationType =
  | "escrow_created"
  | "escrow_invited"
  | "payment_received"
  | "payment_released"
  | "refund_requested"
  | "refund_processed"
  | "dispute_opened"
  | "admin_action";

export interface BankAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
  recipientCode?: string | null;
  updatedAt?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  isDisabled?: boolean;
  bankAccount?: BankAccount | null;
}

export interface ProductRecord {
  id: string;
  sellerId: string;
  title: string;
  price: number;
  category: ProductCategory;
  youtubeUrl: string;
  location: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface ServiceRecord {
  id: string;
  providerId: string;
  title: string;
  price: number;
  category: ServiceCategory;
  locationType: ServiceLocationType;
  location: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface EscrowRecord {
  id: string;
  creatorId: string;
  buyerId: string | null;
  sellerId: string | null;
  title: string;
  categoryGroup: EscrowCategoryGroup;
  category: string;
  amount: number;
  feeAmount: number;
  processorFeeAmount: number;
  buyerPaysAmount: number;
  sellerReceivesAmount: number;
  buyerEmail: string;
  sellerEmail: string;
  buyerToken: string;
  sellerToken: string;
  status: EscrowStatus;
  createdAt: string;
  updatedAt: string;
  paymentReference?: string | null;
  paymentProvider?: "paystack" | null;
  releasedAt?: string | null;
  refundedAt?: string | null;
  disputeOpenedAt?: string | null;
}

export interface ChatMessageRecord {
  id: string;
  escrowId: string;
  senderId: string;
  senderEmail: string;
  senderName: string;
  message: string;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  meta?: Record<string, string | number | boolean | null>;
}

export interface DisputeRecord {
  id: string;
  escrowId: string;
  openedByUserId: string;
  reason: string;
  status: "open" | "resolved" | "rejected";
  resolution?: "refund_buyer" | "release_seller" | null;
  createdAt: string;
  updatedAt: string;
}
