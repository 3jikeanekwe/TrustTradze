"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import AuthCard from "@/components/auth-card";

import {
  createServerSessionForCurrentUser,
  loginUser
} from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      await loginUser(email.trim().toLowerCase(), password);
      await createServerSessionForCurrentUser();
      router.push(nextPath);
    } catch (err: any) {
      setError(err?.message ?? "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <AuthCard title="Welcome Back" subtitle="Login to TrustTradze">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border p-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border p-3 outline-none"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 font-medium text-white"
          >
            {loading ? "Logging In..." : "Login"}
          </button>

          <button
            type="button"
            onClick={() => router.push(`/forgot-password?next=${encodeURIComponent(nextPath)}`)}
            className="w-full rounded-xl border px-4 py-3"
          >
            Forgot Password
          </button>

          <button
            type="button"
            onClick={() => router.push(`/register?next=${encodeURIComponent(nextPath)}`)}
            className="w-full rounded-xl border px-4 py-3"
          >
            Create Account
          </button>
        </form>
      </AuthCard>
    </main>
  );
}
