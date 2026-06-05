import { User } from "firebase/auth";

export function isAuthenticated(
  user: User | null
) {
  return !!user;
}

export function isAdmin(
  profile: any
) {
  return (
    profile?.role === "admin" ||
    profile?.role === "super_admin"
  );
}

export function isSuperAdmin(
  profile: any
) {
  return (
    profile?.role === "super_admin"
  );
}
