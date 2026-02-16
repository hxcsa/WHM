import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const isBrowser = typeof window !== "undefined";

// We only want to skip initialization during the build phase (Vercel) if keys are missing.
// In the browser, we should always try to initialize so real errors are caught.
const shouldInitialize = !!firebaseConfig.apiKey || isBrowser;

const app = shouldInitialize
    ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0])
    : null;

if (isBrowser && !firebaseConfig.apiKey) {
    console.error("❌ Firebase API Key is missing! Check your .env.local file and restart the dev server.");
}

export const auth = app
    ? getAuth(app)
    : ({
        onAuthStateChanged: (cb: any) => {
            cb(null);
            return () => { };
        },
        signOut: async () => { },
        currentUser: null,
    } as any);

export default app;
