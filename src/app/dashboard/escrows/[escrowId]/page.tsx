import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getServerSessionProfile } from "@/lib/firebase/session";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/collections";
import { buildEscrowLink, formatMoney, getEscrowStatusLabel } from "@/lib/escrow";

type EscrowDoc = {
  id: string;
  creatorId: string;
  buyerId: string | null;
  sellerId: string | null;
  title: string;
  categoryGroup: string;
  category: string;
  amount: number;
  feeAmount: number;
  processorFeeAmount: number;
  buyerPaysAmount: number;
  sellerReceivesAmount: number;
  buyerEmail: string;
  sellerEmail: string;
  buyerToken: string;
  sellerToken: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  paymentReference?: string | null;
  paymentProvider?: string | null;
  releasedAt?: string | null;
  refundedAt?: string | null;
  disputeOpenedAt?: string | null;
};

type UserDoc = {
  uid: string;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  state?: string | null;
  city?: string | null;
  role?: string;
  bankAccount?: {
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    recipientCode?: string;
  } | null;
};

type MessageDoc = {
  id: string;
  escrowId: string;
  senderId: string;
  senderEmail: string;
  senderName: string;
  message: string;
  createdAt: string;
};

type DisputeDoc = {
  id: string;
  escrowId: string;
  openedByUserId: string;
  reason: string;
  status: "open" | "resolved" | "rejected";
  resolution?: "refund_buyer" | "release_seller" | null;
  createdAt: string;
  updatedAt: string;
};

async function loadUser(uid: string): Promise<UserDoc | null> {
  const snap = await adminDb.collection(COLLECTIONS.USERS).doc(uid).get();
  if (!snap.exists) return null;
  return {
    uid: snap.id,
    ...(snap.data() as any)
  };
}

