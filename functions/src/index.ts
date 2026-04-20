import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

admin.initializeApp();
const db = admin.firestore();

/**
 * Example scheduled function. Runs every 15 minutes.
 * Replace the body with whatever recurring work your app needs.
 *
 * Deploy: `bun run deploy:functions`
 */
export const exampleSchedule = onSchedule("every 15 minutes", async () => {
  console.log("[exampleSchedule] tick");
  // ...do work against db...
  void db; // keep import used
});

/**
 * Example Firestore trigger. Runs when a new /users doc is created.
 */
export const onUserCreated = onDocumentCreated("users/{userId}", async (event) => {
  const data = event.data?.data();
  if (!data) return;
  console.log(`[onUserCreated] new user ${event.params.userId}`, data.email);
  // ...send welcome email, write audit log, etc...
});

// Re-export Web Push helper if you want to call it from other triggers.
export { sendNotificationsFromFunction } from "./send";
