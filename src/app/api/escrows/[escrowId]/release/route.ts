import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/collections";
import { getServerSessionProfile } from "@/lib/firebase/session";
import { buildEscrowLink } from "@/lib/escrow";
import { createPaystackTransfer } from "@/lib/paystack";
import { createServerNotifications } from "@/lib/server-notifications";
import { sendEmail } from "@/lib/resend";
import { buildEscrowReleaseEmail } from "@/lib/escrow-emails";

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

    if (profile.role !== "admin" && profile.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const escrowRef = adminDb.collection(COLLECTIONS.ESCROWS).doc(escrowId);
    const escrowSnap = await escrowRef.get();

    if (!escrowSnap.exists) {
      return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
    }

    const escrow = escrowSnap.data() as any;
    const seller = await loadUser(escrow.sellerId);

    if (!seller?.bankAccount?.recipientCode) {
      return NextResponse.json(
        { error: "Seller bank account is missing or incomplete" },
        { status: 400 }
      );
    }

    const transferReference = `TT_ADMIN_RELEASE_${escrowId}_${Date.now()}`;
    await createPaystackTransfer({
      recipient: seller.bankAccount.recipientCode,
      amountKobo: Math.round(Number(escrow.sellerReceivesAmount) * 100),
      reason: `Admin release for ${escrow.title}`,
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
          type: "admin",
          title: "Escrow released by admin",
          body: `${escrow.title} has been released by admin action.`,
          meta: {
            escrowId
          }
        }),
        sendEmail({
          to: buyer.email,
          ...buildEscrowReleaseEmail({
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
          ...buildEscrowReleaseEmail({
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
      escrowId,
      status: "completed"
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to force release escrow" },
      { status: 400 }
    );
  }
}
