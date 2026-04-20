import { NextRequest, NextResponse } from "next/server";
import admin, { adminDb } from "@/lib/firebase/admin";

export interface AuthResult {
  uid: string;
  email?: string;
  name?: string;
}

/**
 * Verify the Authorization header contains a valid Firebase ID token.
 * Returns AuthResult on success, or a 401 NextResponse on failure.
 *
 *   const auth = await verifyAuth(req);
 *   if (auth instanceof NextResponse) return auth;
 *   // use auth.uid
 */
export async function verifyAuth(
  req: NextRequest
): Promise<AuthResult | NextResponse> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(authHeader.slice(7));
    return { uid: decoded.uid, email: decoded.email, name: decoded.name };
  } catch {
    return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });
  }
}

/**
 * Verify the given uid belongs to a platform admin (role=='admin' in /users).
 * Returns void on success, 403 NextResponse otherwise.
 */
export async function verifyAdminRole(
  uid: string
): Promise<void | NextResponse> {
  const userDoc = await adminDb.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
