"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import AuthLoading from "@/components/auth-loading";
import { updateProfile } from "@/lib/profile";
import { saveBankAccount } from "@/lib/bank-account";

export default function SettingsPage() {
  const { user, profile, loading } = useAuth();

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");

  const [bankName, setBankName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [recipientCode, setRecipientCode] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setFullName(profile?.fullName ?? "");
    setPhoneNumber(profile?.phoneNumber ?? "");
    setState(profile?.state ?? "");
    setCity(profile?.city ?? "");

    setBankName(profile?.bankAccount?.bankName ?? "");
    setBankCode(profile?.bankAccount?.bankCode ?? "");
    setAccountNumber(profile?.bankAccount?.accountNumber ?? "");
    setAccountName(profile?.bankAccount?.accountName ?? "");
    setRecipientCode(profile?.bankAccount?.recipientCode ?? "");
  }, [profile]);

  async function handleSave() {
    if (!user || !profile) return;

    setSaving(true);
    setMessage("");

    try {
      await updateProfile(user.uid, profile.email, {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        state: state.trim(),
        city: city.trim()
      });

      if (
        bankName.trim() &&
        bankCode.trim() &&
        accountNumber.trim() &&
        accountName.trim() &&
        recipientCode.trim()
      ) {
        await saveBankAccount(user.uid, {
          bankName: bankName.trim(),
          bankCode: bankCode.trim(),
          accountNumber: accountNumber.trim(),
          accountName: accountName.trim(),
          recipientCode: recipientCode.trim()
        });
      }

      setMessage("Account settings saved successfully.");
    } catch (error: any) {
      setMessage(error?.message ?? "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <AuthLoading />

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-white p-6 shadow-soft">
        <h2 className="text-2xl font-semibold">Account Settings</h2>
        <p className="mt-2 text-sm text-slate-600">
          Update your profile and connected payout account.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Full name" value={fullName} onChange={setFullName} />
          <Field label="WhatsApp number" value={phoneNumber} onChange={setPhoneNumber} />
          <Field label="State" value={state} onChange={setState} />
          <Field label="City" value={city} onChange={setCity} />
        </div>
      </section>

      <section className="rounded-3xl border bg-white p-6 shadow-soft">
        <h3 className="text-xl font-semibold">Bank Account</h3>
        <p className="mt-2 text-sm text-slate-600">
          This is the account that receives escrow releases.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Bank name" value={bankName} onChange={setBankName} />
          <Field label="Bank code" value={bankCode} onChange={setBankCode} />
          <Field label="Account number" value={accountNumber} onChange={setAccountNumber} />
          <Field label="Account name" value={accountName} onChange={setAccountName} />
          <Field label="Recipient code" value={recipientCode} onChange={setRecipientCode} />
        </div>
      </section>

      {message ? (
        <div className="rounded-2xl border bg-slate-100 p-4 text-sm text-slate-700">
          {message}
        </div>
      ) : null}

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save settings"}
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border bg-white px-4 py-3 outline-none ring-0 focus:border-slate-900"
      />
    </label>
  );
          }
