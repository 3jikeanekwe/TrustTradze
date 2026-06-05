export default function RoleBadge({
  role
}: {
  role?: string | null;
}) {
  if (!role) return null;

  const label =
    role === "super_admin"
      ? "Super Admin"
      : role === "admin"
        ? "Admin"
        : "User";

  return (
    <span className="inline-flex rounded-full border bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
      {label}
    </span>
  );
}
