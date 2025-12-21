// Firestore database service functions
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Generic CRUD operations for Firestore collections
 */

// Get all documents from a collection
export async function getAll(collectionName) {
    try {
        const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error(`Error getting ${collectionName}:`, error);
        throw error;
    }
}

// Get a single document by ID
export async function getById(collectionName, id) {
    try {
        const docRef = doc(db, collectionName, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (error) {
        console.error(`Error getting ${collectionName}/${id}:`, error);
        throw error;
    }
}

// Create a new document
export async function create(collectionName, data) {
    try {
        const docRef = await addDoc(collection(db, collectionName), {
            ...data,
            createdAt: serverTimestamp()
        });
        return { id: docRef.id, ...data };
    } catch (error) {
        console.error(`Error creating ${collectionName}:`, error);
        throw error;
    }
}

// Update an existing document
export async function update(collectionName, id, data) {
    try {
        const docRef = doc(db, collectionName, id);
        await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
        return { id, ...data };
    } catch (error) {
        console.error(`Error updating ${collectionName}/${id}:`, error);
        throw error;
    }
}

// Delete a document
export async function remove(collectionName, id) {
    try {
        const docRef = doc(db, collectionName, id);
        await deleteDoc(docRef);
        return true;
    } catch (error) {
        console.error(`Error deleting ${collectionName}/${id}:`, error);
        throw error;
    }
}

/**
 * Drivers Service - Uses 'users' collection with role='driver'
 * This unifies drivers with the User Management system
 */
export const driversService = {
    getAll: async () => {
        try {
            // Query users collection where role is 'driver'
            const q = query(
                collection(db, 'users'),
                where('role', '==', 'driver')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting drivers:', error);
            throw error;
        }
    },
    getById: (id) => getById('users', id),
    create: async (data) => {
        // Ensure role is set to driver
        return create('users', { ...data, role: 'driver' });
    },
    update: (id, data) => update('users', id, data),
    delete: (id) => remove('users', id)
};

export const busesService = {
    getAll: () => getAll('buses'),
    getById: (id) => getById('buses', id),
    create: (data) => create('buses', data),
    update: (id, data) => update('buses', id, data),
    delete: (id) => remove('buses', id)
};

export const routesService = {
    getAll: () => getAll('routes'),
    getById: (id) => getById('routes', id),
    create: (data) => create('routes', data),
    update: (id, data) => update('routes', id, data),
    delete: (id) => remove('routes', id)
};

export const shiftsService = {
    getAll: () => getAll('shifts'),
    getById: (id) => getById('shifts', id),
    create: (data) => create('shifts', data),
    update: (id, data) => update('shifts', id, data),
    delete: (id) => remove('shifts', id)
};

export const schedulesService = {
    getAll: () => getAll('schedules'),
    getById: (id) => getById('schedules', id),
    create: (data) => create('schedules', data),
    update: (id, data) => update('schedules', id, data),
    delete: (id) => remove('schedules', id)
};
