import AdminProtected from "@/components/admin-protected";

export default function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <AdminProtected>{children}</AdminProtected>;
}
