import React, { memo, useMemo, useCallback } from 'react';
import { Map, Marker, Popup } from 'maplibre-gl';
import { BusLocation } from '../../types';

interface BusMarkerProps {
  map: Map;
  location: BusLocation;
  busInfo: {
    busNumber: string;
    driverName: string;
    routeName: string;
  };
  isConnected: boolean;
  onMarkerClick?: (busId: string) => void;
  isClustered?: boolean;
  clusterCount?: number;
}

const BusMarker: React.FC<BusMarkerProps> = memo(
  ({
    map,
    location,
    busInfo,
    isConnected,
    onMarkerClick,
    isClustered = false,
    clusterCount = 1,
  }) => {
    const { busId, latitude, longitude, speed, eta } = location;
    const { busNumber, driverName, routeName } = busInfo;

    // Memoize marker element to prevent recreation
    const markerElement = useMemo(() => {
      const el = document.createElement('div');

      if (isClustered && clusterCount > 1) {
        // Cluster marker
        el.className = 'bus-cluster-marker';
        el.innerHTML = `
        <div class="bus-cluster-pin">
          <div class="bus-cluster-icon">🚌</div>
          <div class="bus-cluster-count">${clusterCount}</div>
          <div class="bus-cluster-pulse"></div>
        </div>
      `;
      } else {
        // Individual bus marker
        el.className = 'bus-marker';
        el.innerHTML = `
        <div class="bus-marker-pin">
          <div class="bus-marker-icon">🚌</div>
          <div class="bus-marker-pulse"></div>
        </div>
        <div class="bus-marker-content">
          <div class="bus-number">${busNumber}</div>
          <div class="bus-speed">${speed ? `${speed} km/h` : 'N/A'}</div>
          <div class="bus-eta">${eta ? `ETA: ${eta.estimated_arrival_minutes} min` : 'ETA: N/A'}</div>
        </div>
      `;
      }

      return el;
    }, [busNumber, speed, eta, isClustered, clusterCount]);

    // Memoize popup content
    const popupContent = useMemo(() => {
      if (isClustered && clusterCount > 1) {
        return `
        <div class="bus-cluster-popup">
          <div class="bus-cluster-popup-header">
            <h3>🚌 Bus Cluster</h3>
            <div class="bus-cluster-count">${clusterCount} buses</div>
          </div>
          <div class="bus-cluster-popup-content">
            <p>Click to expand and view individual buses</p>
          </div>
        </div>
      `;
      }

      return `
      <div class="bus-popup">
        <div class="bus-popup-header">
          <h3>🚌 Bus ${busNumber}</h3>
          <div class="bus-status ${isConnected ? 'online' : 'offline'}">
            ${isConnected ? '🟢 Online' : '🔴 Offline'}
          </div>
        </div>
        <div class="bus-popup-content">
          <div class="bus-info">
            <p><strong>Driver:</strong> ${driverName || 'N/A'}</p>
            <p><strong>Route:</strong> ${routeName || 'N/A'}</p>
            <p><strong>Speed:</strong> ${speed ? `${speed} km/h` : 'N/A'}</p>
            <p><strong>Last Update:</strong> ${new Date(location.timestamp).toLocaleTimeString()}</p>
          </div>
        </div>
      </div>
    `;
    }, [
      busNumber,
      driverName,
      routeName,
      speed,
      location.timestamp,
      isConnected,
      isClustered,
      clusterCount,
    ]);

    // Memoized click handler
    const handleMarkerClick = useCallback(() => {
      if (onMarkerClick) {
        onMarkerClick(busId);
      }
    }, [onMarkerClick, busId]);

    // Create marker with memoized callbacks
    const marker = useMemo(() => {
      const markerInstance = new Marker({
        element: markerElement,
        anchor: 'center',
      })
        .setLngLat([longitude, latitude])
        .addTo(map);

      const popup = new Popup({
        offset: 25,
        className: isClustered
          ? 'bus-cluster-popup-container'
          : 'bus-popup-container',
        closeButton: true,
        closeOnClick: false,
      }).setHTML(popupContent);

      markerInstance.setPopup(popup);

      // Add click handler if provided
      if (onMarkerClick) {
        markerInstance
          .getElement()
          .addEventListener('click', handleMarkerClick);
      }

      return markerInstance;
    }, [
      map,
      longitude,
      latitude,
      markerElement,
      popupContent,
      onMarkerClick,
      isClustered,
      handleMarkerClick,
    ]);

    // Update marker position when location changes
    React.useEffect(() => {
      marker.setLngLat([longitude, latitude]);

      // Update popup content
      const popup = marker.getPopup();
      popup.setHTML(popupContent);
    }, [longitude, latitude, popupContent, marker]);

    // Cleanup on unmount
    React.useEffect(() => {
      return () => {
        if (marker) {
          marker.remove();
        }
      };
    }, [marker]);

    return null; // This component doesn't render anything visible
  }
);

BusMarker.displayName = 'BusMarker';

export default BusMarker;
