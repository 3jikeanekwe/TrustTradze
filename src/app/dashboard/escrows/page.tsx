"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  buyerPaysAmount: number;
  sellerReceivesAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  buyerToken: string;
  sellerToken: string;
};

export default function EscrowsPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<EscrowItem[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadEscrows(uid: string) {
    setPageLoading(true);
    setError("");

    try {
      const queries = [
        query(collection(firebaseDb(), "escrows"), where("creatorId", "==", uid), orderBy("createdAt", "desc")),
        query(collection(firebaseDb(), "escrows"), where("buyerId", "==", uid), orderBy("createdAt", "desc")),
        query(collection(firebaseDb(), "escrows"), where("sellerId", "==", uid), orderBy("createdAt", "desc"))
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

  if (loading || pageLoading) return <AuthLoading />;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Escrow History</h2>
            <p className="mt-2 text-sm text-slate-600">
              Track every escrow deal you created or participated in.
            </p>
          </div>

          <Link
            href="/dashboard/escrows/new"
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
          >
            Create new escrow
          </Link>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-3xl border bg-white p-6 shadow-soft">
          <p className="text-sm text-slate-600">No escrow deals yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => {
            const token = getAccessibleToken(item as any, user?.uid);

            return (
              <article key={item.id} className="rounded-3xl border bg-white p-6 shadow-soft">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.categoryGroup} / {item.category}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      Status: <span className="font-medium text-slate-900">{getEscrowStatusLabel(item.status as any)}</span>
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      Amount: <span className="font-medium text-slate-900">{formatMoney(item.amount)}</span>
                    </p>
                  </div>

                  {token ? (
                    <div className="flex flex-col gap-3">
                      <Link
                        href={`/e/${token}`}
                        className="rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white"
                      >
                        Open deal
                      </Link>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
          }
