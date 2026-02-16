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

// Only initialize Firebase when the API key is present.
// During Vercel builds or if env vars are missing, `app` will be null
// and we fall back to a safe mock that redirects to login.
const app =
    firebaseConfig.apiKey && getApps().length === 0
        ? initializeApp(firebaseConfig)
        : getApps()[0] || null;

const authMock = {
    onAuthStateChanged: (cb: any) => { cb(null); return () => { }; },
    signOut: async () => { },
    currentUser: null,
} as any;

export const auth = app ? getAuth(app) : authMock;
export default app;
