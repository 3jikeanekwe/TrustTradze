import crypto from "node:crypto";

import type { EscrowRecord } from "@/types/domain";
import { ESCROW_FEE_PERCENT } from "@/lib/constants";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function generateEscrowToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString("hex");
}

export function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function buildEscrowLink(token: string) {
  return `${getAppUrl()}/e/${token}`;
}

export function formatMoney(amount: number) {
  return `₦${Math.round(amount).toLocaleString("en-NG")}`;
}

export function calculateEscrowAmounts(amount: number, processorFeeAmount = 0) {
  const feeAmount = Math.round((amount * ESCROW_FEE_PERCENT) / 100);
  const buyerPaysAmount = Math.round(amount + feeAmount);
  const sellerReceivesAmount = Math.max(0, Math.round(amount - processorFeeAmount));

  return {
    feeAmount,
    buyerPaysAmount,
    sellerReceivesAmount,
    processorFeeAmount: Math.max(0, Math.round(processorFeeAmount))
  };
}

export function getParticipantRole(
  escrow: Pick<EscrowRecord, "buyerId" | "sellerId" | "creatorId">,
  uid: string | null | undefined
) {
  if (!uid) return null;
  if (escrow.buyerId === uid) return "buyer";
  if (escrow.sellerId === uid) return "seller";
  if (escrow.creatorId === uid) return "creator";
  return null;
}

export function getAccessibleToken(
  escrow: Pick<EscrowRecord, "buyerId" | "sellerId" | "buyerToken" | "sellerToken">,
  uid: string | null | undefined
) {
  if (!uid) return null;
  if (escrow.buyerId === uid) return escrow.buyerToken;
  if (escrow.sellerId === uid) return escrow.sellerToken;
  return null;
}

export function getEscrowStatusLabel(status: EscrowRecord["status"]) {
  switch (status) {
    case "created":
      return "Created";
    case "invited":
      return "Invited";
    case "accepted":
      return "Accepted";
    case "awaiting_payment":
      return "Awaiting payment";
    case "funded":
      return "Funded";
    case "in_progress":
      return "In progress";
    case "completed":
      return "Completed";
    case "refund_requested":
      return "Refund requested";
    case "refunded":
      return "Refunded";
    case "disputed":
      return "Disputed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}
