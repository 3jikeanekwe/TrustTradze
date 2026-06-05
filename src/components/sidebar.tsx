"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/hooks/use-auth";
import { getDashboardNavItems } from "@/lib/navigation";

export default function Sidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const items = getDashboardNavItems(profile?.role);

  return (
    <aside className="border-r bg-white">
      <div className="flex h-full flex-col gap-6 p-4 md:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Navigation
          </p>
          <nav className="mt-4 space-y-2">
            {items.map((item) => {
              const active =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "block rounded-xl px-4 py-3 text-sm font-medium transition",
                    active
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="rounded-2xl border bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Signed in as
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {profile?.fullName ?? "Loading..."}
          </p>
          <p className="mt-1 text-xs text-slate-600">{profile?.email ?? ""}</p>
        </div>
      </div>
    </aside>
  );
}
