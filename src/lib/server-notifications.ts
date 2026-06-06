import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/collections";
import type { NotificationType } from "@/types/notification";

export async function createServerNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  meta?: Record<string, string | number | boolean | null>;
}) {
  const ref = adminDb.collection(COLLECTIONS.NOTIFICATIONS).doc();

  await ref.set({
    id: ref.id,
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    read: false,
    createdAt: new Date().toISOString(),
    meta: input.meta ?? null
  });

  return ref.id;
}

export async function createServerNotifications(
  userIds: string[],
  input: Omit<Parameters<typeof createServerNotification>[0], "userId">
) {
  await Promise.all(
    userIds.map((userId) =>
      createServerNotification({
        ...input,
        userId
      })
    )
  );
}
