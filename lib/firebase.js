import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const requestForToken = async () => {
  try {
     const messaging = getMessaging(app);
     if (typeof window !== "undefined") {
       const token = await getToken(messaging, { 
         vapidKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
       });
       
       if (token) {
         console.log('Current token:', token);
         // Register token with our backend
         await fetch('/api/register-token', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ token })
         });
         return token;
       } else {
         console.log('No registration token available. Request permission to generate one.');
       }
     }
  } catch (err) {
    console.log('An error occurred while retrieving token. ', err);
  }
};

export const onMessageListener = () => {
  const messaging = getMessaging(app);
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
};
