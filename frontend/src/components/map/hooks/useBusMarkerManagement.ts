/**
 * Hook for managing bus markers on the map
 */
import { useRef, useCallback, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import { logger } from '../../../utils/logger';
import { BusInfo, BusLocation } from '../../../types';
import { unifiedWebSocketService, BusLocation as WSBusLocation } from '../../../services/UnifiedWebSocketService';
import { formatTime } from '../../../utils/dateFormatter';
import { busBelongsToRoute, getBusRouteId } from '../../../utils/busRouteFilter';
import { apiService } from '../../../api';

export interface UseBusMarkerManagementProps {
  map: React.MutableRefObject<maplibregl.Map | null>;
  selectedRoute: string;
  getCanonicalBusId: (incomingId: string) => string;
  busInfoCache: React.MutableRefObject<Map<string, BusInfo>>;
  convertBusToBusInfo: (bus: any, lastBusLocations?: { [busId: string]: BusLocation }) => BusInfo;
  buses: BusInfo[];
  setBuses: (buses: BusInfo[] | ((prev: BusInfo[]) => BusInfo[])) => void;
  busIdAliases: React.MutableRefObject<Map<string, string>>;
  pendingBusFetches: React.MutableRefObject<Set<string>>;
  lastBusLocations: { [busId: string]: BusLocation };
}

export interface UseBusMarkerManagementReturn {
  markers: React.MutableRefObject<{ [busId: string]: maplibregl.Marker }>;
  popups: React.MutableRefObject<{ [busId: string]: maplibregl.Popup }>;
  updateBusMarker: (location: WSBusLocation) => void;
  removeBusMarker: (busId: string) => void;
  removeAllMarkers: () => void;
}

/**
 * Manages bus markers on the map
 */
export function useBusMarkerManagement({
  map,
  selectedRoute,
  getCanonicalBusId,
  busInfoCache,
  convertBusToBusInfo,
  buses,
  setBuses,
  busIdAliases,
  pendingBusFetches,
  lastBusLocations,
}: UseBusMarkerManagementProps): UseBusMarkerManagementReturn {
  const markers = useRef<{ [busId: string]: maplibregl.Marker }>({});
  const popups = useRef<{ [busId: string]: maplibregl.Popup }>({});

  // Update bus marker
  const updateBusMarker = useCallback((location: WSBusLocation) => {
    if (!map.current) return;

    // Normalize bus id
    const canonicalBusId = getCanonicalBusId(location.busId);

    // Get bus info from cache
    let bus = busInfoCache.current.get(canonicalBusId);

    // Enhanced matching for bus lookup in cache and buses array
    if (!bus) {
      // Try buses array first
      const direct = buses.find(b => (b as any).id === canonicalBusId || b.busId === canonicalBusId || (b as any).bus_id === canonicalBusId);
      if (direct) {
        bus = direct;
        busInfoCache.current.set(canonicalBusId, bus);
      }
      
      // Try cache
      if (!bus) {
        for (const [cacheKey, cachedBus] of busInfoCache.current.entries()) {
          const exactMatch = cacheKey === location.busId;
          const stringMatch = String(cacheKey) === String(location.busId);
          const busNumberMatch = cachedBus.busNumber === location.busId;
          const partialMatch = cacheKey.includes(location.busId) || location.busId.includes(cacheKey);
          
          if (exactMatch || stringMatch || busNumberMatch || partialMatch) {
            bus = cachedBus;
            busIdAliases.current.set(location.busId, cacheKey);
            logger.info('🔍 ENHANCED DEBUG: Found bus in updateBusMarker cache using enhanced matching', 'useBusMarkerManagement', {
              cacheKey: cacheKey,
              incomingBusId: location.busId,
              matchType: exactMatch ? 'exact' : stringMatch ? 'string' : busNumberMatch ? 'busNumber' : 'partial'
            });
            break;
          }
        }
      }
    }

    // Handle missing bus info - create minimal bus info and fetch from API
    if (!bus) {
      logger.warn('⚠️ No bus info found for location update - fetching from API', 'useBusMarkerManagement', {
        busId: location.busId,
        canonicalBusId,
        lat: location.latitude,
        lng: location.longitude
      });
      
      // Create minimal bus info for immediate display
      const minimalLocation: BusLocation = {
        busId: location.busId,
        driverId: (location as any).driverId || '',
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: location.timestamp,
        speed: location.speed,
        heading: location.heading,
      };
      
      bus = {
        busId: location.busId,
        busNumber: location.busId.slice(0, 8) + '...',
        routeName: 'Unknown Route',
        driverName: 'Unknown Driver',
        driverId: (location as any).driverId || '',
        routeId: '',
        currentLocation: minimalLocation,
      };
      
      // Add to cache for immediate use
      busInfoCache.current.set(canonicalBusId, bus);
      busIdAliases.current.set(location.busId, canonicalBusId);
      
      // Fetch bus info from API asynchronously (only if not already fetching)
      if (!pendingBusFetches.current.has(canonicalBusId)) {
        pendingBusFetches.current.add(canonicalBusId);
        
        (async () => {
          try {
            const busInfoResponse = await apiService.getBusInfo(location.busId);
            
            if (busInfoResponse.success && busInfoResponse.data) {
              // Convert API bus to BusInfo format
              const fullBusInfo = convertBusToBusInfo(busInfoResponse.data, lastBusLocations);
              
              // Update cache with full bus info
              busInfoCache.current.set(canonicalBusId, fullBusInfo);
              
              // Update buses state
              setBuses(prev => {
                const existing = prev.find(b => b.busId === canonicalBusId);
                if (existing) {
                  return prev.map(b => b.busId === canonicalBusId ? fullBusInfo : b);
                } else {
                  return [...prev, fullBusInfo];
                }
              });
              
              // Update marker popup if it exists
              const existingMarker = markers.current[canonicalBusId];
              const existingPopup = popups.current[canonicalBusId];
              if (existingMarker && existingPopup && map.current) {
                existingPopup.setHTML(createPopupHTML(fullBusInfo, location));
                logger.info('✅ Bus info fetched and marker updated', 'useBusMarkerManagement', {
                  busId: location.busId,
                  routeName: fullBusInfo.routeName,
                  driverName: fullBusInfo.driverName
                });
              }
            }
          } catch (error) {
            logger.error('❌ Failed to fetch bus info from API', 'useBusMarkerManagement', {
              busId: location.busId,
              error: error instanceof Error ? error.message : String(error)
            });
          } finally {
            // Remove from pending fetches
            pendingBusFetches.current.delete(canonicalBusId);
          }
        })();
      }
    }

    // Check if bus belongs to selected route
    if (selectedRoute !== 'all' && !busBelongsToRoute(bus, selectedRoute)) {
      // Hide marker if it exists
      const existingMarker = markers.current[canonicalBusId];
      if (existingMarker) {
        existingMarker.remove();
        delete markers.current[canonicalBusId];
        if (popups.current[canonicalBusId]) {
          popups.current[canonicalBusId].remove();
          delete popups.current[canonicalBusId];
        }
      }
      return;
    }

    // Check if marker already exists
    let marker = markers.current[canonicalBusId];

    if (marker) {
      // Update marker position
      const currentPos = marker.getLngLat();
      const latDiff = Math.abs(currentPos.lat - location.latitude);
      const lngDiff = Math.abs(currentPos.lng - location.longitude);
      
      // Only update if moved more than ~0.0001 degrees (~10m)
      if (latDiff > 0.0001 || lngDiff > 0.0001) {
        marker.setLngLat([location.longitude, location.latitude]);
      }
      
      // Update popup content (throttled to reduce DOM manipulation)
      const popup = popups.current[canonicalBusId];
      if (popup && bus) {
        const lastUpdate = (popup as any)._lastUpdate || 0;
        const now = Date.now();
        
        // Only update popup every 60 seconds
        if (now - lastUpdate > 60000) {
          popup.setHTML(createPopupHTML(bus, location));
          (popup as any)._lastUpdate = now;
        }
      }
    } else {
      // Create new marker with custom HTML element
      const el = document.createElement('div');
      el.className = 'bus-marker-container';
      el.innerHTML = `
        <div class="bus-marker-pulse"></div>
        <div class="bus-marker-icon-wrapper">
          <div class="bus-marker-icon">🚌</div>
        </div>
      `;
      el.style.width = '50px';
      el.style.height = '50px';
      
      marker = new maplibregl.Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat([location.longitude, location.latitude])
        .addTo(map.current);

      markers.current[canonicalBusId] = marker;

      // Auto-center map on first active bus location
      logger.info('📍 New bus marker created - centering map', 'useBusMarkerManagement', {
        busId: location.busId,
        coordinates: [location.longitude, location.latitude]
      });
      
      // Center and zoom to show the bus location
      if (map.current) {
        map.current.setCenter([location.longitude, location.latitude]);
        map.current.setZoom(15); // Good zoom level for city view
      }

      // Create popup for new marker
      const popup = new maplibregl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false,
        className: 'bus-popup-clean'
      }).setHTML(createPopupHTML(bus, location));

      marker.setPopup(popup);
      popups.current[canonicalBusId] = popup;
      (popup as any)._lastUpdate = Date.now();

      logger.info('✅ Bus marker created', 'useBusMarkerManagement', {
        busId: canonicalBusId,
        busNumber: bus.busNumber,
      });
    }
  }, [map, selectedRoute, getCanonicalBusId, busInfoCache, convertBusToBusInfo, buses, setBuses, busIdAliases, pendingBusFetches, lastBusLocations]);

  // Remove bus marker
  const removeBusMarker = useCallback((busId: string) => {
    const canonicalBusId = getCanonicalBusId(busId);
    const marker = markers.current[canonicalBusId];
    const popup = popups.current[canonicalBusId];

    if (marker) {
      // Remove popup first
      if (popup) {
        popup.remove();
        delete popups.current[canonicalBusId];
      }
      
      // Remove marker
      marker.remove();
      delete markers.current[canonicalBusId];
    }
  }, [getCanonicalBusId]);

  // Remove all markers
  const removeAllMarkers = useCallback(() => {
    Object.values(markers.current).forEach(marker => marker.remove());
    Object.values(popups.current).forEach(popup => popup.remove());
    markers.current = {};
    popups.current = {};
  }, []);

  // Cleanup: Remove all markers when component unmounts
  useEffect(() => {
    return () => {
      removeAllMarkers();
    };
  }, [removeAllMarkers]);

  return {
    markers,
    popups,
    updateBusMarker,
    removeBusMarker,
    removeAllMarkers,
  };
}

/**
 * Helper function to create popup HTML
 */
function createPopupHTML(bus: BusInfo, location: WSBusLocation): string {
  return `
    <div class="p-4 min-w-[220px]">
      <div class="flex items-center mb-3 pb-2 border-b border-slate-200">
        <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl mr-3">
          🚌
        </div>
        <h3 class="font-bold text-slate-900 text-lg">Bus ${bus.busNumber}</h3>
      </div>
      <div class="space-y-2">
        <div class="flex items-center text-sm">
          <span class="text-slate-500 w-16">Route:</span>
          <span class="font-medium text-slate-900">${bus.routeName}</span>
        </div>
        <div class="flex items-center text-sm">
          <span class="text-slate-500 w-16">Driver:</span>
          <span class="font-medium text-slate-900">${bus.driverName}</span>
        </div>
        <div class="flex items-center text-xs text-slate-600 mt-3 pt-2 border-t border-slate-200">
          <span>Last Update: ${formatTime(location.timestamp)}</span>
        </div>
        ${location.speed ? `
          <div class="flex items-center justify-between mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
            <span class="text-xs font-medium text-green-700">Speed</span>
            <span class="text-sm font-bold text-green-900">${location.speed} km/h</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

