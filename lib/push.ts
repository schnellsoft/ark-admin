import webpush from "web-push";
import { getEnv } from "./env";

export async function getVapidPublicKey() {
  const { VAPID_PUBLIC_KEY } = getEnv();
  return VAPID_PUBLIC_KEY || "";
}

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  const { DB, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = getEnv();
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return { sent: 0, reason: "missing_vapid" as const };
  }

  webpush.setVapidDetails(VAPID_SUBJECT || "mailto:admin@ark.local", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const rows = await DB.prepare(
    `SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?`,
  )
    .bind(userId)
    .all<{ id: string; endpoint: string; p256dh: string; auth: string }>();

  let sent = 0;
  for (const sub of rows.results ?? []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
      );
      sent += 1;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await DB.prepare("DELETE FROM push_subscriptions WHERE id = ?").bind(sub.id).run();
      }
    }
  }

  return { sent };
}

export async function notifyStaff(payload: { title: string; body: string; url?: string }) {
  const { DB } = getEnv();
  const staff = await DB.prepare(
    `SELECT id FROM users WHERE role IN ('admin', 'staff')`,
  ).all<{ id: string }>();

  let total = 0;
  for (const user of staff.results ?? []) {
    const result = await sendPushToUser(user.id, payload);
    total += result.sent;
  }
  return { sent: total };
}
