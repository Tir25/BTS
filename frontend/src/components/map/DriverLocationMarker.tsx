import React, { memo, useMemo, useCallback, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { formatTime } from '../../utils/dateFormatter';

interface DriverLocationMarkerProps {
  map: maplibregl.Map;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    heading?: number;
    speed?: number;
    timestamp: number;
  };
  isTracking: boolean;
  onMarkerClick?: () => void;
}

const DriverLocationMarker: React.FC<DriverLocationMarkerProps> = memo(
  ({
    map,
    location,
    isTracking,
    onMarkerClick,
  }) => {
    const { latitude, longitude, accuracy, heading, speed, timestamp } = location;
    
    // CRITICAL FIX: Use ref to persist marker instance across renders
    // This prevents marker recreation on every location update
    const markerRef = useRef<maplibregl.Marker | null>(null);
    const popupRef = useRef<maplibregl.Popup | null>(null);
    // PRODUCTION FIX: Store event listener reference for proper cleanup
    const clickListenerRef = useRef<((e: MouseEvent) => void) | null>(null);
    // PRODUCTION FIX: Track last click time for debouncing
    const lastClickTimeRef = useRef<number>(0);
    const DEBOUNCE_DELAY = 300; // 300ms debounce to prevent rapid clicks

    // Memoize marker element - only recreate when tracking state changes significantly
    const markerElement = useMemo(() => {
      const el = document.createElement('div');
      el.className = 'driver-location-marker';
      
      // Create a distinctive driver marker
      el.innerHTML = `
        <div class="driver-marker-pin">
          <div class="driver-marker-icon">🚗</div>
          <div class="driver-marker-pulse ${isTracking ? 'active' : ''}"></div>
          <div class="driver-marker-ring ${isTracking ? 'active' : ''}"></div>
        </div>
        <div class="driver-marker-content">
          <div class="driver-label">You</div>
          <div class="driver-speed">${speed ? `${Math.round(speed)} km/h` : 'N/A'}</div>
          <div class="driver-accuracy">±${accuracy ? Math.round(accuracy) : '?'}m</div>
        </div>
      `;

      return el;
    }, [isTracking]); // Removed speed and accuracy to prevent unnecessary recreations

    // PRODUCTION FIX: Memoized click handler with debouncing and event propagation control
    const handleMarkerClick = useCallback((e: MouseEvent) => {
      // PRODUCTION FIX: Prevent event bubbling
      e.stopPropagation();
      e.preventDefault();
      
      // PRODUCTION FIX: Debounce rapid clicks
      const now = Date.now();
      if (now - lastClickTimeRef.current < DEBOUNCE_DELAY) {
        return; // Ignore rapid consecutive clicks
      }
      lastClickTimeRef.current = now;
      
      // Execute callback if provided
      if (onMarkerClick) {
        onMarkerClick();
      }
    }, [onMarkerClick]);

    // Create marker ONCE when component mounts or map changes
    useEffect(() => {
      // Remove existing marker if it exists (cleanup before recreation)
      if (markerRef.current) {
        // PRODUCTION FIX: Properly remove event listener before removing marker
        if (clickListenerRef.current) {
          const markerElement = markerRef.current.getElement();
          if (markerElement) {
            markerElement.removeEventListener('click', clickListenerRef.current);
          }
          clickListenerRef.current = null;
        }
        markerRef.current.remove();
        markerRef.current = null;
      }

      // Create new marker instance
      const markerInstance = new maplibregl.Marker({
        element: markerElement,
        anchor: 'center',
      })
        .setLngLat([longitude, latitude])
        .addTo(map);

      // Create popup
      const popup = new maplibregl.Popup({
        offset: 25,
        className: 'driver-popup-container',
        closeButton: true,
        closeOnClick: false,
      });

      markerInstance.setPopup(popup);
      popupRef.current = popup;

      // PRODUCTION FIX: Add click handler with proper reference tracking
      if (onMarkerClick) {
        const markerElement = markerInstance.getElement();
        if (markerElement) {
          // Store listener reference for proper cleanup
          clickListenerRef.current = handleMarkerClick;
          markerElement.addEventListener('click', handleMarkerClick, { passive: false });
        }
      }

      // Store marker reference
      markerRef.current = markerInstance;

      // Cleanup function - remove marker when component unmounts or map changes
      return () => {
        // PRODUCTION FIX: Properly remove event listener first
        if (markerRef.current && clickListenerRef.current) {
          const markerElement = markerRef.current.getElement();
          if (markerElement) {
            markerElement.removeEventListener('click', clickListenerRef.current);
          }
          clickListenerRef.current = null;
        }
        
        if (markerRef.current) {
          markerRef.current.remove();
          markerRef.current = null;
        }
        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }
      };
    }, [map, markerElement, handleMarkerClick]); // Removed onMarkerClick from dependencies to prevent unnecessary recreations

    // Update marker position and popup content when location changes
    // PRODUCTION FIX: Throttled updates to prevent excessive re-renders
    useEffect(() => {
      if (!markerRef.current) return;

      // PRODUCTION FIX: Throttle position updates to prevent excessive marker movement
      const currentPos = markerRef.current.getLngLat();
      const distance = Math.sqrt(
        Math.pow(currentPos.lng - longitude, 2) + 
        Math.pow(currentPos.lat - latitude, 2)
      );
      
      // Only update position if moved more than ~0.0001 degrees (~10m)
      if (distance > 0.0001) {
        markerRef.current.setLngLat([longitude, latitude]);
      }

      // PRODUCTION FIX: Throttle popup updates to reduce render overhead
      if (popupRef.current) {
        const lastUpdate = (popupRef.current as any)._lastUpdate || 0;
        const now = Date.now();
        
        // Only update popup every 3 seconds to prevent excessive re-renders
        if (now - lastUpdate > 3000) {
          const updateTime = formatTime(timestamp);
          const popupContent = `
            <div class="driver-popup-container">
              <div class="driver-popup-header">
                <div class="driver-popup-icon">🚗</div>
                <div class="driver-popup-title">Your Location</div>
              </div>
              <div class="driver-popup-content">
                <div class="driver-popup-item">
                  <span class="driver-popup-label">Status:</span>
                  <span class="driver-popup-value ${isTracking ? 'tracking' : 'stopped'}">
                    ${isTracking ? 'Tracking Active' : 'Tracking Stopped'}
                  </span>
                </div>
                <div class="driver-popup-item">
                  <span class="driver-popup-label">Speed:</span>
                  <span class="driver-popup-value">${speed ? `${Math.round(speed)} km/h` : 'N/A'}</span>
                </div>
                <div class="driver-popup-item">
                  <span class="driver-popup-label">Accuracy:</span>
                  <span class="driver-popup-value">±${accuracy ? Math.round(accuracy) : '?'} meters</span>
                </div>
                <div class="driver-popup-item">
                  <span class="driver-popup-label">Heading:</span>
                  <span class="driver-popup-value">${heading ? `${Math.round(heading)}°` : 'N/A'}</span>
                </div>
                <div class="driver-popup-item">
                  <span class="driver-popup-label">Last Update:</span>
                  <span class="driver-popup-value">${updateTime}</span>
                </div>
              </div>
            </div>
          `;
          popupRef.current.setHTML(popupContent);
          (popupRef.current as any)._lastUpdate = now;
        }
      }
    }, [longitude, latitude, timestamp, isTracking]); // Removed speed, accuracy, heading to reduce update frequency

    return null; // This component doesn't render anything visible
  }
);

DriverLocationMarker.displayName = 'DriverLocationMarker';

export default DriverLocationMarker;
