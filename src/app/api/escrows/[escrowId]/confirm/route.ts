import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/collections";
import { getServerSessionProfile } from "@/lib/firebase/session";
import { buildEscrowLink } from "@/lib/escrow";
import {
  createPaystackTransfer
} from "@/lib/paystack";
import { createServerNotifications } from "@/lib/server-notifications";
import { sendEmail } from "@/lib/resend";
import { buildEscrowCompletedEmail } from "@/lib/escrow-emails";

async function loadUser(uid: string) {
  const snap = await adminDb.collection(COLLECTIONS.USERS).doc(uid).get();
  if (!snap.exists) return null;
  return {
    uid: snap.id,
    ...(snap.data() as any)
  };
}

export async function POST(
  _request: NextRequest,
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

    const escrowRef = adminDb.collection(COLLECTIONS.ESCROWS).doc(escrowId);
    const escrowSnap = await escrowRef.get();

    if (!escrowSnap.exists) {
      return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
    }

    const escrow = escrowSnap.data() as any;

    if (escrow.buyerId !== profile.uid) {
      return NextResponse.json({ error: "Only the buyer can confirm receipt" }, { status: 403 });
    }

    if (escrow.status !== "funded" && escrow.status !== "in_progress") {
      return NextResponse.json(
        { error: "Escrow must be funded before it can be confirmed" },
        { status: 400 }
      );
    }

    const seller = await loadUser(escrow.sellerId);
    if (!seller?.bankAccount?.recipientCode) {
      return NextResponse.json(
        { error: "Seller bank account is missing or incomplete" },
        { status: 400 }
      );
    }

    const transferReference = `TT_RELEASE_${escrowId}_${Date.now()}`;
    const releaseAmountKobo = Math.round(Number(escrow.sellerReceivesAmount) * 100);

    await createPaystackTransfer({
      recipient: seller.bankAccount.recipientCode,
      amountKobo: releaseAmountKobo,
      reason: `Escrow release for ${escrow.title}`,
      reference: transferReference
    });

    const updatedAt = new Date().toISOString();
    await escrowRef.set(
      {
        ...escrow,
        status: "completed",
        releasedAt: updatedAt,
        updatedAt
      },
      { merge: true }
    );

    const buyer = await loadUser(escrow.buyerId);
    const buyerLink = buildEscrowLink(escrow.buyerToken);
    const sellerLink = buildEscrowLink(escrow.sellerToken);
    const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "TrustTradze";

    if (buyer) {
      await Promise.all([
        createServerNotifications([buyer.uid, seller.uid], {
          type: "payment",
          title: "Escrow completed",
          body: `${escrow.title} has been released to the seller.`,
          meta: {
            escrowId
          }
        }),
        sendEmail({
          to: buyer.email,
          ...buildEscrowCompletedEmail({
            appName,
            recipientName: buyer.fullName ?? buyer.email,
            role: "buyer",
            title: escrow.title,
            amount: Number(escrow.amount),
            buyerLink,
            sellerLink
          })
        }),
        sendEmail({
          to: seller.email,
          ...buildEscrowCompletedEmail({
            appName,
            recipientName: seller.fullName ?? seller.email,
            role: "seller",
            title: escrow.title,
            amount: Number(escrow.amount),
            buyerLink,
            sellerLink
          })
        })
      ]);
    }

    return NextResponse.json({
      ok: true,
      status: "completed",
      escrowId
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to release escrow" },
      { status: 400 }
    );
  }
        }
