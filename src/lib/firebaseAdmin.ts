import * as admin from "firebase-admin";

function getServiceAccount(): admin.ServiceAccount {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.error("[FirebaseAdmin] Missing individual Service Account variables:", {
      hasProjectId: !!projectId,
      hasClientEmail: !!clientEmail,
      hasPrivateKey: !!privateKey
    });
    throw new Error("Missing Firebase Admin environment variables in .env.local");
  }

  return {
    projectId,
    clientEmail,
    // Ensure newlines are handled correctly even if they were escaped in .env
    privateKey: privateKey.replace(/\\n/g, "\n").replace(/^"(.*)"$/, "$1")
  };
}

function initializeAdmin() {
  if (!admin.apps.length) {
    try {
      const cert = getServiceAccount();
      admin.initializeApp({
        credential: admin.credential.cert(cert)
      });
      
      admin.firestore().settings({ ignoreUndefinedProperties: true });
      console.log("[FirebaseAdmin] Server-side initialized successfully for project:", cert.projectId);
    } catch (error) {
      console.error("[FirebaseAdmin] Initialization FATAL ERROR:", error);
      throw error;
    }
  }
  return admin.firestore();
}

export const firebaseAdminDb = initializeAdmin();
export { admin };
