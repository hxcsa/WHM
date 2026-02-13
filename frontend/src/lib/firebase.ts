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

if (process.env.NODE_ENV === "development") {
    console.log("🔥 Firebase Environment Check:");
    console.log("- API Key present:", !!firebaseConfig.apiKey);
    console.log("- Auth Domain present:", !!firebaseConfig.authDomain);
    console.log("- Existing apps:", getApps().length);
}

const app =
    getApps().length === 0 && firebaseConfig.apiKey
        ? initializeApp(firebaseConfig)
        : getApps()[0];

if (process.env.NODE_ENV === "development") {
    console.log("- App initialized:", !!app);
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
