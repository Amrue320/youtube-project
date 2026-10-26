
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.resolve(
    __dirname,
    "../firebase-service-account.json"
);

if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(
        "Firebase service account file not found in the server folder."
    );
}

const serviceAccount = JSON.parse(
    fs.readFileSync(serviceAccountPath, "utf8")
);

const firebaseApp =
    getApps().length > 0
        ? getApps()[0]
        : initializeApp({
            credential: cert(serviceAccount),
        });

export const firebaseAdmin = firebaseApp;
export const firebaseAuth = getAuth(firebaseApp);
