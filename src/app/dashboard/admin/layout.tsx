import { redirect } from "next/navigation";
import { getServerSessionProfile } from "@/lib/firebase/session";

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const profile = await getServerSessionProfile();

  if (
    !profile ||
    (profile.role !== "admin" && profile.role !== "super_admin")
  ) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
