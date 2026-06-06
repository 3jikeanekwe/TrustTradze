"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import AuthLoading from "@/components/auth-loading";
import { useAuth } from "@/hooks/use-auth";

const CATEGORIES = [
  "Repair",
  "Logistics",
  "Freelancing",
  "Construction",
  "Technology",
  "Education",
  "Consulting",
  "Other"
] as const;

const LOCATION_TYPES = ["Physical", "Home Service", "Online"] as const;

export default function NewServicePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Repair");
  const [locationType, setLocationType] = useState<(typeof LOCATION_TYPES)[number]>("Physical");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (loading) return <AuthLoading />;

  if (!user) {
    router.push("/login?next=/dashboard/services/new");
    return null;
  }

  async function handleCreate() {
    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: title.trim(),
          price: Number(price),
          category,
          locationType,
          location: location.trim()
        })
      });

      const data = (await res.json()) as
        | { ok: true; service: { id: string } }
        | { error?: string };

      if (!res.ok || !("ok" in data)) {
        throw new Error("error" in data && data.error ? data.error : "Failed to create service");
      }

      router.push(`/dashboard/services/${data.service.id}`);
    } catch (err: any) {
      setError(err?.message ?? "Unable to create service");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-white p-6 shadow-soft">
        <h2 className="text-2xl font-semibold">Add Service</h2>
        <p className="mt-2 text-sm text-slate-600">
          Add a service listing for physical, home service, or online work.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Title" value={title} onChange={setTitle} />
          <Field label="Price (NGN)" value={price} onChange={setPrice} type="number" />
          <Field label="Location" value={location} onChange={setLocation} />

          <label className="block">
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

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Location type</span>
            <select
              value={locationType}
              onChange={(e) => setLocationType(e.target.value as (typeof LOCATION_TYPES)[number])}
              className="w-full rounded-xl border bg-white px-4 py-3 outline-none"
            >
              {LOCATION_TYPES.map((item) => (
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
          {busy ? "Saving..." : "Save service"}
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
