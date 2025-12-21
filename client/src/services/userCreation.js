/**
 * User Creation Service - Firebase Auth + Firestore profile creation
 * Uses secondary Firebase app to prevent admin logout
 */
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, getSecondaryAuth, cleanupSecondaryApp } from './firebase';
import { checkEmailExists } from './users';

// University email domain
const UNIVERSITY_DOMAIN = 'gnu.ac.in';

/**
 * Generate email based on role
 * Students: rollNo@gnu.ac.in (e.g., 24084231065@gnu.ac.in)
 * Faculty: name@gnu.ac.in (e.g., sagarshrivastav@gnu.ac.in)
 * Drivers: use provided email
 */
export function generateEmail(role, rollNo, providedEmail, name = '') {
    if (role === 'driver') {
        return providedEmail;
    }
    if (role === 'faculty' && name) {
        // Faculty uses name-based email (lowercase, no spaces)
        const nameEmail = name.toLowerCase().replace(/\s+/g, '');
        return `${nameEmail}@${UNIVERSITY_DOMAIN}`;
    }
    // Students use roll number
    return `${rollNo}@${UNIVERSITY_DOMAIN}`;
}

/**
 * Convert birthday date to password format (DDMMYYYY)
 * @param {Date|string} birthday - Date object or string
 */
export function birthdayToPassword(birthday) {
    const date = birthday instanceof Date ? birthday : new Date(birthday);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}${month}${year}`;
}

/**
 * Create a single user (student, faculty, or driver)
 * Uses secondary Firebase app to prevent admin logout!
 * 
 * @param {Object} userData - User data object
 * @returns {Object} Created user with uid
 */
export async function createSingleUser(userData) {
    const { role, rollNo, email: providedEmail, name, birthday, phone, licenseNumber } = userData;

    // Generate email based on role (faculty uses name, students use rollNo)
    const email = generateEmail(role, rollNo, providedEmail, name);

    // Generate password from birthday
    const password = birthdayToPassword(birthday);

    // Check if email already exists in Firestore
    const exists = await checkEmailExists(email);
    if (exists) {
        throw new Error(`User with email ${email} already exists`);
    }

    // Get secondary auth to create user without logging out admin
    const { secondaryApp, secondaryAuth } = getSecondaryAuth();

    try {
        // Create Firebase Auth user on SECONDARY app (won't affect admin session!)
        const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const uid = credential.user.uid;

        // Sign out from secondary app immediately
        await secondaryAuth.signOut();

        // Prepare profile data
        const profileData = {
            email,
            role,
            name,
            phone: phone || '',
            birthday: birthday instanceof Date ? birthday.toISOString() : birthday,
            createdAt: serverTimestamp()
        };

        // Add role-specific fields
        if (role === 'student' || role === 'faculty') {
            profileData.rollNo = rollNo;
        }
        if (role === 'driver' && licenseNumber) {
            profileData.licenseNumber = licenseNumber;
        }

        // Store user profile in Firestore (uses primary db connection)
        await setDoc(doc(db, 'users', uid), profileData);

        // Cleanup secondary app
        await cleanupSecondaryApp(secondaryApp);

        return { uid, email, role, name, password };
    } catch (error) {
        // Cleanup on error too
        await cleanupSecondaryApp(secondaryApp);
        console.error('Error creating user:', error);
        throw error;
    }
}

/**
 * Validate user data before creation
 * Returns array of validation errors
 */
export function validateUserData(userData) {
    const errors = [];
    const { role, rollNo, email, name, birthday, licenseNumber } = userData;

    if (!name?.trim()) {
        errors.push('Name is required');
    }

    if (!role || !['student', 'faculty', 'driver'].includes(role)) {
        errors.push('Valid role is required (student/faculty/driver)');
    }

    if (role === 'student' && !rollNo?.trim()) {
        errors.push('Roll number is required for students');
    }

    if (role === 'driver' && !email?.trim()) {
        errors.push('Email is required for drivers');
    }

    if (role === 'driver' && !licenseNumber?.trim()) {
        errors.push('License number is required for drivers');
    }

    if (!birthday) {
        errors.push('Birthday is required');
    }

    return errors;
}

/**
 * Send password reset email to user
 * @param {string} email - User's email address
 */
export async function sendUserPasswordReset(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        return true;
    } catch (error) {
        console.error('Error sending password reset:', error);
        throw error;
    }
}

export default {
    generateEmail,
    birthdayToPassword,
    createSingleUser,
    validateUserData,
    sendUserPasswordReset
};
