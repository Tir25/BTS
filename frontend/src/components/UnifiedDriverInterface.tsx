import React, { useEffect, useCallback, memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDriverInterface, useDriverInterfaceActions } from '../stores/useDriverInterfaceStore';
import { useDriverAuth } from '../context/DriverAuthContext';
import { useDriverTracking } from '../hooks/useDriverTracking';
import DriverHeader from './driver/DriverHeader';
import DriverControls from './driver/DriverControls';
import DriverInstructions from './driver/DriverInstructions';
import DriverStops from './driver/DriverStops';
import DriverLogin from './DriverLogin';
import DriverDashboardErrorBoundary from './error/DriverDashboardErrorBoundary';
import { logger } from '../utils/logger';
import { errorHandler } from '../utils/errorHandler';
import { useUnifiedLoadingState } from '../hooks/useUnifiedLoadingState';
import DriverStatusCards from './driver/DriverStatusCards';
import DriverMapSection from './driver/DriverMapSection';
import { useDriverInitialization } from '../hooks/useDriverInitialization';
import { useStopsManagement } from './driver/hooks/useStopsManagement';
import { useDriverInterfaceState } from './driver/hooks/useDriverInterfaceState';
import { useDriverSignOut } from './driver/hooks/useDriverSignOut';
import { useStopReachedHandler } from './driver/hooks/useStopReachedHandler';
import DriverInterfaceLoading from './driver/DriverInterfaceLoading';
import DriverInterfaceError from './driver/DriverInterfaceError';

import './DriverInterface.css';
import './DriverDashboard.css';
import { 
  UnifiedDriverInterfaceProps,
} from '../types/driver';

