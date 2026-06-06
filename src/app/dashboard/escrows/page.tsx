"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
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
  getEscrowStatusLabel
} from "@/lib/escrow";

type EscrowItem = {
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
  status: string;
  createdAt: string;
  updatedAt: string;
  buyerToken: string;
  sellerToken: string;
  buyerEmail: string;
  sellerEmail: string;
  paymentReference?: string | null;
  releasedAt?: string | null;
  refundedAt?: string | null;
  disputeOpenedAt?: string | null;
};

const STATUS_FILTERS = [
  "all",
  "created",
  "invited",
  "accepted",
  "awaiting_payment",
  "funded",
  "in_progress",
  "completed",
  "refund_requested",
  "refunded",
  "disputed",
  "cancelled"
] as const;

const ROLE_FILTERS = ["all", "created", "buyer", "seller"] as const;

export default function EscrowsPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<EscrowItem[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [roleFilter, setRoleFilter] = useState<(typeof ROLE_FILTERS)[number]>("all");
  const [searchTerm, setSearchTerm] = useState("");

  async function loadEscrows(uid: string) {
    setPageLoading(true);
    setError("");

    try {
      const queries = [
        query(
          collection(firebaseDb(), "escrows"),
          where("creatorId", "==", uid),
          orderBy("createdAt", "desc")
        ),
        query(
          collection(firebaseDb(), "escrows"),
          where("buyerId", "==", uid),
          orderBy("createdAt", "desc")
        ),
        query(
          collection(firebaseDb(), "escrows"),
          where("sellerId", "==", uid),
          orderBy("createdAt", "desc")
        )
      ];

      const snapshots = await Promise.all(queries.map((q) => getDocs(q)));

      const merged = snapshots.flatMap((snapshot) =>
        snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<EscrowItem, "id">)
        }))
      );

      const unique = Array.from(new Map(merged.map((item) => [item.id, item])).values());

      unique.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems(unique);
    } catch (err: any) {
      setError(err?.message ?? "Unable to load escrows");
    } finally {
      setPageLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      void loadEscrows(user.uid);
    }
  }, [user]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return items.filter((item) => {
      const statusMatch = statusFilter === "all" || item.status === statusFilter;

      const roleMatch =
        roleFilter === "all"
          ? true
          : roleFilter === "created"
            ? item.creatorId === user?.uid
            : roleFilter === "buyer"
              ? item.buyerId === user?.uid
              : item.sellerId === user?.uid;

      const searchMatch =
        !term ||
        item.title.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        item.categoryGroup.toLowerCase().includes(term) ||
        item.buyerEmail.toLowerCase().includes(term) ||
        item.sellerEmail.toLowerCase().includes(term);

      return statusMatch && roleMatch && searchMatch;
    });
  }, [items, roleFilter, searchTerm, statusFilter, user?.uid]);

  const stats = useMemo(() => {
    const all = items.length;
    const funded = items.filter((item) => item.status === "funded").length;
    const completed = items.filter((item) => item.status === "completed").length;
    const disputed = items.filter((item) => item.status === "disputed").length;

    return { all, funded, completed, disputed };
  }, [items]);

  if (loading || pageLoading) return <AuthLoading />;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Escrow History</h2>
            <p className="mt-2 text-sm text-slate-600">
              Track every escrow you created, joined, funded, refunded, disputed, or completed.
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Remember to confirm when you receive the product or service so the funds can be released.
            </p>
          </div>

          <Link
            href="/dashboard/escrows/new"
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
          >
            Create new escrow
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <StatCard label="All" value={stats.all} />
          <StatCard label="Funded" value={stats.funded} />
          <StatCard label="Completed" value={stats.completed} />
          <StatCard label="Disputed" value={stats.disputed} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Search</span>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search title, category, email..."
              className="w-full rounded-xl border bg-white px-4 py-3 outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as (typeof STATUS_FILTERS)[number])}
              className="w-full rounded-xl border bg-white px-4 py-3 outline-none"
            >
              {STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {status === "all" ? "All statuses" : getEscrowStatusLabel(status as any)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">My role</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as (typeof ROLE_FILTERS)[number])}
              className="w-full rounded-xl border bg-white px-4 py-3 outline-none"
            >
              <option value="all">All deals</option>
              <option value="created">Created by me</option>
              <option value="buyer">I am buyer</option>
              <option value="seller">I am seller</option>
            </select>
          </label>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {filteredItems.length === 0 ? (
        <div className="rounded-3xl border bg-white p-6 shadow-soft">
          <p className="text-sm text-slate-600">No escrow deals match your filters.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredItems.map((item) => {
            const token = getAccessibleToken(item as any, user?.uid);

            return (
              <article key={item.id} className="rounded-3xl border bg-white p-6 shadow-soft">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
                      <span className="rounded-full border bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {getEscrowStatusLabel(item.status as any)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-600">
                      {item.categoryGroup} / {item.category}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Amount: <span className="font-medium text-slate-900">{formatMoney(item.amount)}</span>
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Buyer pays: <span className="font-medium text-slate-900">{formatMoney(item.buyerPaysAmount)}</span>
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Seller receives:{" "}
                      <span className="font-medium text-slate-900">{formatMoney(item.sellerReceivesAmount)}</span>
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Created: <span className="font-medium text-slate-900">{new Date(item.createdAt).toLocaleString()}</span>
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 md:min-w-[220px]">
                    <Link
                      href={`/dashboard/escrows/${item.id}`}
                      className="rounded-xl border px-4 py-3 text-center text-sm font-medium text-slate-700"
                    >
                      Open dashboard detail
                    </Link>

                    {token ? (
                      <Link
                        href={`/e/${token}`}
                        className="rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white"
                      >
                        Open deal page
                      </Link>
                    ) : (
                      <div className="rounded-xl border bg-slate-50 px-4 py-3 text-center text-sm text-slate-500">
                        No private token link
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <InfoCard label="Buyer" value={item.buyerEmail} />
                  <InfoCard label="Seller" value={item.sellerEmail} />
                  <InfoCard label="Payment reference" value={item.paymentReference ?? "Not set yet"} />
                  <InfoCard label="Updated" value={new Date(item.updatedAt).toLocaleString()} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
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
