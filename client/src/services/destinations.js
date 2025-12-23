/**
 * Destinations Service
 * Manages destination locations (university campus, field trips, events)
 */
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

const COLLECTION = 'destinations';

// Default destination - Ganpat University
export const DEFAULT_DESTINATION = {
    name: 'Ganpat University',
    shortName: 'GNSU',
    lat: 23.529528,
    lng: 72.457694,
    address: 'Ganpat Vidyanagar, Kherva, Mehsana, Gujarat 384012',
    isDefault: true,
    type: 'campus',
    color: '#ef4444',
    icon: '🎓',
    isActive: true
};

/**
 * Get all destinations (sorted by createdAt desc, client-side)
 */
export async function getAll() {
    try {
        const snapshot = await getDocs(collection(db, COLLECTION));
        const destinations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort by createdAt descending (newest first)
        return destinations.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateB - dateA;
        });
    } catch (error) {
        console.error('Error getting destinations:', error);
        throw error;
    }
}

/**
 * Get active destinations only (sorted by name, filtered client-side)
 */
export async function getActive() {
    try {
        // Fetch all destinations and filter client-side to avoid composite index requirement
        const snapshot = await getDocs(collection(db, COLLECTION));
        const destinations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return destinations
            .filter(d => d.isActive !== false)
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } catch (error) {
        console.error('Error getting active destinations:', error);
        throw error;
    }
}

/**
 * Get the default destination (university campus)
 */
export async function getDefault() {
    try {
        const q = query(
            collection(db, COLLECTION),
            where('isDefault', '==', true)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        }
        return null;
    } catch (error) {
        console.error('Error getting default destination:', error);
        throw error;
    }
}

/**
 * Get destination by ID
 */
export async function getById(id) {
    try {
        const docRef = doc(db, COLLECTION, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (error) {
        console.error(`Error getting destination ${id}:`, error);
        throw error;
    }
}

/**
 * Create a new destination
 */
export async function create(data) {
    try {
        // If setting as default, unset other defaults first
        if (data.isDefault) {
            await unsetAllDefaults();
        }

        const docRef = await addDoc(collection(db, COLLECTION), {
            ...data,
            color: data.color || '#ef4444',
            createdAt: serverTimestamp()
        });
        return { id: docRef.id, ...data };
    } catch (error) {
        console.error('Error creating destination:', error);
        throw error;
    }
}

/**
 * Update a destination
 */
export async function update(id, data) {
    try {
        // If setting as default, unset other defaults first
        if (data.isDefault) {
            await unsetAllDefaults();
        }

        const docRef = doc(db, COLLECTION, id);
        await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
        return { id, ...data };
    } catch (error) {
        console.error(`Error updating destination ${id}:`, error);
        throw error;
    }
}

/**
 * Delete a destination (prevents deleting default)
 */
export async function remove(id) {
    try {
        const destination = await getById(id);
        if (destination?.isDefault) {
            throw new Error('Cannot delete the default destination');
        }

        const docRef = doc(db, COLLECTION, id);
        await deleteDoc(docRef);
        return true;
    } catch (error) {
        console.error(`Error deleting destination ${id}:`, error);
        throw error;
    }
}

/**
 * Unset all default flags
 */
async function unsetAllDefaults() {
    const q = query(collection(db, COLLECTION), where('isDefault', '==', true));
    const snapshot = await getDocs(q);

    for (const docSnap of snapshot.docs) {
        await updateDoc(doc(db, COLLECTION, docSnap.id), { isDefault: false });
    }
}

/**
 * Seed the default destination if none exists
 */
export async function seedDefaultIfNeeded() {
    try {
        const existing = await getDefault();
        if (!existing) {
            console.log('Seeding default destination: Ganpat University');
            await create(DEFAULT_DESTINATION);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error seeding default destination:', error);
        throw error;
    }
}

// Destination types for the UI
export const DESTINATION_TYPES = [
    { value: 'campus', label: 'Campus', icon: '🎓' },
    { value: 'fieldtrip', label: 'Field Trip', icon: '🚌' },
    { value: 'event', label: 'Event', icon: '🎉' },
    { value: 'custom', label: 'Custom', icon: '📍' }
];

// Export as service object for consistency
export const destinationsService = {
    getAll,
    getActive,
    getDefault,
    getById,
    create,
    update,
    delete: remove,
    seedDefaultIfNeeded,
    DEFAULT_DESTINATION,
    DESTINATION_TYPES
};

export default destinationsService;