const UnifiedDriverInterface: React.FC<UnifiedDriverInterfaceProps> = memo(({ 
  mode = 'login' 
}) => {
  const navigate = useNavigate();
  
  // Unified loading state management
  const loadingState = useUnifiedLoadingState({
    onPhaseChange: (phase) => {
      logger.debug('Loading phase changed', 'UnifiedDriverInterface', { phase });
    },
    onComplete: () => {
      logger.info('Driver interface initialization complete', 'UnifiedDriverInterface');
    },
    onError: (error) => {
      logger.error('Loading error in driver interface', 'UnifiedDriverInterface', { error });
    },
  });
  
  // State management stores
  const driverState = useDriverInterface();
  const driverActions = useDriverInterfaceActions();
  
  // Driver auth context
  const { 
    busAssignment, 
    isAuthenticated, 
    isWebSocketConnected, 
    isWebSocketAuthenticated, 
    isWebSocketInitializing, 
    error, 
    logout, 
    retryConnection, 
    refreshAssignment 
  } = useDriverAuth();
  
  // Driver tracking hook
  const tracking = useDriverTracking(
    isAuthenticated, 
    isWebSocketConnected, 
    isWebSocketAuthenticated,
    busAssignment?.driver_id,
    busAssignment?.bus_id
  );

  // Stops management hook
  const { stopsState, currentShiftName, refreshStops } = useStopsManagement({
    isAuthenticated,
    busAssignment,
    onAssignmentUpdate: driverActions.updateBusAssignment,
  });
  
  // Driver interface state synchronization
  useDriverInterfaceState({
    busAssignment,
    isAuthenticated,
    isWebSocketConnected,
    isWebSocketAuthenticated,
    isWebSocketInitializing,
    driverState,
    driverActions,
  });
  
  // Convert tracking state to location state format for UI components
  const locationState = useMemo(() => ({
    isTracking: tracking.isTracking,
    currentLocation: tracking.lastLocation ? {
      coords: {
        latitude: tracking.lastLocation.latitude,
        longitude: tracking.lastLocation.longitude,
        accuracy: tracking.lastLocation.accuracy,
        altitude: null,
        altitudeAccuracy: null,
        heading: tracking.lastLocation.heading || null,
        speed: tracking.lastLocation.speed || null,
      },
      timestamp: tracking.lastLocation.timestamp,
    } : null,
    locationError: tracking.locationError,
    updateCount: tracking.updateCount,
    lastUpdateTime: tracking.lastUpdateTime ? tracking.lastUpdateTime.toString() : null,
  }), [tracking.isTracking, tracking.lastLocation, tracking.locationError, tracking.updateCount, tracking.lastUpdateTime]);
  
  // Stop reached handler
  const { handleStopReached } = useStopReachedHandler({
    busAssignment,
    stopsState,
    onRefreshStops: refreshStops,
  });

  // Driver sign-out handler
  const { handleSignOut } = useDriverSignOut({
    logout,
    stopTracking: tracking.stopTracking,
  });

  // Handle navigation for unauthenticated users
  useEffect(() => {
    if (!driverState.isLoading && !driverState.isAuthenticated && mode === 'dashboard') {
      // Small delay to allow authentication state to propagate if user just logged in
      const redirectTimer = setTimeout(() => {
        // Double-check authentication state before redirecting
        if (!isAuthenticated && !driverState.isLoading) {
          logger.info('Redirecting unauthenticated user to login', 'UnifiedDriverInterface');
          navigate('/driver-login', { replace: true });
        }
      }, 500); // 500ms delay to allow state propagation
      
      return () => clearTimeout(redirectTimer);
    }
  }, [driverState.isLoading, driverState.isAuthenticated, isAuthenticated, mode, navigate]);

  // Retry connection handler
  const handleRetryConnection = useCallback(async () => {
    try {
      driverActions.setInitializationState({ initializationError: null });
      await retryConnection();
    } catch (err) {
      const appError = errorHandler.handleError(err, 'UnifiedDriverInterface-retry-connection');
      driverActions.setInitializationState({
        initializationError: appError.userMessage || appError.message
      });
    }
  }, [retryConnection, driverActions]);

  // Memoized StudentMap configuration for better performance
  const studentMapConfig = useMemo(() => ({
    enableRealTime: true,
    enableClustering: true,
    enableOfflineMode: true,
    enablePerformanceMonitoring: process.env.NODE_ENV === 'development',
    maxBuses: 50,
    updateInterval: 1000,
    enableAccessibility: true,
    enableInternationalization: false,
  }), []);

  // Coordinate loading phases via hook
  useDriverInitialization(mode, driverState as any, loadingState as any);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Cleanup driver interface store subscriptions
      try {
        driverActions.cleanup();
      } catch (error) {
        logger.warn('Error during driver interface cleanup', 'component', { error });
      }
      
      logger.debug('UnifiedDriverInterface component cleaned up', 'component');
    };
  }, [driverActions]);

  // Show login if not authenticated
  if (mode === 'login' || (!isAuthenticated && !loadingState.state.isLoading)) {
    return <DriverLogin />;
  }

  // Unified loading state with progress indication
  // Only show loading if we're actually loading OR if we don't have the essential data
  if ((loadingState.state.isLoading && (!isAuthenticated || !busAssignment)) || !isAuthenticated || !busAssignment) {
    return (
      <DriverInterfaceLoading
        loadingState={loadingState.state}
        initializationError={driverState.initializationError}
        error={driverState.error}
        onRetry={loadingState.retry}
        onDismissError={() => driverActions.setInitializationState({ initializationError: null })}
      />
    );
  }

  // Enhanced error state with specific error handling
  if (error) {
    return (
      <DriverInterfaceError
        error={error}
        onRetry={() => window.location.reload()}
        onRetryConnection={handleRetryConnection}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <DriverDashboardErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-2 sm:p-4 driver-dashboard-container">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <DriverHeader
            busInfo={busAssignment ? {
              bus_id: busAssignment.bus_id,
              bus_number: busAssignment.bus_number,
              route_id: busAssignment.route_id,
              route_name: busAssignment.route_name,
              driver_id: busAssignment.driver_id,
              driver_name: busAssignment.driver_name,
            } : null}
            connectionStatus={
              isWebSocketConnected && isWebSocketAuthenticated 
                ? 'connected' 
                : isWebSocketConnected || isWebSocketInitializing
                  ? 'connecting'
                  : 'disconnected'
            }
            onSignOut={handleSignOut}
            onRetryConnection={handleRetryConnection}
            onRefreshAssignment={refreshAssignment}
            reconnectAttempts={0}
            lastHeartbeat={Date.now()}
            shiftName={currentShiftName || undefined}
          />

          <DriverStatusCards
            isWebSocketConnected={isWebSocketConnected}
            isWebSocketAuthenticated={isWebSocketAuthenticated}
            isTracking={locationState.isTracking}
            updateCount={locationState.updateCount}
            lastUpdateTime={locationState.lastUpdateTime}
            locationError={locationState.locationError}
          />

          {/* Main Content */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            <DriverMapSection
              isAuthenticated={isAuthenticated}
              busAssignment={busAssignment || null}
              tracking={{ accuracy: tracking.accuracy, isTracking: locationState.isTracking }}
              studentMapConfig={studentMapConfig}
            />

            {/* Controls Section */}
            <div className="space-y-4 sm:space-y-6 order-1 xl:order-2">
              <DriverControls
                isTracking={tracking.isTracking}
                isAuthenticated={isAuthenticated}
                connectionStatus={tracking.connectionStatus === 'reconnecting' ? 'connecting' : tracking.connectionStatus}
                onStartTracking={async () => {
                  const { apiService } = await import('../api');
                  await apiService.startTracking(busAssignment?.driver_id, busAssignment?.shift_id || null);
                  await tracking.startTracking();
                  await refreshStops();
                }}
                onStopTracking={async () => {
                  const { apiService } = await import('../api');
                  await apiService.stopTracking(busAssignment?.driver_id);
                  tracking.stopTracking();
                  await refreshStops();
                }}
                lastUpdateTime={tracking.lastUpdateTime ? tracking.lastUpdateTime.toString() : null}
                updateCount={tracking.updateCount}
                locationError={tracking.locationError}
                onClearError={tracking.clearError}
                onRequestPermission={tracking.requestPermission}
                accuracy={tracking.accuracy}
                accuracyLevel={tracking.accuracyLevel}
                accuracyMessage={tracking.accuracyMessage}
                accuracyWarning={tracking.accuracyWarning}
              />

              {/* Stops List */}
              <DriverStops
                completed={stopsState?.completed || []}
                remaining={stopsState?.remaining || []}
                next={stopsState?.next || null}
                disabled={!isAuthenticated}
                onRefresh={refreshStops}
                onReachStop={handleStopReached}
              />

              <DriverInstructions />
            </div>
          </div>
        </div>
      </div>
    </DriverDashboardErrorBoundary>
  );
});

// Set display name for debugging
UnifiedDriverInterface.displayName = 'UnifiedDriverInterface';

export default UnifiedDriverInterface;
