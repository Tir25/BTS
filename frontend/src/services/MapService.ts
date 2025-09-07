import { Map, Marker, Popup, NavigationControl, LngLatBounds, StyleSpecification } from 'maplibre-gl';
import { IMapService, IMapConfiguration } from './interfaces/IMapService';
import { BusLocation } from './interfaces/IWebSocketService';
import { Route } from '../types';

export class MapService implements IMapService {
  private map: Map | null = null;
  private markers: { [busId: string]: Marker } = {};
  private isInitializedFlag = false;

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

  async initialize(container: HTMLDivElement): Promise<void> {
    if (this.isInitializedFlag || !container) {
      return;
    }

    console.log('🗺️ Initializing MapService...');

    this.map = new Map({
      container,
      style: this.defaultConfig.style as StyleSpecification,
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
    this.map.addControl(new NavigationControl(), 'top-right');

    // Handle map load event
    this.map.once('load', () => {
      console.log('🗺️ Map loaded successfully');
      this.isInitializedFlag = true;
    });

    // Handle map errors
    this.map.on('error', e => {
      console.error('❌ Map error:', e);
    });
  }

  addRoute(routeId: string, routeData: Route): void {
    if (!this.map || !this.map.isStyleLoaded()) {
      console.warn('🗺️ Map not ready for route addition');
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

      console.log(`🗺️ Added route ${routeData.name} to map`);
    } catch (error) {
      console.error(`❌ Error adding route ${routeId}:`, error);
    }
  }

  updateBusMarker(busId: string, location: BusLocation): void {
    if (!this.map) return;

    const { latitude, longitude } = location;

    // Create or update marker
    if (!this.markers[busId]) {
      this.createBusMarker(busId, location);
    } else {
      // Update existing marker position smoothly
      this.markers[busId].setLngLat([longitude, latitude]);
      this.updateMarkerPopup(busId, location);
    }
  }

  private createBusMarker(busId: string, location: BusLocation): void {
    if (!this.map) return;

    const { latitude, longitude } = location;

    // Create new marker with enhanced styling
    const el = document.createElement('div');
    el.className = 'bus-marker';
    el.innerHTML = `
      <div class="bus-marker-pin">
        <div class="bus-marker-icon">🚌</div>
        <div class="bus-marker-pulse"></div>
      </div>
      <div class="bus-marker-content">
        <div class="bus-number">Bus ${busId}</div>
        <div class="bus-speed">${location.speed ? `${location.speed} km/h` : 'N/A'}</div>
        <div class="bus-eta">${location.eta ? `ETA: ${location.eta.estimated_arrival_minutes} min` : 'ETA: N/A'}</div>
      </div>
    `;

    const marker = new Marker({
      element: el,
      anchor: 'center',
    })
      .setLngLat([longitude, latitude])
      .addTo(this.map);

    // Add enhanced popup
    const popup = new Popup({
      offset: 25,
      className: 'bus-popup-container',
    }).setHTML(this.createPopupHTML(busId, location));

    marker.setPopup(popup);
    this.markers[busId] = marker;

    console.log(
      `📍 Created marker for bus ${busId} at [${longitude.toFixed(6)}, ${latitude.toFixed(6)}]`
    );
  }

  private updateMarkerPopup(busId: string, location: BusLocation): void {
    const marker = this.markers[busId];
    if (!marker) return;

    const popup = marker.getPopup();
    if (popup) {
      popup.setHTML(this.createPopupHTML(busId, location));
    }
  }

  private createPopupHTML(busId: string, location: BusLocation): string {
    return `
      <div class="bus-popup">
        <h3>🚌 Bus ${busId}</h3>
        <p><strong>Speed:</strong> ${location.speed ? `${location.speed} km/h` : 'N/A'}</p>
        <p><strong>ETA:</strong> ${location.eta ? `${location.eta.estimated_arrival_minutes} minutes` : 'N/A'}</p>
        <p><strong>Status:</strong> <span style="color: #059669;">Active</span></p>
        <p><strong>Last Update:</strong> ${new Date(location.timestamp).toLocaleTimeString()}</p>
        <p><strong>Coordinates:</strong> ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}</p>
      </div>
    `;
  }

  removeBusMarker(busId: string): void {
    if (this.markers[busId]) {
      this.markers[busId].remove();
      delete this.markers[busId];
      console.log(`🗑️ Removed marker for bus ${busId}`);
    }
  }

  centerOnBuses(locations: BusLocation[]): void {
    if (!this.map) {
      console.log('🗺️ Map not initialized yet');
      return;
    }

    console.log(`🗺️ Centering map on ${locations.length} buses`);

    if (locations.length === 0) {
      console.log('🗺️ No bus locations available');
      return;
    }

    if (locations.length === 1) {
      // Single bus - center on it
      const location = locations[0];
      console.log(
        `🗺️ Centering on single bus: [${location.longitude}, ${location.latitude}]`
      );
      this.map.flyTo({
        center: [location.longitude, location.latitude],
        zoom: 14,
        duration: 1000,
      });
    } else if (locations.length > 1) {
      // Multiple buses - fit all in view
      const bounds = new LngLatBounds();
      locations.forEach(location => {
        bounds.extend([location.longitude, location.latitude]);
      });

      console.log(`🗺️ Fitting ${locations.length} buses in view`);
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
      console.log('🗺️ MapService destroyed');
    }
  }

  isInitialized(): boolean {
    return this.isInitializedFlag && this.map !== null;
  }

  // Helper method to check if map is ready for operations
  isMapReady(): boolean {
    return this.map !== null && this.map.isStyleLoaded() === true;
  }
}
