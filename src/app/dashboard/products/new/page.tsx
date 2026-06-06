"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import AuthLoading from "@/components/auth-loading";
import { useAuth } from "@/hooks/use-auth";

const CATEGORIES = [
  "Agriculture",
  "Electronics",
  "Fashion",
  "Vehicles",
  "Construction",
  "Home & Living",
  "Industrial",
  "Other"
] as const;

export default function NewProductPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Agriculture");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (loading) return <AuthLoading />;

  if (!user) {
    router.push("/login?next=/dashboard/products/new");
    return null;
  }

  async function handleCreate() {
    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: title.trim(),
          price: Number(price),
          category,
          youtubeUrl: youtubeUrl.trim(),
          location: location.trim()
        })
      });

      const data = (await res.json()) as
        | { ok: true; product: { id: string } }
        | { error?: string };

      if (!res.ok || !("ok" in data)) {
        throw new Error("error" in data && data.error ? data.error : "Failed to create product");
      }

      router.push(`/dashboard/products/${data.product.id}`);
    } catch (err: any) {
      setError(err?.message ?? "Unable to create product");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-white p-6 shadow-soft">
        <h2 className="text-2xl font-semibold">Add Product</h2>
        <p className="mt-2 text-sm text-slate-600">
          Upload your video to YouTube, paste the link here, and TrustTradze will render it inside the app.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Title" value={title} onChange={setTitle} />
          <Field label="Price (NGN)" value={price} onChange={setPrice} type="number" />
          <Field label="YouTube URL" value={youtubeUrl} onChange={setYoutubeUrl} />
          <Field label="Location" value={location} onChange={setLocation} />

          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
              className="w-full rounded-xl border bg-white px-4 py-3 outline-none"
            >
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button
          onClick={handleCreate}
          disabled={busy}
          className="mt-6 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {busy ? "Saving..." : "Save product"}
        </button>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border bg-white px-4 py-3 outline-none ring-0 focus:border-slate-900"
      />
    </label>
  );
    }
