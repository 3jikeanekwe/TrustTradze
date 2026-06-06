import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/collections";
import { getServerSessionProfile } from "@/lib/firebase/session";
import { buildEscrowLink, getEscrowStatusLabel } from "@/lib/escrow";
import { createServerNotifications } from "@/lib/server-notifications";
import { sendEmail } from "@/lib/resend";

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
    const token = typeof body.token === "string" ? body.token : "";

    const escrowRef = adminDb.collection(COLLECTIONS.ESCROWS).doc(escrowId);
    const escrowSnap = await escrowRef.get();

    if (!escrowSnap.exists) {
      return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
    }

    const escrow = escrowSnap.data() as any;

    if (escrow.buyerId !== profile.uid) {
      return NextResponse.json({ error: "Only the buyer can accept this deal" }, { status: 403 });
    }

    if (token && token !== escrow.buyerToken) {
      return NextResponse.json({ error: "Invalid access token" }, { status: 403 });
    }

    if (escrow.status === "funded" || escrow.status === "completed" || escrow.status === "refunded") {
      return NextResponse.json(
        { error: `Cannot accept a deal that is already ${getEscrowStatusLabel(escrow.status)}` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    await escrowRef.set(
      {
        ...escrow,
        status: "accepted",
        updatedAt: now
      },
      { merge: true }
    );

    const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "TrustTradze";
    const buyerLink = buildEscrowLink(escrow.buyerToken);
    const sellerLink = buildEscrowLink(escrow.sellerToken);

    await Promise.all([
      createServerNotifications([escrow.sellerId], {
        type: "escrow",
        title: "Buyer accepted escrow",
        body: `${escrow.title} has been accepted by the buyer.`,
        meta: {
          escrowId
        }
      }),
      sendEmail({
        to: escrow.sellerEmail,
        subject: `${appName}: Buyer accepted escrow`,
        text: `The buyer accepted "${escrow.title}". Open the seller link to see the deal.`,
        html: `<p>The buyer accepted <strong>${escrow.title}</strong>.</p><p><a href="${sellerLink}">Open seller view</a></p>`
      })
    ]);

    return NextResponse.json({
      ok: true,
      escrowId,
      status: "accepted",
      buyerLink,
      sellerLink
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to accept escrow" },
      { status: 400 }
    );
  }
}
