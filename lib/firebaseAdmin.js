import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

const getAdminApp = () => {
    const apps = getApps();
    if (apps.length > 0) {
        return apps[0];
    }
    try {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
        
        if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
            return initializeApp({
                credential: cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey,
                })
            });
        }
    } catch (error) {
        console.error('Firebase Admin init error:', error);
    }
    return null;
};

const adminApp = getAdminApp();

const firebaseAdmin = {
    get apps() {
        return getApps();
    },
    get app() {
        return adminApp;
    },
    messaging: () => {
        const currentApp = adminApp || (getApps().length > 0 ? getApps()[0] : null);
        if (!currentApp) {
            throw new Error('Firebase Admin App not initialized');
        }
        const messagingInstance = getMessaging(currentApp);
        return {
            sendMulticast: (msg) => {
                if (typeof messagingInstance.sendEachForMulticast === 'function') {
                    return messagingInstance.sendEachForMulticast(msg);
                }
                if (typeof messagingInstance.sendMulticast === 'function') {
                    return messagingInstance.sendMulticast(msg);
                }
                throw new Error('sendMulticast not supported on Firebase messaging instance');
            },
            sendEachForMulticast: (msg) => {
                if (typeof messagingInstance.sendEachForMulticast === 'function') {
                    return messagingInstance.sendEachForMulticast(msg);
                }
                if (typeof messagingInstance.sendMulticast === 'function') {
                    return messagingInstance.sendMulticast(msg);
                }
                throw new Error('sendEachForMulticast not supported on Firebase messaging instance');
            },
            send: (msg) => messagingInstance.send(msg)
        };
    }
};

export default firebaseAdmin;
