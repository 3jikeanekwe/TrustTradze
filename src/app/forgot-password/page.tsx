"use client";

import { useState } from "react";

import AuthCard from "@/components/auth-card";

import {
  forgotPassword
} from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      await forgotPassword(
        email.trim().toLowerCase()
      );

      setSuccess(true);
    } catch (err: any) {
      setError(
        err?.message ??
          "Unable to send email"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <AuthCard
        title="Reset Password"
        subtitle="Receive a reset link"
      >
        {success ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
            Password reset email sent.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label className="mb-1 block text-sm font-medium">
                Email
              </label>

              <input
                type="email"
                required
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border p-3 outline-none"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-600">
                {error}
              </div>
            )}

            <button
              disabled={loading}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-white"
            >
              {loading
                ? "Sending..."
                : "Send Reset Email"}
            </button>
          </form>
        )}
      </AuthCard>
    </main>
  );
}
