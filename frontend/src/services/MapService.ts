import maplibregl from 'maplibre-gl';
import { IMapService, IMapConfiguration } from './interfaces/IMapService';
import { BusLocation } from '../types';
import { BusInfo } from '../types';
import { formatTime } from '../utils/dateFormatter';

import { logger } from '../utils/logger';

interface ClusterPoint {
  id: string;
  latitude: number;
  longitude: number;
  count: number;
  busIds: string[];
}

export class MapService implements IMapService {
  private map: maplibregl.Map | null = null;
  private markers: { [busId: string]: maplibregl.Marker } = {};
  private clusterMarkers: { [clusterId: string]: maplibregl.Marker } = {};
  private isInitializedFlag = false;
  // CRITICAL FIX: Removed busInfoCache - MapStore is now single source of truth
  private mapStore: any = null; // Reference to MapStore for reading bus info
  private enableClustering: boolean = false;
  private clusteringMaxZoom: number = 14;
  private clusterRadius: number = 50; // pixels

  private readonly defaultConfig: IMapConfiguration = {
    center: [72.571, 23.025], // Default center (Ahmedabad, India)
    zoom: 12,
    style: {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: [
            'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
          ],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors',
          maxzoom: 19,
        },
      },
      layers: [
        {
          id: 'osm-tiles',
          type: 'raster',
          source: 'osm',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
    maxZoom: 19,
    minZoom: 1,
  };

  /**
   * Initialize MapService with a container (original method)
   */
  async initialize(container: HTMLDivElement): Promise<void> {
    if (this.isInitializedFlag || !container) {
      return;
    }

    logger.info('🗺️ Initializing MapService...', 'component');

    this.map = new maplibregl.Map({
      container,
      style: this.defaultConfig.style,
      center: this.defaultConfig.center,
      zoom: this.defaultConfig.zoom,
      bearing: 0,
      pitch: 0,
      attributionControl: true,
      maxZoom: this.defaultConfig.maxZoom,
      minZoom: this.defaultConfig.minZoom,
      preserveDrawingBuffer: false,
      antialias: true,
      dragRotate: false,
    });

    // Add navigation controls
    this.map.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Handle map load event
    this.map.once('load', () => {
      logger.info('🗺️ Map loaded successfully', 'component');
      this.isInitializedFlag = true;
    });

    // Handle map errors
    this.map.on('error', (e) => {
      logger.error('Error occurred', 'component', { error: '❌ Map error:', e });
    });
  }

  /**
   * Set external map instance (for React components that manage their own map)
   */
  setMapInstance(map: maplibregl.Map): void {
    if (this.map && this.map !== map) {
      // Cleanup old map if different
      this.cleanupMarkers();
    }
    this.map = map;
    this.isInitializedFlag = true;
    logger.info('🗺️ MapService using external map instance', 'component');
  }

  /**
   * CRITICAL FIX: Set MapStore reference for reading bus info
   * MapStore is now the single source of truth for bus data
   */
  setMapStore(store: any): void {
    this.mapStore = store;
    logger.info('✅ MapService: MapStore reference set', 'component');
  }

  /**
   * CRITICAL FIX: Get bus info from MapStore instead of cache
   * Returns null if MapStore not available or bus not found
   */
  private getBusInfo(busId: string): BusInfo | null {
    if (!this.mapStore) {
      logger.warn('⚠️ MapService: MapStore not available', 'component', { busId });
      return null;
    }
    
    try {
      const state = this.mapStore.getState();
      return state.buses.find((bus: BusInfo) => {
        const bid = (bus as any).id || (bus as any).bus_id || bus.busId;
        return bid === busId;
      }) || null;
    } catch (error) {
      logger.error('❌ Error reading bus info from MapStore', 'component', { error, busId });
      return null;
    }
  }

  /**
   * DEPRECATED: Legacy method for backward compatibility
   * Use setMapStore instead - MapStore is now single source of truth
   */
  setBusInfo(busId: string, busInfo: BusInfo): void {
    logger.warn('⚠️ setBusInfo is deprecated - MapStore manages bus info', 'component');
    // No-op: Bus info is managed by MapStore
  }

  /**
   * DEPRECATED: Legacy method for backward compatibility
   * Use setMapStore instead - MapStore is now single source of truth
   */
  setBusInfoCache(busInfoMap: Map<string, BusInfo>): void {
    logger.warn('⚠️ setBusInfoCache is deprecated - MapStore manages bus info', 'component');
    // No-op: Bus info is managed by MapStore
  }

  /**
   * Enable or disable clustering
   */
  setClusteringEnabled(enabled: boolean, maxZoom: number = 14, radius: number = 50): void {
    this.enableClustering = enabled;
    this.clusteringMaxZoom = maxZoom;
    this.clusterRadius = radius;
    logger.info(`🗺️ Clustering ${enabled ? 'enabled' : 'disabled'}`, 'component', {
      maxZoom,
      radius
    });
  }

  /**
   * ENHANCED: Get dynamic cluster radius based on zoom level
   * Radius increases as zoom decreases to maintain visual clarity
   */
  private getDynamicClusterRadius(zoom: number): number {
    // Base radius increases as zoom decreases
    // At zoom 10: ~80px radius, at zoom 14: ~50px radius
    const baseRadius = Math.max(50, 100 - (zoom - 10) * 7.5);
    return baseRadius;
  }

  addRoute(routeId: string, routeData: any): void {
    if (!this.map || !this.map.isStyleLoaded()) {
      logger.warn('🗺️ Map not ready for route addition', 'component');
      return;
    }

    try {
      // Add route source
      this.map.addSource(routeId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {
            name: routeData.name,
            description: routeData.description,
            distance: routeData.distance_km,
            duration: routeData.estimated_duration_minutes,
          },
          geometry: routeData.stops,
        },
      });

      // Add route line layer
      this.map.addLayer({
        id: routeId,
        type: 'line',
        source: routeId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': `hsl(${Math.random() * 360}, 70%, 50%)`,
          'line-width': 4,
          'line-opacity': 0.8,
        },
      });

