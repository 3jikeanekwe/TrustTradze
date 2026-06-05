export default function HomePage() {
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "TrustTradze";

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <section className="rounded-3xl border bg-white p-8 shadow-soft">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Escrow for products, services, and serious deals
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">
              {appName}
            </h1>
            <p className="mt-5 text-base leading-7 text-slate-600 md:text-lg">
              A production-ready escrow platform where registered users create deals, share links,
              chat inside the deal, accept payment through Paystack, track history, and release funds
              to connected bank accounts when both sides are satisfied.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <FeatureCard
              title="Escrow-first"
              text="Any registered user can create a deal for a product, service, or custom transaction."
            />
            <FeatureCard
              title="In-app chat"
              text="All deal communication stays inside the transaction and becomes part of the record."
            />
            <FeatureCard
              title="Direct payout"
              text="When escrow is released, funds are sent to the connected bank account flow."
            />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Panel
            title="What Stage 1 gives you"
            lines={[
              "Next.js 15 app foundation",
              "Firebase client and admin setup",
              "Paystack helper utilities",
              "Resend email helper",
              "PWA manifest and icons",
              "Persistent install reminder"
            ]}
          />
          <Panel
            title="What comes next"
            lines={[
              "Authentication",
              "Protected routes",
              "Firestore schema and rules",
              "Escrow creation and invite links",
              "Chat",
              "Admin dashboard"
            ]}
          />
        </section>
      </div>
    </main>
  );
}

function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function Panel({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-soft">
      <h2 className="text-xl font-semibold">{title}</h2>
      <ul className="mt-4 space-y-3">
        {lines.map((line) => (
          <li key={line} className="flex items-start gap-3 text-sm text-slate-600">
            <span className="mt-1 h-2 w-2 rounded-full bg-slate-900" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
