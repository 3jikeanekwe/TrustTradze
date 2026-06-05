"use client";

import { useRouter } from "next/navigation";

import RoleBadge from "@/components/role-badge";
import { logoutUser } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";

export default function Topbar() {
  const router = useRouter();
  const { profile, user } = useAuth();

  async function handleLogout() {
    await logoutUser();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
        <div>
          <p className="text-sm text-slate-500">TrustTradze</p>
          <h1 className="text-lg font-semibold text-slate-950">
            {profile?.fullName ?? user?.email ?? "Dashboard"}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <RoleBadge role={profile?.role} />
          <button
            onClick={handleLogout}
            className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
