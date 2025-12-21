/**
 * Firebase configuration and initialization
 * Includes secondary app for admin user creation (prevents session logout)
 */
import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo.appspot.com',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123:web:abc',
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://demo.firebaseio.com'
};

// Check if we're using placeholder config
const isConfigured = import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_API_KEY !== 'placeholder';

if (!isConfigured) {
    console.warn('Firebase is using placeholder config. Please set up your .env file.');
}

// Initialize Firebase (primary app)
let app = null;
let auth = null;
let db = null;
let realtimeDb = null;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    realtimeDb = getDatabase(app);
} catch (error) {
    console.error('Firebase initialization error:', error);
}

/**
 * Get a secondary Firebase app for user creation
 * This prevents the admin from being logged out when creating new users
 * 
 * How it works:
 * - Primary app (auth) = Admin's session, stays logged in
 * - Secondary app (secondaryAuth) = Used for creating new users only
 * - New user gets created on secondary app, then app is deleted
 * - Admin session on primary app is unaffected!
 */
export function getSecondaryAuth() {
    // Create a unique name for the secondary app
    const secondaryAppName = `secondary-${Date.now()}`;

    // Check if secondary app already exists and delete it
    const existingApps = getApps();
    const existingSecondary = existingApps.find(a => a.name.startsWith('secondary-'));
    if (existingSecondary) {
        deleteApp(existingSecondary).catch(() => { });
    }

    // Initialize secondary app with same config
    const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    return { secondaryApp, secondaryAuth };
}

/**
 * Cleanup secondary app after user creation
 */
export async function cleanupSecondaryApp(secondaryApp) {
    try {
        await deleteApp(secondaryApp);
    } catch (error) {
        // Ignore cleanup errors
        console.debug('Secondary app cleanup:', error.message);
    }
}

export { auth, db, realtimeDb, isConfigured, firebaseConfig };
export default app;