export default async function EscrowDashboardDetailPage({
  params
}: {
  params: Promise<{ escrowId: string }>;
}) {
  const profile = await getServerSessionProfile();

  if (!profile) {
    redirect("/login");
  }

  const { escrowId } = await params;
  const escrowSnap = await adminDb.collection(COLLECTIONS.ESCROWS).doc(escrowId).get();

  if (!escrowSnap.exists) {
    notFound();
  }

  const escrow = {
    id: escrowSnap.id,
    ...(escrowSnap.data() as Omit<EscrowDoc, "id">)
  } as EscrowDoc;

  const allowed =
    profile.role === "admin" ||
    profile.role === "super_admin" ||
    profile.uid === escrow.creatorId ||
    profile.uid === escrow.buyerId ||
    profile.uid === escrow.sellerId;

  if (!allowed) {
    redirect("/dashboard/escrows");
  }

  const [buyer, seller, messagesSnap, disputesSnap] = await Promise.all([
    escrow.buyerId ? loadUser(escrow.buyerId) : Promise.resolve(null),
    escrow.sellerId ? loadUser(escrow.sellerId) : Promise.resolve(null),
    adminDb
      .collection(COLLECTIONS.MESSAGES)
      .where("escrowId", "==", escrow.id)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get(),
    adminDb
      .collection(COLLECTIONS.DISPUTES)
      .where("escrowId", "==", escrow.id)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get()
  ]);

  const messages = messagesSnap.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<MessageDoc, "id">)
    }))
    .reverse();

  const disputes = disputesSnap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<DisputeDoc, "id">)
  }));

  const currentToken =
    profile.uid === escrow.buyerId
      ? escrow.buyerToken
      : profile.uid === escrow.sellerId
        ? escrow.sellerToken
        : null;

  const buyerLink = buildEscrowLink(escrow.buyerToken);
  const sellerLink = buildEscrowLink(escrow.sellerToken);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl border bg-white p-6 shadow-soft">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm text-slate-500">Dashboard escrow detail</p>
              <h1 className="mt-1 text-3xl font-semibold text-slate-950">{escrow.title}</h1>
              <p className="mt-2 text-sm text-slate-600">
                {escrow.categoryGroup} / {escrow.category}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Status:{" "}
                <span className="font-medium text-slate-900">
                  {getEscrowStatusLabel(escrow.status as any)}
                </span>
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Reminder: make sure the buyer confirms receipt so the funds can be released to the seller.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:min-w-[240px]">
              <Link
                href="/dashboard/escrows"
                className="rounded-xl border px-4 py-3 text-center text-sm font-medium text-slate-700"
              >
                Back to history
              </Link>

              {currentToken ? (
                <Link
                  href={`/e/${currentToken}`}
                  className="rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white"
                >
                  Open live deal page
                </Link>
              ) : (
                <div className="rounded-xl border bg-slate-50 px-4 py-3 text-center text-sm text-slate-500">
                  Live token page unavailable for this view
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Metric label="Amount" value={formatMoney(escrow.amount)} />
            <Metric label="Escrow fee" value={formatMoney(escrow.feeAmount)} />
            <Metric label="Buyer pays" value={formatMoney(escrow.buyerPaysAmount)} />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Metric label="Seller receives" value={formatMoney(escrow.sellerReceivesAmount)} />
            <Metric label="Processor fee" value={formatMoney(escrow.processorFeeAmount ?? 0)} />
            <Metric label="Payment reference" value={escrow.paymentReference ?? "Not set yet"} />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <ParticipantCard
            title="Buyer"
            user={buyer}
            emailFallback={escrow.buyerEmail}
            tokenLink={buyerLink}
          />
          <ParticipantCard
            title="Seller"
            user={seller}
            emailFallback={escrow.sellerEmail}
            tokenLink={sellerLink}
          />
        </section>

        <section className="rounded-3xl border bg-white p-6 shadow-soft">
          <h2 className="text-xl font-semibold">Timeline</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Metric label="Created" value={new Date(escrow.createdAt).toLocaleString()} />
            <Metric label="Updated" value={new Date(escrow.updatedAt).toLocaleString()} />
            <Metric label="Released at" value={escrow.releasedAt ? new Date(escrow.releasedAt).toLocaleString() : "—"} />
            <Metric label="Refunded at" value={escrow.refundedAt ? new Date(escrow.refundedAt).toLocaleString() : "—"} />
            <Metric
              label="Dispute opened at"
              value={escrow.disputeOpenedAt ? new Date(escrow.disputeOpenedAt).toLocaleString() : "—"}
            />
            <Metric label="Private token" value={currentToken ?? "Admin view"} />
          </div>
        </section>

        <section className="rounded-3xl border bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Messages</h2>
              <p className="mt-1 text-sm text-slate-600">
                All escrow chat stays attached to this transaction.
              </p>
            </div>
            <Link
              href={currentToken ? `/e/${currentToken}` : `/dashboard/escrows/${escrow.id}`}
              className="rounded-xl border px-4 py-3 text-sm font-medium text-slate-700"
            >
              Open chat thread
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {messages.length === 0 ? (
              <div className="rounded-2xl border bg-slate-50 p-4 text-sm text-slate-600">
                No messages yet.
              </div>
            ) : (
              messages.map((message) => {
                const mine = message.senderId === profile.uid;
                return (
                  <div
                    key={message.id}
                    className={[
                      "max-w-[90%] rounded-2xl border px-4 py-3 text-sm",
                      mine ? "ml-auto bg-slate-900 text-white" : "bg-slate-50 text-slate-800"
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
                        {message.senderName}
                      </span>
                      <span className="text-[11px] opacity-70">
                        {new Date(message.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-2 leading-6">{message.message}</p>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-3xl border bg-white p-6 shadow-soft">
          <h2 className="text-xl font-semibold">Disputes</h2>
          <p className="mt-1 text-sm text-slate-600">
            If there is a disagreement, the dispute history is stored here.
          </p>

          <div className="mt-4 space-y-3">
            {disputes.length === 0 ? (
              <div className="rounded-2xl border bg-slate-50 p-4 text-sm text-slate-600">
                No disputes recorded yet.
              </div>
            ) : (
              disputes.map((dispute) => (
                <div key={dispute.id} className="rounded-2xl border bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {dispute.status.toUpperCase()}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">{dispute.reason}</p>
                    </div>
                    <span className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-700">
                      {dispute.resolution ?? "no resolution yet"}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    Opened {new Date(dispute.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function ParticipantCard({
  title,
  user,
  emailFallback,
  tokenLink
}: {
  title: string;
  user: UserDoc | null;
  emailFallback: string;
  tokenLink: string;
}) {
  return (
    <section className="rounded-3xl border bg-white p-6 shadow-soft">
      <h2 className="text-xl font-semibold">{title}</h2>

      <div className="mt-4 space-y-3">
        <Metric label="Name" value={user?.fullName ?? emailFallback} />
        <Metric label="Email" value={user?.email ?? emailFallback} />
        <Metric
          label="Phone / WhatsApp"
          value={user?.phoneNumber ?? "Not provided"}
        />
        <Metric
          label="Location"
          value={
            user?.state
              ? `${user.state}${user.city ? `, ${user.city}` : ""}`
              : "Not provided"
          }
        />
        <Metric
          label="Bank account"
          value={
            user?.bankAccount?.accountName
              ? `${user.bankAccount.accountName} • ${user.bankAccount.accountNumber}`
              : "Not connected"
          }
        />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <Link
          href={tokenLink}
          className="rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white"
        >
          Open private deal page
        </Link>
      </div>
    </section>
  );
    }
