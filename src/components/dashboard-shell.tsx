"use client";

import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";
import { useAuth } from "@/hooks/use-auth";
import AuthLoading from "@/components/auth-loading";

export default function DashboardShell({
  children
}: {
  children: React.ReactNode;
}) {
  const { loading } = useAuth();

  if (loading) {
    return <AuthLoading />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar />
      <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl grid-cols-1 md:grid-cols-[260px_1fr]">
        <Sidebar />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
