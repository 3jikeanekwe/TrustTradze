import type { UserRole } from "@/types/user";

export type DashboardNavItem = {
  href: string;
  label: string;
};

export function getDashboardNavItems(
  role?: UserRole | null
): DashboardNavItem[] {
  const items: DashboardNavItem[] = [
    {
      href: "/dashboard",
      label: "Overview"
    },
    {
      href: "/dashboard/products",
      label: "Products"
    },
    {
      href: "/dashboard/services",
      label: "Services"
    },
    {
      href: "/dashboard/search",
      label: "Search"
    },
    {
      href: "/dashboard/escrows",
      label: "Escrows"
    },
    {
      href: "/dashboard/notifications",
      label: "Notifications"
    },
    {
      href: "/dashboard/settings",
      label: "Account Settings"
    }
  ];

  if (role === "admin" || role === "super_admin") {
    items.push({
      href: "/dashboard/admin",
      label: "Admin Panel"
    });
  }

  return items;
}
