import { collection, addDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Trip History Service
 * Logs and retrieves driver trip records
 */

const COLLECTION = 'tripHistory';

/**
 * Log a trip event (check-in or check-out)
 */
export async function logTripEvent(eventData) {
    const tripRecord = {
        driverId: eventData.driverId,
        driverName: eventData.driverName || 'Unknown',
        eventType: eventData.eventType, // 'check_in' or 'check_out'
        busId: eventData.busId || null,
        routeId: eventData.routeId || null,
        routeName: eventData.routeName || null,
        scheduleId: eventData.scheduleId || null,
        timestamp: new Date().toISOString(),
        location: eventData.location || null, // { lat, lng }
        date: new Date().toISOString().split('T')[0]
    };

    const docRef = await addDoc(collection(db, COLLECTION), tripRecord);
    return { id: docRef.id, ...tripRecord };
}

/**
 * Get trip history with optional filters
 */
export async function getTripHistory(filters = {}) {
    let q = collection(db, COLLECTION);
    const constraints = [];

    if (filters.driverId) {
        constraints.push(where('driverId', '==', filters.driverId));
    }

    if (filters.date) {
        constraints.push(where('date', '==', filters.date));
    }

    constraints.push(orderBy('timestamp', 'desc'));

    if (filters.limit) {
        constraints.push(limit(filters.limit));
    }

    q = query(q, ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get daily stats for analytics
 */
export async function getDailyStats(date = new Date().toISOString().split('T')[0]) {
    const tripHistory = await getTripHistory({ date });

    const checkIns = tripHistory.filter(t => t.eventType === 'check_in').length;
    const checkOuts = tripHistory.filter(t => t.eventType === 'check_out').length;
    const uniqueDrivers = new Set(tripHistory.map(t => t.driverId)).size;
    const uniqueRoutes = new Set(tripHistory.filter(t => t.routeId).map(t => t.routeId)).size;

    return {
        date,
        checkIns,
        checkOuts,
        activeTrips: checkIns - checkOuts,
        uniqueDrivers,
        uniqueRoutes,
        totalEvents: tripHistory.length
    };
}

/**
 * Get weekly summary
 */
export async function getWeeklySummary() {
    const days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const stats = await getDailyStats(dateStr);
        days.push(stats);
    }

    return days;
}

export const tripHistoryService = {
    logTripEvent,
    getTripHistory,
    getDailyStats,
    getWeeklySummary
};

export default tripHistoryService;
