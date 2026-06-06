"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import AuthLoading from "@/components/auth-loading";
import { formatMoney } from "@/lib/marketplace";

type UserView = {
  uid: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  whatsappUrl: string | null;
  state: string | null;
  city: string | null;
};

type ProductView = {
  id: string;
  title: string;
  price: number;
  category: string;
  youtubeEmbedUrl: string;
  location: string;
};

type ServiceView = {
  id: string;
  title: string;
  price: number;
  category: string;
  locationType: string;
  location: string;
};

export default function UserProfilePage() {
  const params = useParams<{ uid: string }>();
  const [user, setUser] = useState<UserView | null>(null);
  const [products, setProducts] = useState<ProductView[]>([]);
  const [services, setServices] = useState<ServiceView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/users/${params.uid}`, {
          cache: "no-store"
        });

        const data = (await res.json()) as {
          ok?: boolean;
          user?: UserView;
          products?: ProductView[];
          services?: ServiceView[];
          error?: string;
        };

        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load user");
        }

        if (!cancelled) {
          setUser(data.user ?? null);
          setProducts(data.products ?? []);
          setServices(data.services ?? []);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? "Unable to load user profile");
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
  }, [params.uid]);

  if (loading) return <AuthLoading />;

  if (error) {
    return (
      <div className="rounded-3xl border bg-white p-6 shadow-soft">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-3xl border bg-white p-6 shadow-soft">
        <p className="text-sm text-slate-600">User not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-white p-6 shadow-soft">
        <h1 className="text-3xl font-semibold text-slate-950">{user.fullName}</h1>
        <p className="mt-2 text-sm text-slate-600">{user.email}</p>
        <p className="mt-1 text-sm text-slate-600">{user.phoneNumber ?? "No WhatsApp number"}</p>
        <p className="mt-1 text-sm text-slate-600">
          {user.state ? `${user.state}${user.city ? `, ${user.city}` : ""}` : "No location"}
        </p>

        <div className="mt-6 flex flex-col gap-3 md:flex-row">
          <Link
            href="/dashboard/search"
            className="rounded-xl border px-4 py-3 text-center text-sm font-medium text-slate-700"
          >
            Back to search
          </Link>
          {user.whatsappUrl ? (
            <a
              href={user.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white"
            >
              Open WhatsApp
            </a>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-950">Products</h2>
        {products.length === 0 ? (
          <div className="rounded-3xl border bg-white p-6 shadow-soft">
            <p className="text-sm text-slate-600">No products listed.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {products.map((item) => (
              <article key={item.id} className="rounded-3xl border bg-white p-5 shadow-soft">
                <div className="aspect-video overflow-hidden rounded-2xl border bg-slate-100">
                  <iframe
                    src={item.youtubeEmbedUrl}
                    title={item.title}
                    className="h-full w-full"
                    allowFullScreen
                  />
                </div>

                <h3 className="mt-4 text-lg font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{item.category}</p>
                <p className="mt-1 text-sm text-slate-600">{item.location}</p>
                <p className="mt-3 text-base font-semibold text-slate-950">
                  {formatMoney(item.price)}
                </p>

                <Link
                  href={`/dashboard/products/${item.id}`}
                  className="mt-4 inline-block rounded-xl border px-4 py-3 text-sm font-medium text-slate-700"
                >
                  Open product
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-950">Services</h2>
        {services.length === 0 ? (
          <div className="rounded-3xl border bg-white p-6 shadow-soft">
            <p className="text-sm text-slate-600">No services listed.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {services.map((item) => (
              <article key={item.id} className="rounded-3xl border bg-white p-5 shadow-soft">
                <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{item.category}</p>
                <p className="mt-1 text-sm text-slate-600">{item.locationType}</p>
                <p className="mt-1 text-sm text-slate-600">{item.location}</p>
                <p className="mt-3 text-base font-semibold text-slate-950">
                  {formatMoney(item.price)}
                </p>

                <Link
                  href={`/dashboard/services/${item.id}`}
                  className="mt-4 inline-block rounded-xl border px-4 py-3 text-sm font-medium text-slate-700"
                >
                  Open service
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
  }