      logger.info('🗺️ Added route to map', 'component', { data: routeData.name });
    } catch (error) {
      logger.error(`❌ Error adding route ${routeId}:`, 'component', { error });
    }
  }

  updateBusMarker(busId: string, location: BusLocation): void {
    if (!this.map || !this.map.isStyleLoaded()) return;

    // If clustering is enabled and zoom is below threshold, use clustering
    if (this.enableClustering && this.map.getZoom() < this.clusteringMaxZoom) {
      // Store location for clustering, but don't render individual markers
      // Clustering will be handled by updateClusters() method
      return;
    }

    const { latitude, longitude } = location;

    // PRODUCTION FIX: Validate coordinates before updating marker
    if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
        isNaN(latitude) || isNaN(longitude) ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      logger.warn('⚠️ Invalid coordinates for marker update', 'component', {
        busId,
        latitude,
        longitude
      });
      return;
    }

    // Create or update marker
    if (!this.markers[busId]) {
      this.createBusMarker(busId, location);
    } else {
      // PRODUCTION FIX: Throttle marker position updates - only update if moved significantly (>10m)
      const currentPos = this.markers[busId].getLngLat();
      const distance = Math.sqrt(
        Math.pow(currentPos.lng - longitude, 2) + 
        Math.pow(currentPos.lat - latitude, 2)
      );
      
      // Only update position if moved more than ~0.0001 degrees (~10m)
      if (distance > 0.0001) {
        try {
          this.markers[busId].setLngLat([longitude, latitude]);
        } catch (error) {
          logger.error('❌ Error updating marker position', 'component', {
            error: error instanceof Error ? error.message : String(error),
            busId
          });
          // Try to recreate marker if update fails
          this.removeBusMarker(busId);
          this.createBusMarker(busId, location);
        }
      }
      
      // PRODUCTION FIX: Throttle popup updates - only update every 5 seconds
      const popup = this.markers[busId].getPopup();
      if (popup) {
        const lastUpdate = (popup as any)._lastUpdate || 0;
        const now = Date.now();
        
        if (now - lastUpdate > 5000) {
          try {
            this.updateMarkerPopup(busId, location);
            (popup as any)._lastUpdate = now;
          } catch (error) {
            logger.warn('⚠️ Error updating marker popup', 'component', {
              error: error instanceof Error ? error.message : String(error),
              busId
            });
          }
        }
      }
    }
  }

  /**
   * Update clusters based on current bus locations
   * Call this after updating all bus markers
   */
  updateClusters(locations: { [busId: string]: BusLocation }): void {
    if (!this.map || !this.map.isStyleLoaded() || !this.enableClustering) {
      return;
    }

    const currentZoom = this.map.getZoom();
    
    // If zoomed in enough, show individual markers instead of clusters
    if (currentZoom >= this.clusteringMaxZoom) {
      // Clear clusters and ensure individual markers are shown
      this.clearClusters();
      
      // Create individual markers for all locations when zoomed in
      Object.entries(locations).forEach(([busId, location]) => {
        if (!this.markers[busId]) {
          this.createBusMarker(busId, location);
        }
      });
      return;
    }

    // Clear individual markers when clustering is active (to avoid duplicates)
    Object.keys(this.markers).forEach(busId => {
      try {
        this.markers[busId].remove();
        delete this.markers[busId];
      } catch (error) {
        // Ignore errors during cleanup
      }
    });
    this.markers = {};

    // Calculate clusters
    const clusters = this.calculateClusters(locations, currentZoom);
    
    // Clear existing cluster markers
    this.clearClusters();
    
    // Render cluster markers
    clusters.forEach(cluster => {
      this.createClusterMarker(cluster);
    });
  }

  /**
   * Calculate clusters from bus locations
   */
  private calculateClusters(locations: { [busId: string]: BusLocation }, zoom: number): ClusterPoint[] {
    const locationArray = Object.entries(locations).map(([busId, loc]) => ({ busId, ...loc }));
    
    if (locationArray.length === 0) return [];

    const clusters: ClusterPoint[] = [];
    const processed = new Set<string>();

    locationArray.forEach(({ busId, latitude, longitude }) => {
      if (processed.has(busId)) return;

      // Find nearby buses
      const nearbyBuses = locationArray.filter(({ busId: otherId, latitude: otherLat, longitude: otherLon }) => {
        if (processed.has(otherId) || busId === otherId) return false;
        
        const distance = this.calculateDistance(latitude, longitude, otherLat, otherLon);
        const pixelDistance = this.distanceToPixels(distance, zoom);
        
        // ENHANCED: Use dynamic radius based on zoom level
        const dynamicRadius = this.getDynamicClusterRadius(zoom);
        return pixelDistance <= dynamicRadius;
      });

      // Create cluster
      const clusterBuses = [{ busId, latitude, longitude }, ...nearbyBuses];
      const clusterLat = clusterBuses.reduce((sum, b) => sum + b.latitude, 0) / clusterBuses.length;
      const clusterLon = clusterBuses.reduce((sum, b) => sum + b.longitude, 0) / clusterBuses.length;

      clusters.push({
        id: `cluster_${busId}`,
        latitude: clusterLat,
        longitude: clusterLon,
        count: clusterBuses.length,
        busIds: clusterBuses.map(b => b.busId),
      });

      // Mark buses as processed
      clusterBuses.forEach(b => processed.add(b.busId));
    });

    return clusters;
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert distance to pixels based on zoom level
   */
  private distanceToPixels(distanceKm: number, zoomLevel: number): number {
    const earthCircumference = 40075; // km
    const pixelsPerKm = (256 * Math.pow(2, zoomLevel)) / earthCircumference;
    return distanceKm * pixelsPerKm;
  }

  /**
   * Create a cluster marker with enhanced UI and expand-on-click functionality
   */
  private createClusterMarker(cluster: ClusterPoint): void {
    if (!this.map) return;

    const el = document.createElement('div');
    el.className = 'bus-cluster-marker';
    
    // Enhanced cluster sizing and styling
    const size = Math.min(30 + cluster.count * 2, 70);
    const color = cluster.count > 10 ? '#ef4444' : cluster.count > 5 ? '#f59e0b' : '#10b981';
    
    el.innerHTML = `
      <div class="bus-cluster-pin" style="width: ${size}px; height: ${size}px; background: ${color};">
        <div class="bus-cluster-icon">🚌</div>
        <div class="bus-cluster-pulse"></div>
      </div>
      <div class="bus-cluster-count">${cluster.count}</div>
    `;
    
    el.style.cursor = 'pointer';
    
    // Enhanced hover effect with animation
    el.addEventListener('mouseenter', () => {
      el.style.transform = 'scale(1.15)';
      el.style.transition = 'transform 0.2s ease';
    });
    
    el.addEventListener('mouseleave', () => {
      el.style.transform = 'scale(1)';
    });

    const marker = new maplibregl.Marker({
      element: el,
      anchor: 'center',
    })
      .setLngLat([cluster.longitude, cluster.latitude])
      .addTo(this.map);

    // Enhanced popup with cluster details
    const popup = new maplibregl.Popup({
      offset: 25,
      closeButton: true,
      closeOnClick: false,
      className: 'bus-cluster-popup-container',
    }).setHTML(`
      <div class="bus-cluster-popup">
        <div class="bus-cluster-popup-header">
          <h3>🚌 Bus Cluster</h3>
          <div class="bus-cluster-count-badge">${cluster.count} buses</div>
        </div>
        <div class="bus-cluster-popup-content">
          <p>Click to zoom in and expand this cluster</p>
          <p>Zoom level: ${Math.round(this.map.getZoom())}</p>
        </div>
      </div>
    `);

    marker.setPopup(popup);
    
    // ENHANCED: Expand-on-click functionality
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Calculate optimal zoom level for cluster expansion
      const currentZoom = this.map!.getZoom();
      const targetZoom = Math.min(currentZoom + 2, this.clusteringMaxZoom);
      
      // Smoothly zoom to cluster center
      this.map!.easeTo({
        center: [cluster.longitude, cluster.latitude],
        zoom: targetZoom,
        duration: 800,
      });
      
      logger.info('🔍 Expanding cluster', 'component', {
        clusterId: cluster.id,
        busCount: cluster.count,
        targetZoom
      });
    });

    this.clusterMarkers[cluster.id] = marker;
  }

  /**
   * Clear all cluster markers
   */
  private clearClusters(): void {
    Object.values(this.clusterMarkers).forEach(marker => {
      try {
        marker.remove();
      } catch (error) {
        logger.warn('Warning', 'component', { data: '⚠️ Error removing cluster marker:', error });
      }
    });
    this.clusterMarkers = {};
  }

  private createBusMarker(busId: string, location: BusLocation): void {
    if (!this.map || !this.map.isStyleLoaded()) return;

    const { latitude, longitude } = location;
    
    // CRITICAL FIX: Get bus info from MapStore instead of cache
    const busInfo = this.getBusInfo(busId);
    const busNumber = busInfo?.busNumber || `Bus ${busId.substring(0, 8)}`;
    const routeName = busInfo?.routeName || 'Unknown Route';
    const driverName = busInfo?.driverName || 'Unknown Driver';

    // Create new marker with enhanced styling
    const el = document.createElement('div');
    el.className = 'bus-marker';
    el.innerHTML = `
      <div class="bus-marker-pin">
        <div class="bus-marker-icon">🚌</div>
        <div class="bus-marker-pulse"></div>
      </div>
      <div class="bus-marker-content">
        <div class="bus-number">${busNumber}</div>
        <div class="bus-speed">${location.speed ? `${location.speed} km/h` : 'N/A'}</div>
        <div class="bus-eta">${location.eta ? `ETA: ${typeof location.eta === 'number' ? location.eta : location.eta.estimated_arrival_minutes || 'N/A'} min` : 'ETA: N/A'}</div>
      </div>
    `;

    const marker = new maplibregl.Marker({
      element: el,
      anchor: 'center',
      color: '#ef4444',
      scale: 1.2,
    })
      .setLngLat([longitude, latitude])
      .addTo(this.map);

    // Add enhanced popup
    const popup = new maplibregl.Popup({
      offset: 25,
      className: 'bus-popup-container',
      closeButton: true,
      closeOnClick: false,
    }).setHTML(this.createPopupHTML(busId, location, busInfo));

    marker.setPopup(popup);
    (popup as any)._lastUpdate = Date.now();
    this.markers[busId] = marker;

    logger.debug('Debug info', 'component', { data: `📍 Created marker for bus ${busId} at [${longitude.toFixed(6)}, ${latitude.toFixed(6)}]` });
  }

  private updateMarkerPopup(busId: string, location: BusLocation): void {
    const marker = this.markers[busId];
    if (!marker) return;

    const popup = marker.getPopup();
    if (popup) {
      // CRITICAL FIX: Get bus info from MapStore instead of cache
      const busInfo = this.getBusInfo(busId);
      popup.setHTML(this.createPopupHTML(busId, location, busInfo));
    }
  }

  private createPopupHTML(busId: string, location: BusLocation, busInfo?: BusInfo): string {
    const busNumber = busInfo?.busNumber || `Bus ${busId.substring(0, 8)}`;
    const routeName = busInfo?.routeName || 'Unknown Route';
    const driverName = busInfo?.driverName || 'Unknown Driver';
    
    return `
      <div class="p-2">
        <h3 class="font-bold text-lg">🚌 ${busNumber}</h3>
        <p class="text-sm text-gray-600">Route: ${routeName}</p>
        <p class="text-sm text-gray-600">Driver: ${driverName}</p>
        <p class="text-xs text-gray-500">
          Last Update: ${formatTime(location.timestamp)}
        </p>
        ${location.speed ? `<p class="text-xs text-green-600">Speed: ${location.speed} km/h</p>` : ''}
      </div>
    `;
  }

  removeBusMarker(busId: string): void {
    if (this.markers[busId]) {
      try {
        this.markers[busId].remove();
        delete this.markers[busId];
        logger.info('🗑️ Removed marker for bus', 'component', { data: busId });
      } catch (error) {
        logger.warn('Warning', 'component', { data: `⚠️ Error removing marker ${busId}:`, error });
        // Force delete even if remove fails
        delete this.markers[busId];
      }
    }
  }

  /**
   * Cleanup all markers
   */
  cleanupMarkers(): void {
    const markerIds = Object.keys(this.markers);
    markerIds.forEach(busId => {
      this.removeBusMarker(busId);
    });
    this.markers = {};
    
    // Cleanup cluster markers
    this.clearClusters();
    
    logger.info('🧹 All markers cleaned up', 'component');
  }

  centerOnBuses(locations: BusLocation[]): void {
    if (!this.map) {
      logger.info('🗺️ Map not initialized yet', 'component');
      return;
    }

    logger.info('🗺️ Centering map on buses', 'component', { data: `${locations.length} buses` });

    if (locations.length === 0) {
      logger.info('🗺️ No bus locations available', 'component');
      return;
    }

    if (locations.length === 1) {
      // Single bus - center on it
      const location = locations[0];
      logger.info('🗺️ Centering on single bus', 'component', { data: `[${location.longitude}, ${location.latitude}]` });
      this.map.flyTo({
        center: [location.longitude, location.latitude],
        zoom: 14,
        duration: 1000,
      });
    } else if (locations.length > 1) {
      // Multiple buses - fit all in view
      const bounds = new maplibregl.LngLatBounds();
      locations.forEach((location) => {
        bounds.extend([location.longitude, location.latitude]);
      });

      logger.info('🗺️ Fitting buses in view', 'component', { data: `${locations.length} buses` });
      this.map.fitBounds(bounds, {
        padding: 50,
        duration: 1000,
      });
    }
  }

  destroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.isInitializedFlag = false;
      this.markers = {};
      logger.info('🗺️ MapService destroyed', 'component');
    }
  }

  isInitialized(): boolean {
    return this.isInitializedFlag && this.map !== null;
  }

  // Helper method to check if map is ready for operations
  isMapReady(): boolean {
    return this.map !== null && this.map.isStyleLoaded() === true;
  }

  /**
   * Get current map instance
   */
  getMap(): maplibregl.Map | null {
    return this.map;
  }

  /**
   * Get all current markers
   */
  getMarkers(): { [busId: string]: maplibregl.Marker } {
    return { ...this.markers };
  }

  /**
   * Check if marker exists for bus
   */
  hasMarker(busId: string): boolean {
    return busId in this.markers;
  }
}
