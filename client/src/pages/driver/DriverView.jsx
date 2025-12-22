/**
 * Driver View - Uber-Inspired Full Screen Layout
 * Production-grade with modular component architecture
 * 
 * Components used:
 * - FullScreenMap: Full viewport map with control bar
 * - TopStatusBar: Online/offline status, GPS quality
 * - ConfirmDialog: Go offline confirmation
 * - BottomSheet: Expandable route info panel
 * - RouteInfoPanel: Route details, stops, ETA
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui';
import { useDriverTracking, useDriverSchedule } from './hooks';
import { calculateETA } from './utils/eta';
import haptics from './utils/haptics';
import {
    FullScreenMap,
    BottomSheet,
    DriverSkeleton,
    ConfirmDialog,
    TopStatusBar,
    RouteInfoPanel
} from './components';
import './DriverView.css';

export function DriverView() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [currentStopIndex, setCurrentStopIndex] = useState(0);
    const [powerLoading, setPowerLoading] = useState(false);
    const [breakLoading, setBreakLoading] = useState(false);
    const [showOfflineConfirm, setShowOfflineConfirm] = useState(false);
    const autoStartedRef = useRef(false);

    // Custom hooks
    const {
        assignedSchedule,
        isOnDuty,
        loading: scheduleLoading,
        checkIn,
        checkOut
    } = useDriverSchedule(user?.uid);

    const {
        isTracking,
        isPaused,
        location,
        error: gpsError,
        isOffline,
        queueCount,
        startTracking,
        stopTracking,
        pauseTracking,
        resumeTracking
    } = useDriverTracking(user?.uid, isOnDuty, assignedSchedule);

    // Auto-start tracking if already on duty
    useEffect(() => {
        if (isOnDuty && !isTracking && !autoStartedRef.current && !scheduleLoading) {
            autoStartedRef.current = true;
            startTracking();
        }
        if (!isOnDuty) autoStartedRef.current = false;
    }, [isOnDuty, isTracking, scheduleLoading, startTracking]);

    // Reset loading when status changes
    useEffect(() => { setPowerLoading(false); }, [isOnDuty]);

    // Power toggle with confirmation for going offline
    const handlePowerToggle = useCallback(async () => {
        if (isOnDuty) {
            setShowOfflineConfirm(true);
            return;
        }

        // Going online
        setPowerLoading(true);
        haptics.doublePulse();
        try {
            const success = await checkIn();
            if (success) {
                startTracking();
                haptics.success();
                toast.success('You are now online');
            } else {
                haptics.error();
                toast.error('Failed to go online');
            }
        } finally {
            setPowerLoading(false);
        }
    }, [isOnDuty, checkIn, startTracking, toast]);

    // Confirm going offline
    const handleConfirmOffline = useCallback(async () => {
        setShowOfflineConfirm(false);
        setPowerLoading(true);
        haptics.medium();
        try {
            stopTracking();
            const success = await checkOut();
            if (success) {
                haptics.success();
                toast.success('You are now offline');
                setCurrentStopIndex(0);
            } else {
                haptics.error();
                toast.error('Failed to go offline');
            }
        } finally {
            setPowerLoading(false);
        }
    }, [stopTracking, checkOut, toast]);

    // Break toggle
    const handleBreakToggle = useCallback(() => {
        setBreakLoading(true);
        haptics.light();
        try {
            if (isPaused) {
                resumeTracking();
                toast.success('Tracking resumed');
            } else {
                pauseTracking();
                toast.info('Tracking paused');
            }
        } finally {
            setBreakLoading(false);
        }
    }, [isPaused, pauseTracking, resumeTracking, toast]);

    // Next stop handler
    const handleNextStop = useCallback(() => {
        const stops = assignedSchedule?.route?.stops || [];
        if (currentStopIndex < stops.length - 1) {
            setCurrentStopIndex(prev => prev + 1);
            haptics.arrival();
            toast.info(`Arrived at ${stops[currentStopIndex + 1]?.name}`);
        } else if (currentStopIndex === stops.length - 1) {
            setCurrentStopIndex(stops.length);
            haptics.celebration();
            toast.success('🎉 Route completed!');
        }
    }, [assignedSchedule, currentStopIndex, toast]);

    // Logout
    const handleLogout = useCallback(async () => {
        if (isOnDuty) {
            stopTracking();
            await checkOut();
        }
        await signOut();
        navigate('/login');
    }, [isOnDuty, stopTracking, checkOut, signOut, navigate]);

    // Loading state
    if (scheduleLoading) {
        return <div className="driver-app"><DriverSkeleton /></div>;
    }

    const route = assignedSchedule?.route;
    const nextStop = route?.stops?.[currentStopIndex + 1];

    // GPS quality for TopStatusBar
    const getGpsQuality = () => {
        if (!location?.accuracy) return null;
        const accuracy = location.accuracy;
        if (accuracy <= 10) return { level: 'excellent', label: '●●●●', accuracy };
        if (accuracy <= 25) return { level: 'good', label: '●●●○', accuracy };
        if (accuracy <= 50) return { level: 'fair', label: '●●○○', accuracy };
        return { level: 'poor', label: '●○○○', accuracy };
    };

    // ETA calculation
    const eta = location && nextStop
        ? calculateETA(location, nextStop)
        : null;

    return (
        <div className="driver-app">
            <FullScreenMap
                location={location}
                route={route}
                currentStopIndex={currentStopIndex}
                isOnDuty={isOnDuty}
                isLoading={powerLoading}
                onToggleDuty={handlePowerToggle}
            />

            <TopStatusBar
                isOnDuty={isOnDuty}
                isPaused={isPaused}
                isOffline={isOffline}
                gpsQuality={getGpsQuality()}
                queueCount={queueCount}
                onLogout={handleLogout}
            />


            <BottomSheet defaultExpanded={false}>
                <RouteInfoPanel
                    route={route}
                    shift={assignedSchedule?.shift}
                    bus={assignedSchedule?.bus}
                    isOnDuty={isOnDuty}
                    isPaused={isPaused}
                    currentStopIndex={currentStopIndex}
                    eta={eta}
                    gpsError={gpsError}
                    onBreakToggle={handleBreakToggle}
                    onNextStop={handleNextStop}
                    breakLoading={breakLoading}
                    hasSchedule={!!assignedSchedule}
                />
            </BottomSheet>

            <ConfirmDialog
                isOpen={showOfflineConfirm}
                title="Go Offline?"
                message="You will stop tracking and students won't be able to see your location."
                confirmText="Go Offline"
                confirmVariant="danger"
                onConfirm={handleConfirmOffline}
                onCancel={() => setShowOfflineConfirm(false)}
                loading={powerLoading}
            />
        </div>
    );
}

export default DriverView;
