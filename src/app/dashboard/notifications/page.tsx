"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where
} from "firebase/firestore";

import { firebaseDb } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/use-auth";
import AuthLoading from "@/components/auth-loading";
import {
  markAllNotificationsAsRead,
  markNotificationAsRead
} from "@/lib/notifications";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  type: string;
  createdAt: any;
};

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(firebaseDb(), "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setItems(
        snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<NotificationItem, "id">)
        }))
      );
    });

    return unsub;
  }, [user]);

  if (loading) return <AuthLoading />;

  async function handleMarkAllRead() {
    if (!user) return;
    setBusy(true);
    try {
      await markAllNotificationsAsRead(user.uid);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between rounded-3xl border bg-white p-6 shadow-soft">
        <div>
          <h2 className="text-2xl font-semibold">Notifications</h2>
          <p className="mt-1 text-sm text-slate-600">
            Live app notifications for escrows, chats, refunds, and admin actions.
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          disabled={busy || items.length === 0}
          className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
        >
          Mark all read
        </button>
      </section>

      <section className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-3xl border bg-white p-6 text-sm text-slate-600 shadow-soft">
            No notifications yet.
          </div>
        ) : (
          items.map((item) => (
            <article
              key={item.id}
              className={[
                "rounded-3xl border bg-white p-5 shadow-soft",
                item.read ? "opacity-70" : ""
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{item.body}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                    {item.type}
                  </p>
                </div>

                {!item.read ? (
                  <button
                    onClick={() => markNotificationAsRead(item.id)}
                    className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white"
                  >
                    Mark read
                  </button>
                ) : null}
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
