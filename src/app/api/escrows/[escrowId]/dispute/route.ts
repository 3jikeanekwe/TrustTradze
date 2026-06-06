import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/collections";
import { getServerSessionProfile } from "@/lib/firebase/session";
import { buildEscrowLink } from "@/lib/escrow";
import { createServerNotifications } from "@/lib/server-notifications";
import { sendEmail } from "@/lib/resend";
import { buildEscrowDisputedEmail } from "@/lib/escrow-emails";

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

    if (!reason) {
      return NextResponse.json({ error: "Dispute reason is required" }, { status: 400 });
    }

    const escrowRef = adminDb.collection(COLLECTIONS.ESCROWS).doc(escrowId);
    const escrowSnap = await escrowRef.get();

    if (!escrowSnap.exists) {
      return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
    }

    const escrow = escrowSnap.data() as any;
    const allowed =
      escrow.buyerId === profile.uid ||
      escrow.sellerId === profile.uid ||
      profile.role === "admin" ||
      profile.role === "super_admin";

    if (!allowed) {
      return NextResponse.json({ error: "You cannot open a dispute on this escrow" }, { status: 403 });
    }

    const disputeRef = adminDb.collection(COLLECTIONS.DISPUTES).doc();
    const now = new Date().toISOString();

    await disputeRef.set({
      id: disputeRef.id,
      escrowId,
      openedByUserId: profile.uid,
      reason,
      status: "open",
      resolution: null,
      createdAt: now,
      updatedAt: now
    });

    await escrowRef.set(
      {
        ...escrow,
        status: "disputed",
        disputeOpenedAt: now,
        updatedAt: now
      },
      { merge: true }
    );

    const buyer = await loadUser(escrow.buyerId);
    const seller = await loadUser(escrow.sellerId);
    const buyerLink = buildEscrowLink(escrow.buyerToken);
    const sellerLink = buildEscrowLink(escrow.sellerToken);
    const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "TrustTradze";

    if (buyer && seller) {
      await Promise.all([
        createServerNotifications([buyer.uid, seller.uid], {
          type: "dispute",
          title: "Escrow dispute opened",
          body: `${escrow.title} is now under dispute review.`,
          meta: {
            escrowId
          }
        }),
        sendEmail({
          to: buyer.email,
          ...buildEscrowDisputedEmail({
            appName,
            recipientName: buyer.fullName ?? buyer.email,
            role: "buyer",
            title: escrow.title,
            amount: Number(escrow.amount),
            buyerLink,
            sellerLink,
            reason
          })
        }),
        sendEmail({
          to: seller.email,
          ...buildEscrowDisputedEmail({
            appName,
            recipientName: seller.fullName ?? seller.email,
            role: "seller",
            title: escrow.title,
            amount: Number(escrow.amount),
            buyerLink,
            sellerLink,
            reason
          })
        })
      ]);
    }

    return NextResponse.json({
      ok: true,
      escrowId,
      disputeId: disputeRef.id
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to open dispute" },
      { status: 400 }
    );
  }
            }
