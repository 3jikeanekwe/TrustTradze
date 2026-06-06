import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/collections";
import {
  buildEscrowCompletedEmail,
  buildEscrowFundedEmail
} from "@/lib/escrow-emails";
import { buildEscrowLink, getAppUrl } from "@/lib/escrow";
import {
  createServerNotification,
  createServerNotifications
} from "@/lib/server-notifications";
import {
  refundPaystackTransaction,
  verifyPaystackTransaction,
  verifyPaystackWebhookSignature
} from "@/lib/paystack";
import { sendEmail } from "@/lib/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function findEscrowByPaymentReference(reference: string) {
  const snapshot = await adminDb
    .collection(COLLECTIONS.ESCROWS)
    .where("paymentReference", "==", reference)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  return {
    id: docSnap.id,
    ...(docSnap.data() as any)
  };
}

async function loadUser(uid: string) {
  const snap = await adminDb.collection(COLLECTIONS.USERS).doc(uid).get();
  if (!snap.exists) return null;
  return {
    uid: snap.id,
    ...(snap.data() as any)
  };
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyPaystackWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as any;

  if (event.event !== "charge.success") {
    return NextResponse.json({ ok: true });
  }

  const reference = event?.data?.reference;
  if (!reference) {
    return NextResponse.json({ ok: true });
  }

  const escrow = await findEscrowByPaymentReference(reference);
  if (!escrow) {
    return NextResponse.json({ ok: true });
  }

  const verified = await verifyPaystackTransaction(reference);
  const verifiedFeeNaira = Math.round((verified.data.fees ?? 0) / 100);
  const paymentAmountNaira = Math.round((verified.data.amount ?? 0) / 100);

  const escrowRef = adminDb.collection(COLLECTIONS.ESCROWS).doc(escrow.id);
  const currentSnap = await escrowRef.get();
  const current = currentSnap.data() as any;

  if (current?.status === "funded" || current?.status === "completed") {
    return NextResponse.json({ ok: true });
  }

  const updated = {
    ...current,
    status: "funded",
    processorFeeAmount: verifiedFeeNaira,
    sellerReceivesAmount: Math.max(0, Math.round(Number(current.amount) - verifiedFeeNaira)),
    updatedAt: new Date().toISOString()
  };

  await escrowRef.set(updated, { merge: true });

  const buyer = await loadUser(current.buyerId);
  const seller = await loadUser(current.sellerId);

  const buyerLink = buildEscrowLink(current.buyerToken);
  const sellerLink = buildEscrowLink(current.sellerToken);
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "TrustTradze";

  if (buyer && seller) {
    await Promise.all([
      sendEmail({
        to: buyer.email,
        ...buildEscrowFundedEmail({
          appName,
          recipientName: buyer.fullName ?? buyer.email,
          role: "buyer",
          title: current.title,
          amount: Number(current.amount),
          buyerLink,
          sellerLink
        })
      }),
      sendEmail({
        to: seller.email,
        ...buildEscrowFundedEmail({
          appName,
          recipientName: seller.fullName ?? seller.email,
          role: "seller",
          title: current.title,
          amount: Number(current.amount),
          buyerLink,
          sellerLink
        })
      }),
      createServerNotifications([buyer.uid, seller.uid], {
        type: "payment",
        title: "Escrow funded",
        body: `${current.title} has been paid for and is now in escrow.`,
        meta: {
          escrowId: current.id
        }
      })
    ]);
  }

  return NextResponse.json({
    ok: true,
    escrowId: current.id,
    paymentAmountNaira,
    verifiedFeeNaira
  });
}
