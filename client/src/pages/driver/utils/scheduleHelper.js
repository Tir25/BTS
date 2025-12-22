/**
 * Schedule Fetch Helper
 * Extracts fetch logic to avoid duplication
 * Single responsibility: Fetch schedule with related data
 */
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';

// Helper to format date as YYYY-MM-DD in local timezone
export function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Fetch schedule with related route, bus, and shift data
 * @param {string} userId - Driver's user ID
 * @returns {Promise<Object|null>} - Schedule data with related documents or null
 */
export async function fetchScheduleData(userId) {
    if (!userId) return null;

    const today = formatLocalDate(new Date());
    const schedulesRef = collection(db, 'schedules');
    const q = query(
        schedulesRef,
        where('driverId', '==', userId),
        where('date', '==', today)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const scheduleDoc = snapshot.docs[0];
    const scheduleData = { id: scheduleDoc.id, ...scheduleDoc.data() };

    // Fetch route details
    if (scheduleData.routeId) {
        const routeRef = doc(db, 'routes', scheduleData.routeId);
        const routeSnap = await getDoc(routeRef);
        if (routeSnap.exists()) {
            scheduleData.route = { id: routeSnap.id, ...routeSnap.data() };
        }
    }

    // Fetch bus details
    if (scheduleData.busId) {
        const busRef = doc(db, 'buses', scheduleData.busId);
        const busSnap = await getDoc(busRef);
        if (busSnap.exists()) {
            scheduleData.bus = { id: busSnap.id, ...busSnap.data() };
        }
    }

    // Fetch shift details
    if (scheduleData.shiftId) {
        const shiftRef = doc(db, 'shifts', scheduleData.shiftId);
        const shiftSnap = await getDoc(shiftRef);
        if (shiftSnap.exists()) {
            scheduleData.shift = { id: shiftSnap.id, ...shiftSnap.data() };
        }
    }

    return scheduleData;
}
