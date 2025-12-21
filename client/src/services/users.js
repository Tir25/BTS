/**
 * Users Service - Firestore operations for user profiles
 * Handles CRUD for users collection (separate from Firebase Auth)
 */
import {
    collection,
    doc,
    getDocs,
    getDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'users';

/**
 * Get all users with optional role filter
 * Note: We fetch all users and filter client-side to avoid requiring composite indexes
 */
export async function getAllUsers(roleFilter = null) {
    try {
        // Simple query without composite index requirement
        const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        let users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Client-side filtering if role specified
        if (roleFilter && roleFilter !== 'all') {
            users = users.filter(user => user.role === roleFilter);
        }

        return users;
    } catch (error) {
        // If orderBy fails (no index), try without ordering
        if (error.code === 'failed-precondition') {
            console.warn('Firestore index not available, fetching without order');
            const snapshot = await getDocs(collection(db, COLLECTION));
            let users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (roleFilter && roleFilter !== 'all') {
                users = users.filter(user => user.role === roleFilter);
            }

            // Sort client-side
            return users.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
                const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
                return dateB - dateA;
            });
        }
        console.error('Error getting users:', error);
        throw error;
    }
}

/**
 * Get a single user by ID
 */
export async function getUserById(id) {
    try {
        const docRef = doc(db, COLLECTION, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (error) {
        console.error(`Error getting user ${id}:`, error);
        throw error;
    }
}

/**
 * Update user profile data
 */
export async function updateUser(id, data) {
    try {
        const docRef = doc(db, COLLECTION, id);
        await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
        return { id, ...data };
    } catch (error) {
        console.error(`Error updating user ${id}:`, error);
        throw error;
    }
}

/**
 * Delete user from Firestore (does not delete Firebase Auth account)
 */
export async function deleteUser(id) {
    try {
        const docRef = doc(db, COLLECTION, id);
        await deleteDoc(docRef);
        return true;
    } catch (error) {
        console.error(`Error deleting user ${id}:`, error);
        throw error;
    }
}

/**
 * Get user counts by role
 */
export async function getUserStats() {
    try {
        const snapshot = await getDocs(collection(db, COLLECTION));
        const stats = { total: 0, student: 0, faculty: 0, driver: 0, admin: 0 };

        snapshot.docs.forEach(doc => {
            const role = doc.data().role;
            stats.total++;
            if (stats[role] !== undefined) {
                stats[role]++;
            }
        });

        return stats;
    } catch (error) {
        console.error('Error getting user stats:', error);
        throw error;
    }
}

/**
 * Check if email already exists
 */
export async function checkEmailExists(email) {
    try {
        const q = query(collection(db, COLLECTION), where('email', '==', email));
        const snapshot = await getDocs(q);
        return !snapshot.empty;
    } catch (error) {
        console.error('Error checking email:', error);
        return false;
    }
}

// Export as service object for consistency with other services
export const usersService = {
    getAll: getAllUsers,
    getById: getUserById,
    update: updateUser,
    delete: deleteUser,
    getStats: getUserStats,
    checkEmailExists
};

export default usersService;
