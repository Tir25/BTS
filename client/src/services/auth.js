// Auth service functions
import {
    createUserWithEmailAndPassword,
    sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

/**
 * Create a new user with email/password and store their profile
 * @param {Object} userData - User data including email, password, role, name
 */
export async function createUser(userData) {
    const { email, password, role, name, phone } = userData;

    try {
        // Create auth user
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = credential.user.uid;

        // Store user profile in Firestore
        await setDoc(doc(db, 'users', uid), {
            email,
            role,
            name,
            phone: phone || '',
            createdAt: serverTimestamp()
        });

        return { uid, email, role, name };
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
}

/**
 * Send password reset email
 */
export async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        return true;
    } catch (error) {
        console.error('Error sending reset email:', error);
        throw error;
    }
}
