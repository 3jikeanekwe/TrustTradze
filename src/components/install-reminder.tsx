"use client";

import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const STORAGE_KEY = "trusttradze-install-dismissed";
const DISMISS_MS = 1000 * 60 * 60 * 24 * 3;

function canUsePwaPrompt() {
  return typeof window !== "undefined";
}

export function InstallReminder() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  const dismissedRecently = useMemo(() => {
    if (!canUsePwaPrompt()) return false;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const timestamp = Number(raw);
    return Number.isFinite(timestamp) && Date.now() - timestamp < DISMISS_MS;
  }, []);

  useEffect(() => {
    if (!canUsePwaPrompt()) return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      if (!dismissedRecently) {
        setVisible(true);
      }
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setVisible(false);
      setDeferredPrompt(null);
      window.localStorage.removeItem(STORAGE_KEY);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    const media = window.matchMedia("(display-mode: standalone)");
    if (media.matches || (window.navigator as Navigator & { standalone?: boolean }).standalone) {
      setInstalled(true);
    }

    const timer = window.setTimeout(() => {
      if (!installed && !dismissedRecently) {
        setVisible(true);
      }
    }, 6000);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      window.clearTimeout(timer);
    };
  }, [dismissedRecently, installed]);

  if (!visible || installed) return null;

  async function handleInstall() {
    if (!deferredPrompt) {
      window.open("/", "_self");
      return;
    }

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setVisible(false);
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setVisible(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-4 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Install TrustTradze</p>
            <p className="mt-1 text-sm text-slate-600">
              Add the app to your home screen for faster escrow access and better notifications.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-full px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
            aria-label="Dismiss install reminder"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={handleInstall}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Install now
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
