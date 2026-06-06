"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import AuthLoading from "@/components/auth-loading";
import { formatMoney } from "@/lib/marketplace";

type ServiceView = {
  id: string;
  providerId: string;
  title: string;
  price: number;
  category: string;
  locationType: string;
  location: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  provider: {
    uid: string;
    fullName: string;
    email: string;
    phoneNumber: string | null;
    whatsappUrl: string | null;
    state: string | null;
    city: string | null;
  } | null;
};

export default function ServiceDetailPage() {
  const params = useParams<{ serviceId: string }>();
  const [item, setItem] = useState<ServiceView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/services/${params.serviceId}`, {
          cache: "no-store"
        });
        const data = (await res.json()) as { ok?: boolean; service?: ServiceView; error?: string };

        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load service");
        }

        if (!cancelled) {
          setItem(data.service ?? null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? "Unable to load service");
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
  }, [params.serviceId]);

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
        <p className="text-sm text-slate-600">Service not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm text-slate-500">Service</p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-950">{item.title}</h1>
            <p className="mt-2 text-sm text-slate-600">{item.category}</p>
            <p className="mt-1 text-sm text-slate-600">{item.locationType}</p>
            <p className="mt-1 text-sm text-slate-600">{item.location}</p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">{formatMoney(item.price)}</p>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href={`/dashboard/escrows/new?serviceId=${item.id}`}
              className="rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white"
            >
              Start escrow
            </Link>
            <Link
              href="/dashboard/services"
              className="rounded-xl border px-4 py-3 text-center text-sm font-medium text-slate-700"
            >
              Back to services
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border bg-white p-6 shadow-soft">
        <h2 className="text-xl font-semibold">Provider information</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <InfoCard label="Provider name" value={item.provider?.fullName ?? "Provider"} />
          <InfoCard label="Email" value={item.provider?.email ?? "—"} />
          <InfoCard label="WhatsApp" value={item.provider?.phoneNumber ?? "—"} />
          <InfoCard
            label="Location"
            value={item.provider?.state ? `${item.provider.state}${item.provider.city ? `, ${item.provider.city}` : ""}` : "—"}
          />
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row">
          <Link
            href={`/dashboard/users/${item.providerId}`}
            className="rounded-xl border px-4 py-3 text-center text-sm font-medium text-slate-700"
          >
            View provider profile
          </Link>

          {item.provider?.whatsappUrl ? (
            <a
              href={item.provider.whatsappUrl}
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
          Create the escrow, share the correct link, and remember to confirm so the funds can be released to the seller or service provider.
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
