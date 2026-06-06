"use client";

import { useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where
} from "firebase/firestore";

import { firebaseDb } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/use-auth";
import AuthLoading from "@/components/auth-loading";
import {
  disableUser,
  enableUser,
  promoteToAdmin,
  removeAdmin
} from "@/lib/admin";

type FoundUser = {
  uid: string;
  email: string;
  fullName: string;
  role: string;
  isDisabled?: boolean;
};

export default function AdminPage() {
  const { profile, loading } = useAuth();
  const [searchEmail, setSearchEmail] = useState("");
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  if (loading) return <AuthLoading />;

  async function handleSearch() {
    setBusy(true);
    setMessage("");
    setFoundUser(null);

    try {
      const snapshot = await getDocs(
        query(
          collection(firebaseDb(), "users"),
          where("email", "==", searchEmail.trim().toLowerCase()),
          limit(1)
        )
      );

      if (snapshot.empty) {
        setMessage("No user found with that email.");
        return;
      }

      const docSnap = snapshot.docs[0];
      setFoundUser({
        uid: docSnap.id,
        ...(docSnap.data() as Omit<FoundUser, "uid">)
      });
    } catch (error: any) {
      setMessage(error?.message ?? "Search failed.");
    } finally {
      setBusy(false);
    }
  }

  async function refreshUser(uid: string) {
    const snapshot = await getDoc(doc(firebaseDb(), "users", uid));
    if (!snapshot.exists()) return;

    setFoundUser({
      uid: snapshot.id,
      ...(snapshot.data() as Omit<FoundUser, "uid">)
    });
  }

  async function handlePromote() {
    if (!profile?.uid || !foundUser) return;
    setBusy(true);
    setMessage("");
    try {
      await promoteToAdmin(profile.uid, foundUser.uid);
      await refreshUser(foundUser.uid);
      setMessage("User promoted to admin.");
    } catch (error: any) {
      setMessage(error?.message ?? "Unable to promote user.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveAdmin() {
    if (!profile?.uid || !foundUser) return;
    setBusy(true);
    setMessage("");
    try {
      await removeAdmin(profile.uid, foundUser.uid);
      await refreshUser(foundUser.uid);
      setMessage("Admin access removed.");
    } catch (error: any) {
      setMessage(error?.message ?? "Unable to remove admin.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    if (!profile?.uid || !foundUser) return;
    setBusy(true);
    setMessage("");
    try {
      await disableUser(profile.uid, foundUser.uid);
      await refreshUser(foundUser.uid);
      setMessage("User disabled.");
    } catch (error: any) {
      setMessage(error?.message ?? "Unable to disable user.");
    } finally {
      setBusy(false);
    }
  }

  async function handleEnable() {
    if (!profile?.uid || !foundUser) return;
    setBusy(true);
    setMessage("");
    try {
      await enableUser(profile.uid, foundUser.uid);
      await refreshUser(foundUser.uid);
      setMessage("User enabled.");
    } catch (error: any) {
      setMessage(error?.message ?? "Unable to enable user.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-white p-6 shadow-soft">
        <h2 className="text-2xl font-semibold">Admin Panel</h2>
        <p className="mt-2 text-sm text-slate-600">
          Manage users and admin access from the super admin account.
        </p>

        <div className="mt-6 flex flex-col gap-3 md:flex-row">
          <input
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            placeholder="Search user by email"
            className="w-full rounded-xl border px-4 py-3 outline-none md:max-w-md"
          />
          <button
            onClick={handleSearch}
            disabled={busy}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            Search
          </button>
        </div>
      </section>

      {message ? (
        <div className="rounded-2xl border bg-slate-100 p-4 text-sm text-slate-700">
          {message}
        </div>
      ) : null}

      {foundUser ? (
        <section className="rounded-3xl border bg-white p-6 shadow-soft">
          <h3 className="text-xl font-semibold">User Details</h3>

          <div className="mt-4 space-y-2 text-sm text-slate-700">
            <p>
              <span className="font-medium">Name:</span> {foundUser.fullName}
            </p>
            <p>
              <span className="font-medium">Email:</span> {foundUser.email}
            </p>
            <p>
              <span className="font-medium">Role:</span> {foundUser.role}
            </p>
            <p>
              <span className="font-medium">Status:</span>{" "}
              {foundUser.isDisabled ? "Disabled" : "Active"}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handlePromote}
              disabled={busy || foundUser.role === "admin" || foundUser.role === "super_admin"}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Promote to admin
            </button>
            <button
              onClick={handleRemoveAdmin}
              disabled={busy || (foundUser.role !== "admin" && foundUser.role !== "super_admin")}
              className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
            >
              Remove admin
            </button>
            <button
              onClick={handleDisable}
              disabled={busy || foundUser.isDisabled}
              className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
            >
              Disable user
            </button>
            <button
              onClick={handleEnable}
              disabled={busy || !foundUser.isDisabled}
              className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
            >
              Enable user
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
