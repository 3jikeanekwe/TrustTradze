"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/hooks/use-auth";

import AuthLoading from "./auth-loading";

export default function Protected({
  children
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const {
    user,
    loading
  } = useAuth();

  useEffect(() => {
    if (
      !loading &&
      !user
    ) {
      router.push("/login");
    }
  }, [
    loading,
    user,
    router
  ]);

  if (loading) {
    return <AuthLoading />;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
