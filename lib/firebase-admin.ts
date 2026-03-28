import * as admin from "firebase-admin";

function ensureAdmin() {
  if (admin.apps.length > 0) return;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return;
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(json) as admin.ServiceAccount),
  });
}

/** Returns Firebase uid if token is valid; null if misconfigured or invalid. */
export async function verifyFirebaseIdToken(idToken: string): Promise<string | null> {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return null;
  try {
    ensureAdmin();
    if (!admin.apps.length) return null;
    const decoded = await admin.auth().verifyIdToken(idToken);
    return decoded.uid;
  } catch {
    return null;
  }
}
