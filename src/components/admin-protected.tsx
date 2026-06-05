"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/hooks/use-auth";

import AuthLoading from "./auth-loading";

export default function AdminProtected({
  children
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const {
    profile,
    loading
  } = useAuth();

  useEffect(() => {
    if (
      !loading &&
      profile?.role !== "admin" &&
      profile?.role !== "super_admin"
    ) {
      router.push("/");
    }
  }, [
    loading,
    profile,
    router
  ]);

  if (loading) {
    return <AuthLoading />;
  }

  if (
    profile?.role !== "admin" &&
    profile?.role !== "super_admin"
  ) {
    return null;
  }

  return <>{children}</>;
}
