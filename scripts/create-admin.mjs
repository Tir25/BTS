/**
 * Temporary script to create a new admin user
 * Run with: node scripts/create-admin.mjs
 */
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Firebase config (from .env)
const firebaseConfig = {
    apiKey: "AIzaSyB3QEz8iSpd9YbrojfmP1vevhZNU7gDTBk",
    authDomain: "university-bus-tracker-app.firebaseapp.com",
    projectId: "university-bus-tracker-app",
    storageBucket: "university-bus-tracker-app.firebasestorage.app",
    messagingSenderId: "792306737684",
    appId: "1:792306737684:web:c6e4f2ac274659342bbd01",
    databaseURL: "https://university-bus-tracker-app-default-rtdb.firebaseio.com"
};

// Admin credentials
const ADMIN_EMAIL = "admin@unitrack.edu";
const ADMIN_PASSWORD = "Admin@2025!";
const ADMIN_NAME = "Master Admin";

async function createAdminUser() {
    console.log('Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    try {
        console.log(`Creating admin user: ${ADMIN_EMAIL}...`);

        // Create Firebase Auth user
        const credential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
        const uid = credential.user.uid;
        console.log(`Auth user created with UID: ${uid}`);

        // Create Firestore profile
        console.log('Creating Firestore profile...');
        await setDoc(doc(db, 'users', uid), {
            email: ADMIN_EMAIL,
            name: ADMIN_NAME,
            role: 'admin',
            createdAt: serverTimestamp()
        });

        console.log('\\n✅ Admin user created successfully!');
        console.log('================================');
        console.log(`Email: ${ADMIN_EMAIL}`);
        console.log(`Password: ${ADMIN_PASSWORD}`);
        console.log(`UID: ${uid}`);
        console.log('================================');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin:', error.message);
        process.exit(1);
    }
}

createAdminUser();
