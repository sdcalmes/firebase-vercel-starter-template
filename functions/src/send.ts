import * as admin from "firebase-admin";
import webpush from "web-push";

/**
 * Send Web Push notifications to the given users and write an in-app copy to
 * /users/{uid}/notifications. Stale subscriptions (HTTP 410/404) are pruned.
 *
 * Expects each user to have zero or more docs under /users/{uid}/pushSubscriptions
 * with shape: { endpoint: string, keys: { p256dh: string, auth: string } }.
 */

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  const publicKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys not configured. Set NEXT_PUBLIC_FIREBASE_VAPID_KEY and VAPID_PRIVATE_KEY.");
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    publicKey,
    privateKey,
  );
  vapidConfigured = true;
}

interface SendNotificationOptions {
  userIds: string[];
  title: string;
  body: string;
  url: string;
  tag?: string;
}

interface SendResult {
  sent: number;
  failed: number;
  skipped: number;
  inApp: number;
}

export async function sendNotificationsFromFunction(
  options: SendNotificationOptions,
): Promise<SendResult> {
  ensureVapid();
  const db = admin.firestore();
  const { title, body, url, tag } = options;
  const userIds = [...new Set(options.userIds)];

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let inApp = 0;

  for (const uid of userIds) {
    try {
      const userDoc = await db.doc(`users/${uid}`).get();
      if (!userDoc.exists) {
        skipped++;
        continue;
      }

      // In-app copy
      await db.collection(`users/${uid}/notifications`).add({
        title, body, url, read: false, createdAt: Date.now(),
      });
      inApp++;

      const subsSnapshot = await db.collection(`users/${uid}/pushSubscriptions`).get();
      if (subsSnapshot.empty) {
        skipped++;
        continue;
      }

      const payload = JSON.stringify({
        title, body, url,
        tag: tag ?? "default",
        icon: "/icon-192.png",
        badge: "/icon-mono-badge.png",
      });

      const results = await Promise.allSettled(
        subsSnapshot.docs.map((d) => {
          const data = d.data();
          return webpush.sendNotification(
            {
              endpoint: data.endpoint,
              keys: { p256dh: data.keys.p256dh, auth: data.keys.auth },
            },
            payload,
          );
        }),
      );

      // Prune dead subscriptions.
      const staleDocIds: string[] = [];
      let anySuccess = false;
      results.forEach((result, idx) => {
        if (result.status === "fulfilled") {
          anySuccess = true;
        } else {
          const statusCode = (result.reason as { statusCode?: number })?.statusCode;
          if (statusCode === 410 || statusCode === 404) {
            staleDocIds.push(subsSnapshot.docs[idx].id);
          }
        }
      });

      if (staleDocIds.length > 0) {
        const batch = db.batch();
        for (const docId of staleDocIds) {
          batch.delete(db.doc(`users/${uid}/pushSubscriptions/${docId}`));
        }
        await batch.commit();
      }

      if (anySuccess) sent++;
      else failed++;
    } catch (err) {
      console.error(`sendNotificationsFromFunction: uid=${uid}`, err);
      failed++;
    }
  }

  return { sent, failed, skipped, inApp };
}
