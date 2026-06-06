"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

export default function ServicesPage() {
  const [items, setItems] = useState<ServiceView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadServices() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/services?limit=48", {
        cache: "no-store"
      });

      const data = (await res.json()) as { ok?: boolean; services?: ServiceView[]; error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load services");
      }

      setItems(data.services ?? []);
    } catch (err: any) {
      setError(err?.message ?? "Unable to load services");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadServices();
  }, []);

  if (loading) return <AuthLoading />;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Services</h2>
            <p className="mt-2 text-sm text-slate-600">
              Browse service providers and location-based, home, or online service listings.
            </p>
          </div>

          <Link
            href="/dashboard/services/new"
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
          >
            Add service
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
          <p className="text-sm text-slate-600">No services found.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-3xl border bg-white p-5 shadow-soft">
              <div className="mt-1">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Service</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.category}</p>
                <p className="mt-1 text-sm text-slate-600">{item.locationType}</p>
                <p className="mt-1 text-sm text-slate-600">{item.location}</p>
                <p className="mt-3 text-base font-semibold text-slate-950">
                  {formatMoney(item.price)}
                </p>
              </div>

              <div className="mt-4 rounded-2xl border bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-medium text-slate-900">{item.provider?.fullName ?? "Provider"}</p>
                <p className="mt-1 break-words">{item.provider?.email}</p>
                <p className="mt-1">{item.provider?.phoneNumber ?? "No WhatsApp number"}</p>
                <p className="mt-1">
                  {item.provider?.state ? `${item.provider.state}${item.provider.city ? `, ${item.provider.city}` : ""}` : "No location"}
                </p>
              </div>

              <div className="mt-4 flex flex-col gap-3">
                <Link
                  href={`/dashboard/services/${item.id}`}
                  className="rounded-xl border px-4 py-3 text-center text-sm font-medium text-slate-700"
                >
                  View service
                </Link>

                <Link
                  href={`/dashboard/escrows/new?serviceId=${item.id}`}
                  className="rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white"
                >
                  Start escrow
                </Link>

                {item.provider?.whatsappUrl ? (
                  <a
                    href={item.provider.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border px-4 py-3 text-center text-sm font-medium text-slate-700"
                  >
                    WhatsApp provider
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
              }
