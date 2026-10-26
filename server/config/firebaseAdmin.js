
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getFirebaseCredentials() {
    // Local development: use the private JSON file if it exists.
    // Render deployment: use environment variables.
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(
            process.env.FIREBASE_SERVICE_ACCOUNT
        );

        return cert(serviceAccount);
    }

    throw new Error(
        "Firebase credentials are missing. Set FIREBASE_SERVICE_ACCOUNT in the environment."
    );
}

const firebaseApp =
    getApps().length > 0
        ? getApps()[0]
        : initializeApp({
            credential: getFirebaseCredentials(),
        });

export const firebaseAdmin = firebaseApp;
export const firebaseAuth = getAuth(firebaseApp);
