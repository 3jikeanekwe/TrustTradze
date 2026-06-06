"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";

export default function DashboardHomePage() {
  const { profile, user } = useAuth();

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-white p-6 shadow-soft">
        <p className="text-sm text-slate-500">Welcome back</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-950">
          {profile?.fullName ?? user?.email ?? "TrustTradze user"}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Manage escrows, create new deals, watch transaction history, receive notifications,
          and handle account settings from one place.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card
          title="Create escrow"
          text="Start a new product, service, or custom escrow deal."
          href="/dashboard/escrows/new"
        />
        <Card
          title="Escrow history"
          text="See every deal you created, accepted, funded, completed, refunded, or disputed."
          href="/dashboard/escrows"
        />
        <Card
          title="Account settings"
          text="Update your profile and connected bank account details."
          href="/dashboard/settings"
        />
      </section>
    </div>
  );
}

function Card({
  title,
  text,
  href
}: {
  title: string;
  text: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-3xl border bg-white p-6 shadow-soft transition hover:-translate-y-0.5"
    >
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </Link>
  );
}
