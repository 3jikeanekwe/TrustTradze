import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/collections";
import { getServerSessionProfile } from "@/lib/firebase/session";
import { createServerNotifications } from "@/lib/server-notifications";
import { sendEmail } from "@/lib/resend";
import { buildEscrowLink } from "@/lib/escrow";
import { chatMessageSchema } from "@/lib/validators";

async function loadEscrow(escrowId: string) {
  const snap = await adminDb.collection(COLLECTIONS.ESCROWS).doc(escrowId).get();
  if (!snap.exists) return null;
  return {
    id: snap.id,
    ...(snap.data() as any)
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

function getSenderRole(escrow: any, uid: string) {
  if (escrow.buyerId === uid) return "buyer";
  if (escrow.sellerId === uid) return "seller";
  return "admin";
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

    const escrow = await loadEscrow(escrowId);

    if (!escrow) {
      return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
    }

    const canChat =
      profile.role === "admin" ||
      profile.role === "super_admin" ||
      escrow.buyerId === profile.uid ||
      escrow.sellerId === profile.uid;

    if (!canChat) {
      return NextResponse.json({ error: "You cannot chat in this escrow" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = chatMessageSchema.safeParse({
      message: body.message
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Message is required and must be under 2000 characters" },
        { status: 400 }
      );
    }

    const sender = {
      uid: profile.uid,
      email: profile.email,
      fullName: profile.fullName ?? profile.email
    };

    const messageRef = adminDb.collection(COLLECTIONS.MESSAGES).doc();
    const now = new Date().toISOString();

    await messageRef.set({
      id: messageRef.id,
      escrowId,
      senderId: sender.uid,
      senderEmail: sender.email,
      senderName: sender.fullName,
      message: parsed.data.message.trim(),
      createdAt: now
    });

    const senderRole = getSenderRole(escrow, sender.uid);

    const recipientIds =
      senderRole === "buyer"
        ? [escrow.sellerId].filter(Boolean)
        : senderRole === "seller"
          ? [escrow.buyerId].filter(Boolean)
          : [escrow.buyerId, escrow.sellerId].filter(Boolean);

    const buyer = await loadUser(escrow.buyerId);
    const seller = await loadUser(escrow.sellerId);
    const buyerLink = buildEscrowLink(escrow.buyerToken);
    const sellerLink = buildEscrowLink(escrow.sellerToken);
    const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "TrustTradze";

    await createServerNotifications(recipientIds, {
      type: "escrow",
      title: `New message in ${escrow.title}`,
      body: `${sender.fullName} sent a message.`,
      meta: {
        escrowId,
        messageId: messageRef.id
      }
    });

    const emailTasks: Promise<unknown>[] = [];

    if (buyer && buyer.uid !== sender.uid) {
      emailTasks.push(
        sendEmail({
          to: buyer.email,
          subject: `${appName}: New message in escrow`,
          html: `
            <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px">
              <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;padding:28px">
                <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#0f172a">New message in escrow</h1>
                <p style="margin:0 0 18px;color:#334155;line-height:1.7">
                  ${sender.fullName} sent a new message in <strong>${escrow.title}</strong>.
                </p>
                <p style="margin:0 0 10px;color:#0f172a;line-height:1.7"><strong>Message:</strong> ${parsed.data.message.trim()}</p>
                <p style="margin-top:24px"><a href="${buyerLink}" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 18px;border-radius:14px;text-decoration:none;font-weight:700">Open deal</a></p>
              </div>
            </div>
          `,
          text: `New message in escrow: ${escrow.title}\n\n${sender.fullName}: ${parsed.data.message.trim()}\n\nOpen deal: ${buyerLink}`
        })
      );
    }

    if (seller && seller.uid !== sender.uid) {
      emailTasks.push(
        sendEmail({
          to: seller.email,
          subject: `${appName}: New message in escrow`,
          html: `
            <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px">
              <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;padding:28px">
                <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#0f172a">New message in escrow</h1>
                <p style="margin:0 0 18px;color:#334155;line-height:1.7">
                  ${sender.fullName} sent a new message in <strong>${escrow.title}</strong>.
                </p>
                <p style="margin:0 0 10px;color:#0f172a;line-height:1.7"><strong>Message:</strong> ${parsed.data.message.trim()}</p>
                <p style="margin-top:24px"><a href="${sellerLink}" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 18px;border-radius:14px;text-decoration:none;font-weight:700">Open deal</a></p>
              </div>
            </div>
          `,
          text: `New message in escrow: ${escrow.title}\n\n${sender.fullName}: ${parsed.data.message.trim()}\n\nOpen deal: ${sellerLink}`
        })
      );
    }

    await Promise.all(emailTasks);

    return NextResponse.json({
      ok: true,
      message: {
        id: messageRef.id,
        escrowId,
        senderId: sender.uid,
        senderEmail: sender.email,
        senderName: sender.fullName,
        message: parsed.data.message.trim(),
        createdAt: now
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to send message" },
      { status: 400 }
    );
  }
      }
