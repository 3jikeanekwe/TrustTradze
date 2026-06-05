export type NotificationType =
  | "system"
  | "escrow"
  | "payment"
  | "refund"
  | "dispute"
  | "admin";

export interface NotificationRecord {
  id: string;

  userId: string;

  type: NotificationType;

  title: string;

  body: string;

  read: boolean;

  createdAt: string;
}
