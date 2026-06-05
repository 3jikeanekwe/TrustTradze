import { redirect } from "next/navigation";
import { getServerSessionProfile } from "@/lib/firebase/session";
import DashboardShell from "@/components/dashboard-shell";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const profile = await getServerSessionProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.isDisabled) {
    redirect("/login?reason=disabled");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
