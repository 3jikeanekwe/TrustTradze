"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where
} from "firebase/firestore";

import { useAuth } from "@/hooks/use-auth";
import AuthLoading from "@/components/auth-loading";
import { firebaseDb } from "@/lib/firebase/client";
import {
  formatMoney,
  getAccessibleToken,
  getEscrowStatusLabel,
  getParticipantRole
} from "@/lib/escrow";

type EscrowDoc = {
  id: string;
  creatorId: string;
  buyerId: string;
  sellerId: string;
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
};

type ChatMessageDoc = {
  id: string;
  escrowId: string;
  senderId: string;
  senderEmail: string;
  senderName: string;
  message: string;
  createdAt: string;
};

async function loadUser(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(firebaseDb(), "users", uid));
  if (!snap.exists()) return null;
  return {
    uid: snap.id,
    ...(snap.data() as any)
  };
}

export default function EscrowTokenPage({
  params
}: {
  params: { token: string };
}) {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  const token = params.token;

  const [escrow, setEscrow] = useState<EscrowDoc | null>(null);
  const [buyer, setBuyer] = useState<UserDoc | null>(null);
  const [seller, setSeller] = useState<UserDoc | null>(null);
  const [loadingEscrow, setLoadingEscrow] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [notice, setNotice] = useState("");

  const [messages, setMessages] = useState<ChatMessageDoc[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const accessRole = useMemo(() => {
    if (!escrow || !user) return null;
    return getParticipantRole(escrow, user.uid);
  }, [escrow, user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/login?next=${encodeURIComponent(`/e/${token}`)}`);
    }
  }, [loading, user, router, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadEscrow() {
    setLoadingEscrow(true);
    setError("");

    try {
      const buyerQuery = query(
        collection(firebaseDb(), "escrows"),
        where("buyerToken", "==", token),
        limit(1)
      );
      const sellerQuery = query(
        collection(firebaseDb(), "escrows"),
        where("sellerToken", "==", token),
        limit(1)
      );

      const [buyerSnap, sellerSnap] = await Promise.all([getDocs(buyerQuery), getDocs(sellerQuery)]);

      const snap = !buyerSnap.empty ? buyerSnap.docs[0] : !sellerSnap.empty ? sellerSnap.docs[0] : null;

      if (!snap) {
        setEscrow(null);
        return;
      }

      const data = {
        id: snap.id,
        ...(snap.data() as Omit<EscrowDoc, "id">)
      };

      setEscrow(data);
      setBuyer(await loadUser(data.buyerId));
      setSeller(await loadUser(data.sellerId));
    } catch (err: any) {
      setError(err?.message ?? "Unable to load escrow");
    } finally {
      setLoadingEscrow(false);
    }
  }

  useEffect(() => {
    if (user) {
      void loadEscrow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  useEffect(() => {
    if (!escrow) return;

    const q = query(
      collection(firebaseDb(), "messages"),
      where("escrowId", "==", escrow.id),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setMessages(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<ChatMessageDoc, "id">)
          }))
        );
      },
      (err) => {
        setChatError(err.message);
      }
    );

    return unsubscribe;
  }, [escrow?.id]);

  async function acceptAndPay() {
    if (!escrow) return;

    setActionBusy(true);
    setNotice("");
    setError("");

    try {
      const acceptRes = await fetch(`/api/escrows/${escrow.id}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ token })
      });

      const acceptData = (await acceptRes.json()) as { error?: string; ok?: boolean };
      if (!acceptRes.ok) {
        throw new Error(acceptData.error ?? "Failed to accept escrow");
      }

      const payRes = await fetch(`/api/escrows/${escrow.id}/payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ token })
      });

      const payData = (await payRes.json()) as { error?: string; authorizationUrl?: string };
      if (!payRes.ok) {
        throw new Error(payData.error ?? "Failed to start payment");
      }

      if (payData.authorizationUrl) {
        window.location.href = payData.authorizationUrl;
        return;
      }

      setNotice("Payment started.");
      await loadEscrow();
    } catch (err: any) {
      setError(err?.message ?? "Unable to accept and pay");
    } finally {
      setActionBusy(false);
    }
  }

  async function confirmReceipt() {
    if (!escrow) return;

    setActionBusy(true);
    setNotice("");
    setError("");

    try {
      const res = await fetch(`/api/escrows/${escrow.id}/confirm`, {
        method: "POST"
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to confirm receipt");
      }

      setNotice("Escrow confirmed and released.");
      await loadEscrow();
    } catch (err: any) {
      setError(err?.message ?? "Unable to confirm receipt");
    } finally {
      setActionBusy(false);
    }
  }

  async function refundBuyer() {
    if (!escrow) return;

    setActionBusy(true);
    setNotice("");
    setError("");

    try {
      const res = await fetch(`/api/escrows/${escrow.id}/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          reason: "Seller initiated refund"
        })
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to refund");
      }

      setNotice("Buyer refunded.");
      await loadEscrow();
    } catch (err: any) {
      setError(err?.message ?? "Unable to refund buyer");
    } finally {
      setActionBusy(false);
    }
  }

  async function openDispute() {
    if (!escrow) return;
    if (!disputeReason.trim()) {
      setError("Enter a dispute reason first");
      return;
    }

    setActionBusy(true);
    setNotice("");
    setError("");

    try {
      const res = await fetch(`/api/escrows/${escrow.id}/dispute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          reason: disputeReason.trim()
        })
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to open dispute");
      }

      setNotice("Dispute opened.");
      setDisputeReason("");
      await loadEscrow();
    } catch (err: any) {
      setError(err?.message ?? "Unable to open dispute");
    } finally {
      setActionBusy(false);
    }
  }

  async function sendChatMessage() {
    if (!escrow) return;
    if (!chatMessage.trim()) return;

    setChatBusy(true);
    setChatError("");
    setNotice("");

    try {
      const res = await fetch(`/api/escrows/${escrow.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: chatMessage.trim()
        })
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to send message");
      }

      setChatMessage("");
      setNotice("Message sent.");
    } catch (err: any) {
      setChatError(err?.message ?? "Unable to send message");
    } finally {
      setChatBusy(false);
    }
  }

  const accessToken = escrow ? getAccessibleToken(escrow, user?.uid) : null;

  if (loading || loadingEscrow) {
    return <AuthLoading />;
  }

  if (!profile || profile.isDisabled) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="rounded-3xl border bg-white p-8 shadow-soft">
          <p className="text-sm text-slate-600">Your account is unavailable.</p>
        </div>
      </main>
    );
  }

  if (!escrow) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="rounded-3xl border bg-white p-8 shadow-soft">
          <h1 className="text-2xl font-semibold">Escrow not found</h1>
          <p className="mt-2 text-sm text-slate-600">
            This deal link is invalid or the escrow no longer exists.
          </p>
          <button
            onClick={() => router.push("/dashboard/escrows")}
            className="mt-6 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Go to escrows
          </button>
        </div>
      </main>
    );
  }

  const buyerName = buyer?.fullName ?? escrow.buyerEmail;
  const sellerName = seller?.fullName ?? escrow.sellerEmail;

  const canChat =
    profile.role === "admin" ||
    profile.role === "super_admin" ||
    accessRole === "buyer" ||
    accessRole === "seller";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-3xl border bg-white p-6 shadow-soft">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm text-slate-500">Escrow deal</p>
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
                You are viewing this as{" "}
                <span className="font-medium text-slate-900">
                  {accessRole ?? "participant"}
                </span>
              </p>
            </div>

            <button
              onClick={() => router.push("/dashboard/escrows")}
              className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700"
            >
              Back to history
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <InfoCard label="Amount" value={formatMoney(escrow.amount)} />
            <InfoCard label="Escrow fee" value={formatMoney(escrow.feeAmount)} />
            <InfoCard label="Buyer pays" value={formatMoney(escrow.buyerPaysAmount)} />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <InfoCard label="Seller receives" value={formatMoney(escrow.sellerReceivesAmount)} />
            <InfoCard label="Buyer" value={buyerName} />
            <InfoCard label="Seller" value={sellerName} />
          </div>

          <div className="mt-6 rounded-2xl border bg-slate-50 p-4 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-900">Buyer token link:</span>{" "}
              {accessRole === "buyer" ? buildLink(`/e/${token}`) : "hidden"}
            </p>
            <p className="mt-1">
              <span className="font-medium text-slate-900">Seller token link:</span>{" "}
              {accessRole === "seller" ? buildLink(`/e/${token}`) : "hidden"}
            </p>
            <p className="mt-1">
              <span className="font-medium text-slate-900">Payment reference:</span>{" "}
              {escrow.paymentReference ?? "Not set yet"}
            </p>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {notice ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {notice}
          </div>
        ) : null}

        <section className="rounded-3xl border bg-white p-6 shadow-soft">
          <h2 className="text-xl font-semibold">Actions</h2>

          <div className="mt-5 flex flex-col gap-3 md:flex-row md:flex-wrap">
            {accessRole === "buyer" &&
            (escrow.status === "invited" ||
              escrow.status === "accepted" ||
              escrow.status === "awaiting_payment") ? (
              <button
                onClick={acceptAndPay}
                disabled={actionBusy}
                className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
              >
                Accept deal & pay
              </button>
            ) : null}

            {accessRole === "buyer" &&
            (escrow.status === "funded" || escrow.status === "in_progress") ? (
              <>
                <button
                  onClick={confirmReceipt}
                  disabled={actionBusy}
                  className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
                >
                  Confirm received
                </button>

                <div className="flex flex-col gap-3 md:min-w-[320px]">
                  <input
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="Reason for dispute"
                    className="w-full rounded-xl border px-4 py-3 outline-none"
                  />
                  <button
                    onClick={openDispute}
                    disabled={actionBusy}
                    className="rounded-xl border px-4 py-3 text-sm font-medium text-slate-700 disabled:opacity-60"
                  >
                    Open dispute
                  </button>
                </div>
              </>
            ) : null}

            {accessRole === "seller" &&
            (escrow.status === "funded" ||
              escrow.status === "in_progress" ||
              escrow.status === "accepted") ? (
              <>
                <button
                  onClick={refundBuyer}
                  disabled={actionBusy}
                  className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
                >
                  Refund buyer
                </button>

                <div className="flex flex-col gap-3 md:min-w-[320px]">
                  <input
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="Reason for dispute"
                    className="w-full rounded-xl border px-4 py-3 outline-none"
                  />
                  <button
                    onClick={openDispute}
                    disabled={actionBusy}
                    className="rounded-xl border px-4 py-3 text-sm font-medium text-slate-700 disabled:opacity-60"
                  >
                    Open dispute
                  </button>
                </div>
              </>
            ) : null}

            {profile.role === "admin" || profile.role === "super_admin" ? (
              <button
                onClick={async () => {
                  setActionBusy(true);
                  setError("");
                  try {
                    const res = await fetch(`/api/escrows/${escrow.id}/release`, {
                      method: "POST"
                    });
                    const data = (await res.json()) as { error?: string };
                    if (!res.ok) throw new Error(data.error ?? "Failed to release");
                    setNotice("Admin release completed.");
                    await loadEscrow();
                  } catch (err: any) {
                    setError(err?.message ?? "Unable to force release");
                  } finally {
                    setActionBusy(false);
                  }
                }}
                disabled={actionBusy}
                className="rounded-xl border px-4 py-3 text-sm font-medium text-slate-700 disabled:opacity-60"
              >
                Force release
              </button>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border bg-white p-6 shadow-soft">
          <h2 className="text-xl font-semibold">Transaction details</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <InfoCard label="Created" value={escrow.createdAt} />
            <InfoCard label="Updated" value={escrow.updatedAt} />
            <InfoCard label="Released at" value={escrow.releasedAt ?? "—"} />
            <InfoCard label="Refunded at" value={escrow.refundedAt ?? "—"} />
            <InfoCard label="Dispute opened at" value={escrow.disputeOpenedAt ?? "—"} />
            <InfoCard label="Access token" value={accessToken ?? "—"} />
          </div>
        </section>

        <section className="rounded-3xl border bg-white p-6 shadow-soft">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Chat</h2>
              <p className="mt-1 text-sm text-slate-600">
                Keep all deal messages inside this escrow so the record stays complete.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3 rounded-2xl border bg-slate-50 p-4">
            {messages.length === 0 ? (
              <p className="text-sm text-slate-600">No messages yet.</p>
            ) : (
              messages.map((item) => {
                const mine = item.senderId === user?.uid;
                return (
                  <div
                    key={item.id}
                    className={[
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                      mine
                        ? "ml-auto bg-slate-900 text-white"
                        : "bg-white text-slate-800"
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
                        {item.senderName}
                      </span>
                      <span className="text-[11px] opacity-70">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-2 leading-6">{item.message}</p>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {canChat ? (
            <>
              {chatError ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {chatError}
                </div>
              ) : null}

              <div className="mt-5 flex flex-col gap-3 md:flex-row">
                <textarea
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Write a message..."
                  rows={4}
                  className="min-h-[110px] w-full rounded-2xl border px-4 py-3 outline-none"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={chatBusy || !chatMessage.trim()}
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-60 md:self-end"
                >
                  {chatBusy ? "Sending..." : "Send"}
                </button>
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-2xl border bg-slate-50 p-4 text-sm text-slate-600">
              Chat is available only to the buyer, seller, and admins.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function InfoCard({
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

function buildLink(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}${path}`;
        }
