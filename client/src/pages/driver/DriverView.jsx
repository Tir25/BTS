import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, set, onValue } from 'firebase/database';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { realtimeDb, db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Card, CardBody } from '@/components/ui';
import './DriverView.css';

/**
 * Driver Mobile View
 * GPS tracking with offline queue, check-in/out, assigned route display
 */
export function DriverView() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    const [isOnDuty, setIsOnDuty] = useState(false);
    const [isTracking, setIsTracking] = useState(false);
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);
    const [watchId, setWatchId] = useState(null);
    const [assignedSchedule, setAssignedSchedule] = useState(null);
    const [currentStopIndex, setCurrentStopIndex] = useState(0);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const offlineQueue = useRef([]);

    // Monitor online/offline status
    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            flushOfflineQueue();
        };
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Flush offline queue when back online
    const flushOfflineQueue = async () => {
        if (offlineQueue.current.length === 0) return;

        for (const update of offlineQueue.current) {
            try {
                const locationRef = ref(realtimeDb, `busLocations/${update.driverId}`);
                await set(locationRef, update);
            } catch (err) {
                console.error('Failed to flush queued update:', err);
            }
        }
        offlineQueue.current = [];
    };

    // Fetch today's assigned schedule
    useEffect(() => {
        if (!user?.uid) return;

        const fetchSchedule = async () => {
            try {
                const today = new Date().toISOString().split('T')[0];
                const schedulesRef = collection(db, 'schedules');
                const q = query(schedulesRef, where('driverId', '==', user.uid), where('date', '==', today));
                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    const scheduleDoc = snapshot.docs[0];
                    const scheduleData = { id: scheduleDoc.id, ...scheduleDoc.data() };

                    // Fetch route details if routeId exists
                    if (scheduleData.routeId) {
                        const routesRef = collection(db, 'routes');
                        const routesSnapshot = await getDocs(routesRef);
                        const route = routesSnapshot.docs.find(d => d.id === scheduleData.routeId);
                        if (route) {
                            scheduleData.route = { id: route.id, ...route.data() };
                        }
                    }

                    setAssignedSchedule(scheduleData);
                }
            } catch (err) {
                console.error('Failed to fetch schedule:', err);
            }
        };

        fetchSchedule();
    }, [user?.uid]);

    // Check driver status on mount
    useEffect(() => {
        if (!user?.uid) return;

        const statusRef = ref(realtimeDb, `driverStatus/${user.uid}`);
        const unsubscribe = onValue(statusRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                setIsOnDuty(data.isOnDuty || false);
            }
        });

        return () => unsubscribe();
    }, [user?.uid]);

    // Start GPS tracking
    const startTracking = useCallback(() => {
        if (!navigator.geolocation) {
            setError('Geolocation not supported');
            return;
        }

        const id = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, heading, speed } = position.coords;
                setLocation({ lat: latitude, lng: longitude, heading, speed });

                const locationUpdate = {
                    lat: latitude,
                    lng: longitude,
                    heading: heading || 0,
                    speed: speed || 0,
                    driverId: user.uid,
                    routeId: assignedSchedule?.routeId || null,
                    routeName: assignedSchedule?.route?.name || null,
                    isActive: true,
                    lastUpdated: Date.now()
                };

                // Queue or send update
                if (isOffline) {
                    offlineQueue.current.push(locationUpdate);
                } else if (user?.uid && isOnDuty) {
                    const locationRef = ref(realtimeDb, `busLocations/${user.uid}`);
                    set(locationRef, locationUpdate);
                }
            },
            (err) => {
                console.error('GPS Error:', err);
                setError('Unable to get location');
            },
            {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 10000
            }
        );

        setWatchId(id);
        setIsTracking(true);
    }, [user?.uid, isOnDuty, isOffline, assignedSchedule]);

    // Stop GPS tracking
    const stopTracking = useCallback(() => {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            setWatchId(null);
        }
        setIsTracking(false);

        if (user?.uid) {
            const locationRef = ref(realtimeDb, `busLocations/${user.uid}`);
            set(locationRef, { isActive: false, lastUpdated: Date.now() });
        }
    }, [watchId, user?.uid]);

    // Check in/out
    const handleCheckIn = async () => {
        if (!user?.uid) return;

        const statusRef = ref(realtimeDb, `driverStatus/${user.uid}`);
        await set(statusRef, {
            isOnDuty: true,
            checkedInAt: Date.now(),
            driverId: user.uid,
            scheduleId: assignedSchedule?.id || null
        });
        setIsOnDuty(true);
        startTracking();
    };

    const handleCheckOut = async () => {
        stopTracking();

        if (!user?.uid) return;

        const statusRef = ref(realtimeDb, `driverStatus/${user.uid}`);
        await set(statusRef, {
            isOnDuty: false,
            checkedOutAt: Date.now(),
            driverId: user.uid
        });
        setIsOnDuty(false);
    };

    const handleSignOut = async () => {
        if (isOnDuty) {
            await handleCheckOut();
        }
        await signOut();
        navigate('/login');
    };

    // Mark next stop as reached
    const handleNextStop = () => {
        if (assignedSchedule?.route?.stops && currentStopIndex < assignedSchedule.route.stops.length - 1) {
            setCurrentStopIndex(prev => prev + 1);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, [watchId]);

    const route = assignedSchedule?.route;
    const stops = route?.stops || [];
    const nextStop = stops[currentStopIndex];

    return (
        <div className="driver-view">
            <header className="driver-header">
                <div className="header-left">
                    <span className="logo-icon">🚌</span>
                    <h1>UniTrack Driver</h1>
                </div>
                <div className="header-right">
                    {isOffline && <span className="offline-badge">Offline</span>}
                    <Button variant="ghost" size="sm" onClick={handleSignOut}>
                        Logout
                    </Button>
                </div>
            </header>

            <main className="driver-content">
                {/* Status Card */}
                <Card className="status-card">
                    <CardBody>
                        <div className="status-indicator">
                            <span className={`status-dot ${isOnDuty ? 'active' : 'inactive'}`} />
                            <span>{isOnDuty ? 'On Duty' : 'Off Duty'}</span>
                        </div>
                        <h2>Welcome, {user?.name || 'Driver'}</h2>
                    </CardBody>
                </Card>

                {/* Check In/Out Button */}
                <div className="action-section">
                    {!isOnDuty ? (
                        <Button
                            fullWidth
                            className="check-in-btn"
                            onClick={handleCheckIn}
                        >
                            🟢 Check In & Start Shift
                        </Button>
                    ) : (
                        <Button
                            fullWidth
                            variant="danger"
                            className="check-out-btn"
                            onClick={handleCheckOut}
                        >
                            🔴 Check Out & End Shift
                        </Button>
                    )}
                </div>

                {/* Assigned Route */}
                {assignedSchedule && (
                    <Card className="route-card">
                        <CardBody>
                            <h3>🗺️ Today's Route</h3>
                            {route ? (
                                <>
                                    <div className="route-name">{route.name}</div>
                                    {route.description && <p className="route-desc">{route.description}</p>}

                                    {/* Next Stop */}
                                    {isOnDuty && nextStop && (
                                        <div className="next-stop">
                                            <div className="next-stop-label">Next Stop:</div>
                                            <div className="next-stop-name">{nextStop.name}</div>
                                            <Button size="sm" onClick={handleNextStop}>
                                                ✓ Arrived at Stop
                                            </Button>
                                        </div>
                                    )}

                                    {/* Stops List */}
                                    <div className="stops-progress">
                                        {stops.map((stop, idx) => (
                                            <div
                                                key={stop.id || idx}
                                                className={`stop-item ${idx < currentStopIndex ? 'completed' : ''} ${idx === currentStopIndex ? 'current' : ''}`}
                                            >
                                                <span className="stop-marker">{idx < currentStopIndex ? '✓' : idx + 1}</span>
                                                <span className="stop-name">{stop.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <p className="text-muted">No route assigned for this schedule</p>
                            )}
                        </CardBody>
                    </Card>
                )}

                {/* GPS Status */}
                {isOnDuty && (
                    <Card className="gps-card">
                        <CardBody>
                            <h3>📍 GPS Tracking</h3>
                            <div className="gps-status">
                                <span className={`tracking-indicator ${isTracking ? 'active' : ''}`} />
                                <span>{isTracking ? 'Sharing Location' : 'Not Tracking'}</span>
                                {offlineQueue.current.length > 0 && (
                                    <span className="queue-badge">{offlineQueue.current.length} queued</span>
                                )}
                            </div>

                            {location && (
                                <div className="location-info">
                                    <p>Lat: {location.lat.toFixed(6)}</p>
                                    <p>Lng: {location.lng.toFixed(6)}</p>
                                    {location.speed !== null && (
                                        <p>Speed: {(location.speed * 3.6).toFixed(1)} km/h</p>
                                    )}
                                </div>
                            )}

                            {error && <p className="error-text">{error}</p>}
                        </CardBody>
                    </Card>
                )}

                {/* Quick Info */}
                {!assignedSchedule && (
                    <Card className="info-card">
                        <CardBody>
                            <h3>Today's Info</h3>
                            <p className="text-muted">
                                {isOnDuty
                                    ? 'Your location is being shared with students in real-time.'
                                    : 'No schedule assigned for today. Check in to start tracking.'}
                            </p>
                        </CardBody>
                    </Card>
                )}
            </main>
        </div>
    );
}

export default DriverView;
