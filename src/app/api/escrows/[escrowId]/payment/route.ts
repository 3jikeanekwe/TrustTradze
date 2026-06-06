import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/collections";
import { getServerSessionProfile } from "@/lib/firebase/session";
import { buildEscrowLink, getEscrowStatusLabel } from "@/lib/escrow";
import { initializePaystackTransaction } from "@/lib/paystack";

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
      return NextResponse.json({ error: "Only the buyer can make payment" }, { status: 403 });
    }

    if (token && token !== escrow.buyerToken) {
      return NextResponse.json({ error: "Invalid access token" }, { status: 403 });
    }

    if (escrow.status === "funded" || escrow.status === "completed") {
      return NextResponse.json(
        { error: `Cannot pay a deal that is already ${getEscrowStatusLabel(escrow.status)}` },
        { status: 400 }
      );
    }

    const paymentReference = escrow.paymentReference || `TT_${escrowId}_${Date.now()}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const callbackUrl = `${appUrl}/e/${escrow.buyerToken}`;

    await escrowRef.set(
      {
        ...escrow,
        status: "awaiting_payment",
        paymentReference,
        paymentProvider: "paystack",
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );

    const payment = await initializePaystackTransaction({
      email: profile.email,
      amountKobo: Math.round(Number(escrow.buyerPaysAmount) * 100),
      reference: paymentReference,
      callbackUrl,
      metadata: {
        escrowId,
        buyerId: escrow.buyerId,
        sellerId: escrow.sellerId,
        buyerToken: escrow.buyerToken,
        sellerToken: escrow.sellerToken,
        title: escrow.title
      }
    });

    return NextResponse.json({
      ok: true,
      authorizationUrl: payment.data.authorization_url,
      accessCode: payment.data.access_code,
      reference: payment.data.reference,
      buyerLink: buildEscrowLink(escrow.buyerToken),
      sellerLink: buildEscrowLink(escrow.sellerToken)
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to initialize payment" },
      { status: 400 }
    );
  }
}
