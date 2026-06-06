import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/collections";
import { getServerSessionProfile } from "@/lib/firebase/session";
import { escrowCreateSchema } from "@/lib/validators";
import {
  buildEscrowLink,
  calculateEscrowAmounts,
  generateEscrowToken,
  normalizeEmail
} from "@/lib/escrow";
import { createServerNotifications } from "@/lib/server-notifications";
import { sendEmail } from "@/lib/resend";
import {
  buildEscrowCreatedEmail
} from "@/lib/escrow-emails";

async function findUserByEmail(email: string) {
  const snapshot = await adminDb
    .collection(COLLECTIONS.USERS)
    .where("email", "==", normalizeEmail(email))
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  const data = docSnap.data();

  return {
    uid: docSnap.id,
    ...data
  } as any;
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getServerSessionProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (profile.isDisabled) {
      return NextResponse.json({ error: "Account disabled" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = escrowCreateSchema.parse({
      title: body.title,
      categoryGroup: body.categoryGroup,
      category: body.category,
      amount: Number(body.amount),
      buyerEmail: body.buyerEmail,
      sellerEmail: body.sellerEmail
    });

    const buyerEmail = normalizeEmail(parsed.buyerEmail);
    const sellerEmail = normalizeEmail(parsed.sellerEmail);

    if (buyerEmail === sellerEmail) {
      return NextResponse.json(
        { error: "Buyer and seller cannot be the same account" },
        { status: 400 }
      );
    }

    const buyer = await findUserByEmail(buyerEmail);
    const seller = await findUserByEmail(sellerEmail);

    if (!buyer) {
      return NextResponse.json({ error: "Buyer account not found" }, { status: 400 });
    }
    if (!seller) {
      return NextResponse.json({ error: "Seller account not found" }, { status: 400 });
    }
    if (buyer.isDisabled) {
      return NextResponse.json({ error: "Buyer account is disabled" }, { status: 400 });
    }
    if (seller.isDisabled) {
      return NextResponse.json({ error: "Seller account is disabled" }, { status: 400 });
    }

    const escrowRef = adminDb.collection(COLLECTIONS.ESCROWS).doc();
    const buyerToken = generateEscrowToken();
    const sellerToken = generateEscrowToken();
    const amounts = calculateEscrowAmounts(parsed.amount, 0);
    const now = new Date().toISOString();

    const escrow = {
      id: escrowRef.id,
      creatorId: profile.uid,
      buyerId: buyer.uid,
      sellerId: seller.uid,
      title: parsed.title,
      categoryGroup: parsed.categoryGroup,
      category: parsed.category,
      amount: parsed.amount,
      feeAmount: amounts.feeAmount,
      processorFeeAmount: 0,
      buyerPaysAmount: amounts.buyerPaysAmount,
      sellerReceivesAmount: amounts.sellerReceivesAmount,
      buyerEmail,
      sellerEmail,
      buyerToken,
      sellerToken,
      status: "invited",
      createdAt: now,
      updatedAt: now,
      paymentReference: null,
      paymentProvider: null,
      releasedAt: null,
      refundedAt: null,
      disputeOpenedAt: null
    };

    await escrowRef.set(escrow);

    const buyerLink = buildEscrowLink(buyerToken);
    const sellerLink = buildEscrowLink(sellerToken);

    const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "TrustTradze";

    await Promise.all([
      sendEmail({
        to: buyerEmail,
        ...buildEscrowCreatedEmail({
          appName,
          recipientName: buyer.fullName ?? buyer.email,
          role: "buyer",
          title: parsed.title,
          amount: parsed.amount,
          feeAmount: amounts.feeAmount,
          buyerPaysAmount: amounts.buyerPaysAmount,
          sellerReceivesAmount: amounts.sellerReceivesAmount,
          buyerLink,
          sellerLink,
          counterpartyName: seller.fullName ?? seller.email,
          counterpartyEmail: sellerEmail
        })
      }),
      sendEmail({
        to: sellerEmail,
        ...buildEscrowCreatedEmail({
          appName,
          recipientName: seller.fullName ?? seller.email,
          role: "seller",
          title: parsed.title,
          amount: parsed.amount,
          feeAmount: amounts.feeAmount,
          buyerPaysAmount: amounts.buyerPaysAmount,
          sellerReceivesAmount: amounts.sellerReceivesAmount,
          buyerLink,
          sellerLink,
          counterpartyName: buyer.fullName ?? buyer.email,
          counterpartyEmail: buyerEmail
        })
      }),
      createServerNotifications([buyer.uid, seller.uid], {
        type: "escrow",
        title: "New escrow deal created",
        body: `${parsed.title} is ready. Open your deal link to continue.`,
        meta: {
          escrowId: escrowRef.id
        }
      })
    ]);

    return NextResponse.json({
      ok: true,
      escrow,
      buyerLink,
      sellerLink
    });
  } catch (error: any) {
    const message =
      error?.name === "ZodError"
        ? "Invalid escrow data"
        : error?.message ?? "Failed to create escrow";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
