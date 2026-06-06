"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AuthLoading from "@/components/auth-loading";
import { useAuth } from "@/hooks/use-auth";
import { formatMoney } from "@/lib/escrow";

const PRODUCT_CATEGORIES = [
  "Agriculture",
  "Electronics",
  "Fashion",
  "Vehicles",
  "Construction",
  "Home & Living",
  "Industrial",
  "Other"
] as const;

const SERVICE_CATEGORIES = [
  "Repair",
  "Logistics",
  "Freelancing",
  "Construction",
  "Technology",
  "Education",
  "Consulting",
  "Other"
] as const;

export default function NewEscrowPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [title, setTitle] = useState("");
  const [categoryGroup, setCategoryGroup] = useState<"products" | "services">("products");
  const [category, setCategory] = useState(PRODUCT_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{
    buyerLink: string;
    sellerLink: string;
    escrowId: string;
  } | null>(null);

  const categories = useMemo(() => {
    return categoryGroup === "products" ? PRODUCT_CATEGORIES : SERVICE_CATEGORIES;
  }, [categoryGroup]);

  useEffect(() => {
    setCategory(categories[0]);
  }, [categories]);

  if (loading) return <AuthLoading />;

  if (!user) {
    router.push("/login?next=/dashboard/escrows/new");
    return null;
  }

  async function handleCreate() {
    setBusy(true);
    setError("");
    setSuccess(null);

    try {
      const res = await fetch("/api/escrows/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: title.trim(),
          categoryGroup,
          category,
          amount: Number(amount),
          buyerEmail: buyerEmail.trim(),
          sellerEmail: sellerEmail.trim()
        })
      });

      const data = (await res.json()) as
        | {
            ok: true;
            buyerLink: string;
            sellerLink: string;
            escrow: { id: string };
          }
        | { error?: string };

      if (!res.ok || !("ok" in data)) {
        throw new Error("error" in data && data.error ? data.error : "Failed to create escrow");
      }

      setSuccess({
        buyerLink: data.buyerLink,
        sellerLink: data.sellerLink,
        escrowId: data.escrow.id
      });
    } catch (err: any) {
      setError(err?.message ?? "Unable to create escrow");
    } finally {
      setBusy(false);
    }
  }

  const amountNumber = Number(amount || 0);
  const feeAmount = Math.round(amountNumber * 0.02);
  const buyerPays = amountNumber + feeAmount;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-white p-6 shadow-soft">
        <h2 className="text-2xl font-semibold">Create Escrow</h2>
        <p className="mt-2 text-sm text-slate-600">
          Start a product, service, or custom deal and share the generated link.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Title" value={title} onChange={setTitle} />
          <Field label="Amount (NGN)" value={amount} onChange={setAmount} type="number" />
          <Field label="Buyer email" value={buyerEmail} onChange={setBuyerEmail} type="email" />
          <Field label="Seller email" value={sellerEmail} onChange={setSellerEmail} type="email" />

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Product or Service</span>
            <select
              value={categoryGroup}
              onChange={(e) => setCategoryGroup(e.target.value as "products" | "services")}
              className="w-full rounded-xl border bg-white px-4 py-3 outline-none"
            >
              <option value="products">Products</option>
              <option value="services">Services</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 outline-none"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 rounded-2xl border bg-slate-50 p-4 text-sm text-slate-600">
          <p>Escrow fee: {formatMoney(feeAmount)}</p>
          <p className="mt-1">Buyer pays: {formatMoney(buyerPays)}</p>
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
          {busy ? "Creating..." : "Create escrow"}
        </button>
      </section>

      {success ? (
        <section className="rounded-3xl border bg-white p-6 shadow-soft">
          <h3 className="text-xl font-semibold">Escrow created</h3>
          <p className="mt-2 text-sm text-slate-600">
            Share the correct link with each person. They must log in to view the deal.
          </p>

          <div className="mt-5 space-y-4">
            <LinkCard label="Buyer link" value={success.buyerLink} />
            <LinkCard label="Seller link" value={success.sellerLink} />
          </div>

          <button
            onClick={() => router.push(`/e/${success.buyerLink.split("/").pop()}`)}
            className="mt-6 rounded-xl border px-4 py-3 text-sm font-medium text-slate-700"
          >
            Open buyer view
          </button>
        </section>
      ) : null}
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

function LinkCard({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 break-all text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
              }
