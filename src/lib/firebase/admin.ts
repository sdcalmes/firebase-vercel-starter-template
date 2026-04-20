import admin from "firebase-admin";

// Singleton init for firebase-admin in Next.js API routes.
// Prod  : FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON  (single JSON blob)
// Alt   : FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (split fields)
// Local : no creds → targets running emulator automatically
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON) {
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      throw new Error(
        `Failed to parse FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON: ${e instanceof Error ? e.message : e}. Ensure the env var contains valid JSON.`
      );
    }
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  } else {
    admin.initializeApp({ projectId });
  }
}

export const adminDb = admin.firestore();
export default admin;
