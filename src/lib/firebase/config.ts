import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Connect to emulators when env vars are present.
const useEmulators =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true";

if (useEmulators) {
  const authUrl = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreUrl = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST;
  const storageUrl = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST;

  if (authUrl && !auth.emulatorConfig) {
    connectAuthEmulator(auth, `http://${authUrl}`, { disableWarnings: true });
  }
  if (firestoreUrl) {
    const [host, port] = firestoreUrl.split(":");
    try {
      connectFirestoreEmulator(db, host, parseInt(port, 10));
    } catch (e) {
      console.error("Firestore emulator error", e);
    }
  }
  if (storageUrl) {
    const [host, port] = storageUrl.split(":");
    try {
      connectStorageEmulator(storage, host, parseInt(port, 10));
    } catch (e) {
      console.error("Storage emulator error", e);
    }
  }
}

// Analytics: browser-only, skipped against emulators (fake API keys break Installations).
const analytics =
  typeof window !== "undefined" && !useEmulators
    ? isSupported().then((yes) => (yes ? getAnalytics(app) : null))
    : null;

export { app, auth, db, storage, analytics };
