import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/collections";
import { getServerSessionProfile } from "@/lib/firebase/session";
import { buildEscrowLink } from "@/lib/escrow";
import { refundPaystackTransaction } from "@/lib/paystack";
import { createServerNotifications } from "@/lib/server-notifications";
import { sendEmail } from "@/lib/resend";
import { buildEscrowRefundedEmail } from "@/lib/escrow-emails";

async function loadUser(uid: string) {
  const snap = await adminDb.collection(COLLECTIONS.USERS).doc(uid).get();
  if (!snap.exists) return null;
  return {
    uid: snap.id,
    ...(snap.data() as any)
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ escrowId: string }> }
) {
  try {
    const { escrowId } = await params;
    const profile = await getServerSessionProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (profile.isDisabled) {
      return NextResponse.json({ error: "Account disabled" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    const escrowRef = adminDb.collection(COLLECTIONS.ESCROWS).doc(escrowId);
    const escrowSnap = await escrowRef.get();

    if (!escrowSnap.exists) {
      return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
    }

    const escrow = escrowSnap.data() as any;

    if (escrow.sellerId !== profile.uid) {
      return NextResponse.json({ error: "Only the seller can refund this deal" }, { status: 403 });
    }

    const buyer = await loadUser(escrow.buyerId);
    const seller = await loadUser(escrow.sellerId);

    if (!buyer || !seller) {
      return NextResponse.json({ error: "Participants not found" }, { status: 400 });
    }

    const buyerLink = buildEscrowLink(escrow.buyerToken);
    const sellerLink = buildEscrowLink(escrow.sellerToken);
    const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "TrustTradze";

    if (escrow.paymentReference && escrow.status !== "refunded" && escrow.status !== "completed") {
      await refundPaystackTransaction({
        transaction: escrow.paymentReference,
        customerNote: reason || "Seller initiated refund",
        merchantNote: `Refund for escrow ${escrowId}`
      });

      const updatedAt = new Date().toISOString();
      await escrowRef.set(
        {
          ...escrow,
          status: "refunded",
          refundedAt: updatedAt,
          updatedAt
        },
        { merge: true }
      );

      await Promise.all([
        createServerNotifications([buyer.uid, seller.uid], {
          type: "refund",
          title: "Escrow refunded",
          body: `${escrow.title} has been refunded to the buyer.`,
          meta: {
            escrowId
          }
        }),
        sendEmail({
          to: buyer.email,
          ...buildEscrowRefundedEmail({
            appName,
            recipientName: buyer.fullName ?? buyer.email,
            role: "buyer",
            title: escrow.title,
            amount: Number(escrow.amount),
            buyerLink,
            sellerLink,
            reason: reason || null
          })
        }),
        sendEmail({
          to: seller.email,
          ...buildEscrowRefundedEmail({
            appName,
            recipientName: seller.fullName ?? seller.email,
            role: "seller",
            title: escrow.title,
            amount: Number(escrow.amount),
            buyerLink,
            sellerLink,
            reason: reason || null
          })
        })
      ]);
    } else {
      const updatedAt = new Date().toISOString();
      await escrowRef.set(
        {
          ...escrow,
          status: "cancelled",
          updatedAt
        },
        { merge: true }
      );

      await createServerNotifications([buyer.uid, seller.uid], {
        type: "refund",
        title: "Escrow cancelled",
        body: `${escrow.title} was cancelled before payment was fully processed.`,
        meta: {
          escrowId
        }
      });
    }

    return NextResponse.json({
      ok: true,
      escrowId
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to refund escrow" },
      { status: 400 }
    );
  }
        }
