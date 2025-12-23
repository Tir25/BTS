/**
 * Schedule Templates Service
 * Handles CRUD for reusable schedule templates with weekday selection
 * Templates can be used to bulk-generate schedules for date ranges
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

const COLLECTION = 'scheduleTemplates';

/**
 * Days of week constants
 */
export const DAYS_OF_WEEK = [
    { key: 'sunday', label: 'Sun', short: 'S' },
    { key: 'monday', label: 'Mon', short: 'M' },
    { key: 'tuesday', label: 'Tue', short: 'T' },
    { key: 'wednesday', label: 'Wed', short: 'W' },
    { key: 'thursday', label: 'Thu', short: 'T' },
    { key: 'friday', label: 'Fri', short: 'F' },
    { key: 'saturday', label: 'Sat', short: 'S' }
];

/**
 * Get all templates
 */
export async function getAll() {
    const templatesRef = collection(db, COLLECTION);
    const q = query(templatesRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get active templates only
 */
export async function getActive() {
    const all = await getAll();
    return all.filter(t => t.isActive !== false);
}

/**
 * Get template by ID
 */
export async function getById(id) {
    const docRef = doc(db, COLLECTION, id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() };
}

/**
 * Create new template
 */
export async function create(data) {
    const templatesRef = collection(db, COLLECTION);
    const docRef = await addDoc(templatesRef, {
        ...data,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
    return { id: docRef.id, ...data };
}

/**
 * Update template
 */
export async function update(id, data) {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
    });
    return { id, ...data };
}

/**
 * Delete template
 */
export async function remove(id) {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
    return true;
}

/**
 * Generate dates for a template within a date range
 * @param {Array<string>} daysOfWeek - e.g., ['monday', 'tuesday']
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @returns {Array<string>} Array of date strings (YYYY-MM-DD)
 */
export function generateDates(daysOfWeek, startDate, endDate) {
    const dates = [];
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    while (current <= end) {
        const dayName = dayNames[current.getDay()];
        if (daysOfWeek.includes(dayName)) {
            dates.push(formatDate(current));
        }
        current.setDate(current.getDate() + 1);
    }

    return dates;
}

/**
 * Format date as YYYY-MM-DD (local timezone)
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Generate schedule entries from template
 */
export function generateScheduleEntries(template, dates) {
    return dates.map(date => ({
        date,
        driverId: template.driverId,
        busId: template.busId,
        routeId: template.routeId,
        shiftId: template.shiftId,
        templateId: template.id,
        createdAt: serverTimestamp()
    }));
}

export const scheduleTemplatesService = {
    getAll,
    getActive,
    getById,
    create,
    update,
    delete: remove,
    generateDates,
    generateScheduleEntries,
    DAYS_OF_WEEK
};

export default scheduleTemplatesService;
