"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AuthLoading from "@/components/auth-loading";
import { formatMoney } from "@/lib/marketplace";

type ProductView = {
  id: string;
  sellerId: string;
  title: string;
  price: number;
  category: string;
  youtubeEmbedUrl: string;
  location: string;
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

type ServiceView = {
  id: string;
  providerId: string;
  title: string;
  price: number;
  category: string;
  locationType: string;
  location: string;
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

type UserView = {
  uid: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  whatsappUrl: string | null;
  state: string | null;
  city: string | null;
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [products, setProducts] = useState<ProductView[]>([]);
  const [services, setServices] = useState<ServiceView[]>([]);
  const [users, setUsers] = useState<UserView[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");

  async function runSearch(searchTerm: string) {
    setLoading(true);
    setError("");

    try {
      const url = searchTerm.trim()
        ? `/api/search?q=${encodeURIComponent(searchTerm.trim())}`
        : "/api/search";

      const res = await fetch(url, {
        cache: "no-store"
      });

      const data = (await res.json()) as {
        ok?: boolean;
        products?: ProductView[];
        services?: ServiceView[];
        users?: UserView[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Search failed");
      }

      setProducts(data.products ?? []);
      setServices(data.services ?? []);
      setUsers(data.users ?? []);
      setSubmittedQuery(searchTerm.trim());
    } catch (err: any) {
      setError(err?.message ?? "Unable to search");
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    void runSearch("");
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await runSearch(query);
  }

  if (initialLoading) return <AuthLoading />;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-white p-6 shadow-soft">
        <h2 className="text-2xl font-semibold">Search</h2>
        <p className="mt-2 text-sm text-slate-600">
          Search products, services, and users across TrustTradze.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 md:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rice, generator, repair, seller name..."
            className="w-full rounded-xl border px-4 py-3 outline-none md:max-w-xl"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {submittedQuery ? (
          <p className="mt-4 text-sm text-slate-600">
            Showing results for <span className="font-medium text-slate-900">{submittedQuery}</span>
          </p>
        ) : null}
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <ResultSection
        title="Products"
        emptyText="No products found."
        items={products.map((item) => (
          <article key={item.id} className="rounded-3xl border bg-white p-5 shadow-soft">
            <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{item.category}</p>
            <p className="mt-1 text-sm text-slate-600">{item.location}</p>
            <p className="mt-3 text-base font-semibold text-slate-950">{formatMoney(item.price)}</p>

            <div className="mt-4 rounded-2xl border bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-medium text-slate-900">{item.seller?.fullName ?? "Seller"}</p>
              <p className="mt-1">{item.seller?.email}</p>
              <p className="mt-1">{item.seller?.phoneNumber ?? "No WhatsApp number"}</p>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <Link
                href={`/dashboard/products/${item.id}`}
                className="rounded-xl border px-4 py-3 text-center text-sm font-medium text-slate-700"
              >
                Open product
              </Link>
              <Link
                href={`/dashboard/escrows/new?productId=${item.id}`}
                className="rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white"
              >
                Start escrow
              </Link>
            </div>
          </article>
        ))}
      />

      <ResultSection
        title="Services"
        emptyText="No services found."
        items={services.map((item) => (
          <article key={item.id} className="rounded-3xl border bg-white p-5 shadow-soft">
            <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{item.category}</p>
            <p className="mt-1 text-sm text-slate-600">{item.locationType}</p>
            <p className="mt-1 text-sm text-slate-600">{item.location}</p>
            <p className="mt-3 text-base font-semibold text-slate-950">{formatMoney(item.price)}</p>

            <div className="mt-4 rounded-2xl border bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-medium text-slate-900">{item.provider?.fullName ?? "Provider"}</p>
              <p className="mt-1">{item.provider?.email}</p>
              <p className="mt-1">{item.provider?.phoneNumber ?? "No WhatsApp number"}</p>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <Link
                href={`/dashboard/services/${item.id}`}
                className="rounded-xl border px-4 py-3 text-center text-sm font-medium text-slate-700"
              >
                Open service
              </Link>
              <Link
                href={`/dashboard/escrows/new?serviceId=${item.id}`}
                className="rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white"
              >
                Start escrow
              </Link>
            </div>
          </article>
        ))}
      />

      <ResultSection
        title="Users"
        emptyText="No users found."
        items={users.map((item) => (
          <article key={item.uid} className="rounded-3xl border bg-white p-5 shadow-soft">
            <h3 className="text-lg font-semibold text-slate-950">{item.fullName}</h3>
            <p className="mt-1 text-sm text-slate-600">{item.email}</p>
            <p className="mt-1 text-sm text-slate-600">{item.phoneNumber ?? "No WhatsApp number"}</p>
            <p className="mt-1 text-sm text-slate-600">
              {item.state ? `${item.state}${item.city ? `, ${item.city}` : ""}` : "No location"}
            </p>

            <div className="mt-4 flex flex-col gap-3">
              <Link
                href={`/dashboard/users/${item.uid}`}
                className="rounded-xl border px-4 py-3 text-center text-sm font-medium text-slate-700"
              >
                View profile
              </Link>
              {item.whatsappUrl ? (
                <a
                  href={item.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white"
                >
                  WhatsApp
                </a>
              ) : null}
            </div>
          </article>
        ))}
      />
    </div>
  );
}

function ResultSection({
  title,
  emptyText,
  items
}: {
  title: string;
  emptyText: string;
  items: React.ReactNode[];
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      {items.length === 0 ? (
        <div className="rounded-3xl border bg-white p-6 shadow-soft">
          <p className="text-sm text-slate-600">{emptyText}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items}</div>
      )}
    </section>
  );
          }
