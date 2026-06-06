import Link from "next/link";
import { redirect } from "next/navigation";

import { getServerSessionProfile } from "@/lib/firebase/session";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/collections";

export default async function AdminHubPage() {
  const profile = await getServerSessionProfile();

  if (
    !profile ||
    (profile.role !== "admin" && profile.role !== "super_admin")
  ) {
    redirect("/dashboard");
  }

  const [
    usersSnap,
    escrowsSnap,
    productsSnap,
    servicesSnap,
    disputesSnap,
    notificationsSnap
  ] = await Promise.all([
    adminDb.collection(COLLECTIONS.USERS).get(),
    adminDb.collection(COLLECTIONS.ESCROWS).get(),
    adminDb.collection(COLLECTIONS.PRODUCTS).get(),
    adminDb.collection(COLLECTIONS.SERVICES).get(),
    adminDb
      .collection(COLLECTIONS.DISPUTES)
      .where("status", "==", "open")
      .get(),
    adminDb
      .collection(COLLECTIONS.NOTIFICATIONS)
      .where("read", "==", false)
      .get()
  ]);

  const escrows = escrowsSnap.docs.map((docSnap) => docSnap.data() as any);

  const openEscrows = escrows.filter(
    (item) =>
      item.status === "funded" ||
      item.status === "in_progress" ||
      item.status === "disputed" ||
      item.status === "refund_requested"
  ).length;

  const completedEscrows = escrows.filter(
    (item) => item.status === "completed"
  ).length;

  const refundedEscrows = escrows.filter(
    (item) => item.status === "refunded"
  ).length;

  const pendingEscrows = escrows.filter(
    (item) =>
      item.status === "created" ||
      item.status === "invited" ||
      item.status === "accepted" ||
      item.status === "awaiting_payment"
  ).length;

  const recentEscrows = escrows
    .slice()
    .sort(
      (a, b) =>
        new Date(b.createdAt ?? 0).getTime() -
        new Date(a.createdAt ?? 0).getTime()
    )
    .slice(0, 5);

  const recentUsers = usersSnap.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as any)
    }))
    .sort(
      (a, b) =>
        new Date(b.createdAt ?? 0).getTime() -
        new Date(a.createdAt ?? 0).getTime()
    )
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-white p-6 shadow-soft">
        <p className="text-sm text-slate-500">Admin hub</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">
          Moderation center
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Manage users, monitor escrow deals, resolve disputes, and keep the
          platform safe from one place.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Users" value={usersSnap.size} />
          <StatCard label="Products" value={productsSnap.size} />
          <StatCard label="Services" value={servicesSnap.size} />
          <StatCard label="Escrows" value={escrowsSnap.size} />
          <StatCard label="Open disputes" value={disputesSnap.size} />
          <StatCard label="Unread notices" value={notificationsSnap.size} />
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row">
          <Link
            href="/dashboard/admin/users"
            className="rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white"
          >
            Manage users
          </Link>
          <Link
            href="/dashboard/admin/escrows"
            className="rounded-xl border px-4 py-3 text-center text-sm font-medium text-slate-700"
          >
            Review escrows
          </Link>
          <Link
            href="/dashboard/notifications"
            className="rounded-xl border px-4 py-3 text-center text-sm font-medium text-slate-700"
          >
            Notification inbox
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <LinkCard
          href="/dashboard/admin/users"
          title="User management"
          text="Search users, promote admins, disable accounts, and restore accounts."
        />
        <LinkCard
          href="/dashboard/admin/escrows"
          title="Escrow moderation"
          text="Inspect escrow deals, resolve disputes, refund buyers, and release funds."
        />
        <LinkCard
          href="/dashboard/notifications"
          title="Notification inbox"
          text="Track unread notifications, mark them as read, and stay on top of activity."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Recent escrows"
          emptyText="No escrows found."
          items={recentEscrows.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border bg-slate-50 p-4"
            >
              <p className="text-sm font-semibold text-slate-950">
                {item.title}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Status: {item.status}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Buyer: {item.buyerEmail}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Seller: {item.sellerEmail}
              </p>
              <div className="mt-4 flex gap-3">
                <Link
                  href={`/dashboard/admin/escrows/${item.id}`}
                  className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Open
                </Link>
                <Link
                  href={`/dashboard/escrows/${item.id}`}
                  className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Dashboard view
                </Link>
              </div>
            </div>
          ))}
        />

        <Panel
          title="Recent users"
          emptyText="No users found."
          items={recentUsers.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border bg-slate-50 p-4"
            >
              <p className="text-sm font-semibold text-slate-950">
                {item.fullName}
              </p>
              <p className="mt-1 text-sm text-slate-600">{item.email}</p>
              <p className="mt-1 text-sm text-slate-600">
                Role: {item.role}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Status: {item.isDisabled ? "Disabled" : "Active"}
              </p>
              <div className="mt-4 flex gap-3">
                <Link
                  href={`/dashboard/users/${item.id}`}
                  className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Open profile
                </Link>
                <Link
                  href="/dashboard/admin/users"
                  className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Manage
                </Link>
              </div>
            </div>
          ))}
        />
      </section>

      <section className="rounded-3xl border bg-white p-6 shadow-soft">
        <h2 className="text-xl font-semibold">Platform reminder</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Make sure buyers confirm receipt after getting the product or service
          so the escrow can be released to the seller or service provider.
        </p>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function LinkCard({
  href,
  title,
  text
}: {
  href: string;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-3xl border bg-white p-6 shadow-soft transition hover:-translate-y-0.5"
    >
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </Link>
  );
}

function Panel({
  title,
  emptyText,
  items
}: {
  title: string;
  emptyText: string;
  items: React.ReactNode[];
}) {
  return (
    <div className="rounded-3xl border bg-white p-6 shadow-soft">
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border bg-slate-50 p-4 text-sm text-slate-600">
            {emptyText}
          </div>
        ) : (
          items
        )}
      </div>
    </div>
  );
        }
