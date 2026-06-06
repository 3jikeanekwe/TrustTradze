"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import AuthLoading from "@/components/auth-loading";
import { formatMoney, buildWhatsAppUrl } from "@/lib/marketplace";

type ProductView = {
  id: string;
  sellerId: string;
  title: string;
  price: number;
  category: string;
  youtubeUrl: string;
  youtubeEmbedUrl: string;
  location: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  seller: {
    uid: string;
    fullName: string;
    email: string;
    phoneNumber: string | null;
    whatsappUrl: string | null;
    state: string | null;
    city: string | null;
  } | null;
};

export default function ProductDetailPage() {
  const params = useParams<{ productId: string }>();
  const [item, setItem] = useState<ProductView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/products/${params.productId}`, {
          cache: "no-store"
        });
        const data = (await res.json()) as { ok?: boolean; product?: ProductView; error?: string };

        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load product");
        }

        if (!cancelled) {
          setItem(data.product ?? null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? "Unable to load product");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [params.productId]);

  if (loading) return <AuthLoading />;

  if (error) {
    return (
      <div className="rounded-3xl border bg-white p-6 shadow-soft">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="rounded-3xl border bg-white p-6 shadow-soft">
        <p className="text-sm text-slate-600">Product not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm text-slate-500">Product</p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-950">{item.title}</h1>
            <p className="mt-2 text-sm text-slate-600">{item.category}</p>
            <p className="mt-1 text-sm text-slate-600">{item.location}</p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">{formatMoney(item.price)}</p>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href={`/dashboard/escrows/new?productId=${item.id}`}
              className="rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white"
            >
              Start escrow
            </Link>
            <Link
              href="/dashboard/products"
              className="rounded-xl border px-4 py-3 text-center text-sm font-medium text-slate-700"
            >
              Back to products
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border bg-white p-6 shadow-soft">
        <div className="aspect-video overflow-hidden rounded-2xl border bg-slate-100">
          <iframe
            src={item.youtubeEmbedUrl}
            title={item.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </section>

      <section className="rounded-3xl border bg-white p-6 shadow-soft">
        <h2 className="text-xl font-semibold">Seller information</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <InfoCard label="Seller name" value={item.seller?.fullName ?? "Seller"} />
          <InfoCard label="Email" value={item.seller?.email ?? "—"} />
          <InfoCard label="WhatsApp" value={item.seller?.phoneNumber ?? "—"} />
          <InfoCard label="Location" value={item.seller?.state ? `${item.seller.state}${item.seller.city ? `, ${item.seller.city}` : ""}` : "—"} />
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row">
          <Link
            href={`/dashboard/users/${item.sellerId}`}
            className="rounded-xl border px-4 py-3 text-center text-sm font-medium text-slate-700"
          >
            View seller profile
          </Link>

          {item.seller?.whatsappUrl ? (
            <a
              href={item.seller.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border px-4 py-3 text-center text-sm font-medium text-slate-700"
            >
              Open WhatsApp
            </a>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border bg-white p-6 shadow-soft">
        <h2 className="text-xl font-semibold">Escrow reminder</h2>
        <p className="mt-2 text-sm text-slate-600">
          Create the escrow, share the correct link, and remember to confirm so the funds can be released to the seller.
        </p>
      </section>
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
