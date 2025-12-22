/**
 * Script to create a test admin user for development
 * Run with: node scripts/create-test-admin.mjs
 * 
 * Requires: firebase-admin package
 * Install: npm install firebase-admin
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Test admin credentials
const TEST_ADMIN = {
    email: 'devadmin@unitrack.edu',
    password: 'Admin@123', // Known password for testing
    name: 'Dev Admin',
    role: 'admin'
};

// Path to service account key (you'll need to download this from Firebase Console)
const serviceAccountPath = join(__dirname, '..', 'service-account-key.json');

async function createTestAdmin() {
    // Check for service account
    if (!existsSync(serviceAccountPath)) {
        console.log('');
        console.log('╔════════════════════════════════════════════════════════════════╗');
        console.log('║                     SETUP REQUIRED                              ║');
        console.log('╠════════════════════════════════════════════════════════════════╣');
        console.log('║ 1. Go to Firebase Console → Project Settings → Service Accounts ║');
        console.log('║ 2. Click "Generate new private key"                              ║');
        console.log('║ 3. Save the file as:                                            ║');
        console.log('║    service-account-key.json                                      ║');
        console.log('║    in the project root directory                                 ║');
        console.log('║ 4. Run this script again                                         ║');
        console.log('╚════════════════════════════════════════════════════════════════╝');
        console.log('');
        console.log('Service account key not found at:', serviceAccountPath);
        process.exit(1);
    }

    try {
        // Initialize Firebase Admin
        const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
        initializeApp({
            credential: cert(serviceAccount)
        });

        const auth = getAuth();
        const db = getFirestore();

        console.log('Creating test admin user...');
        console.log(`Email: ${TEST_ADMIN.email}`);
        console.log(`Password: ${TEST_ADMIN.password}`);

        let uid;

        // Check if user already exists
        try {
            const existingUser = await auth.getUserByEmail(TEST_ADMIN.email);
            console.log('User already exists, updating password...');
            await auth.updateUser(existingUser.uid, {
                password: TEST_ADMIN.password
            });
            uid = existingUser.uid;
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                // Create new user
                const userRecord = await auth.createUser({
                    email: TEST_ADMIN.email,
                    password: TEST_ADMIN.password,
                    displayName: TEST_ADMIN.name
                });
                uid = userRecord.uid;
                console.log('Created new Firebase Auth user');
            } else {
                throw error;
            }
        }

        // Create/Update Firestore profile
        await db.collection('users').doc(uid).set({
            email: TEST_ADMIN.email,
            name: TEST_ADMIN.name,
            role: TEST_ADMIN.role,
            createdAt: new Date()
        }, { merge: true });

        console.log('');
        console.log('✅ Test admin created successfully!');
        console.log('');
        console.log('LOGIN CREDENTIALS:');
        console.log(`  Email:    ${TEST_ADMIN.email}`);
        console.log(`  Password: ${TEST_ADMIN.password}`);
        console.log('');

    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
}

createTestAdmin();
