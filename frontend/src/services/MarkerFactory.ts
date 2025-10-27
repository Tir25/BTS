/**
 * Unified Marker Factory - Production-Grade Marker Architecture
 * 
 * This factory provides a unified interface for creating and managing
 * all marker types (buses, drivers, stops, alerts) in a consistent way.
 * 
 * Architecture Benefits:
 * - Single source of truth for marker logic
 * - Consistent behavior across marker types
 * - Easy to extend for new marker types
 * - Centralized lifecycle management
 */

import maplibregl from 'maplibre-gl';
import { BusLocation } from '../types';
import { logger } from '../utils/logger';

export enum MarkerType {
  BUS = 'bus',
  DRIVER = 'driver',
  STOP = 'stop',
  ALERT = 'alert',
  CLUSTER = 'cluster',
}

export interface MarkerConfig {
  type: MarkerType;
  id: string;
  location: {
    latitude: number;
    longitude: number;
  };
  // Optional marker-specific data
  data?: any;
  // Visual customization
  icon?: string;
  color?: string;
  size?: number;
  // Interaction callbacks
  onClick?: () => void;
  onHover?: () => void;
  // Popup content
  popupContent?: string | HTMLElement;
  // Animation
  animate?: boolean;
  pulse?: boolean;
}

export interface MarkerRegistry {
  [markerId: string]: {
    marker: maplibregl.Marker;
    type: MarkerType;
    config: MarkerConfig;
  };
}

export class MarkerFactory {
  private map: maplibregl.Map | null = null;
  private registry: MarkerRegistry = {};
  private popups: { [markerId: string]: maplibregl.Popup } = {};

  /**
   * Initialize the factory with a map instance
   */
  initialize(map: maplibregl.Map): void {
    this.map = map;
    logger.info('🎯 MarkerFactory initialized', 'component');
  }

  /**
   * Create a marker using the unified factory pattern
   */
  createMarker(config: MarkerConfig): maplibregl.Marker | null {
    if (!this.map || !this.map.isStyleLoaded()) {
      logger.warn('⚠️ Map not ready for marker creation', 'component');
      return null;
    }

    // Check if marker already exists
    if (this.registry[config.id]) {
      logger.debug('📍 Marker already exists, updating instead', 'component', { id: config.id });
      this.updateMarker(config);
      return this.registry[config.id].marker;
    }

    try {
      // Create marker element based on type
      const element = this.createMarkerElement(config);
      
      // Create MapLibre marker
      const marker = new maplibregl.Marker({
        element,
        anchor: 'center',
      })
        .setLngLat([config.location.longitude, config.location.latitude])
        .addTo(this.map);

      // Add popup if provided
      if (config.popupContent) {
        const popup = new maplibregl.Popup({
          offset: 25,
          closeButton: true,
          closeOnClick: false,
          className: `${config.type}-popup-container`,
        });

        if (typeof config.popupContent === 'string') {
          popup.setHTML(config.popupContent);
        } else {
          popup.setDOMContent(config.popupContent);
        }

        marker.setPopup(popup);
        this.popups[config.id] = popup;
      }

      // Add click handler
      if (config.onClick) {
        const element = marker.getElement();
        if (element) {
          element.addEventListener('click', config.onClick);
        }
      }

      // Register marker
      this.registry[config.id] = {
        marker,
        type: config.type,
        config,
      };

      logger.debug('✅ Marker created', 'component', { 
        id: config.id, 
        type: config.type 
      });

      return marker;
    } catch (error) {
      logger.error('❌ Error creating marker', 'component', { 
        error, 
        config 
      });
      return null;
    }
  }

  /**
   * Update an existing marker
   */
  updateMarker(config: MarkerConfig): void {
    const registered = this.registry[config.id];
    if (!registered) {
      // Marker doesn't exist, create it
      this.createMarker(config);
      return;
    }

    try {
      // Update position
      registered.marker.setLngLat([
        config.location.longitude,
        config.location.latitude,
      ]);

      // Update popup content if changed
      if (config.popupContent && this.popups[config.id]) {
        const popup = this.popups[config.id];
        if (typeof config.popupContent === 'string') {
          popup.setHTML(config.popupContent);
        } else {
          popup.setDOMContent(config.popupContent);
        }
      }

      // Update config
      registered.config = { ...registered.config, ...config };

      logger.debug('✅ Marker updated', 'component', { id: config.id });
    } catch (error) {
      logger.error('❌ Error updating marker', 'component', { error, id: config.id });
    }
  }

  /**
   * Remove a marker
   */
  removeMarker(id: string): void {
    const registered = this.registry[id];
    if (!registered) return;

    try {
      registered.marker.remove();
      if (this.popups[id]) {
        this.popups[id].remove();
        delete this.popups[id];
      }
      delete this.registry[id];
      logger.debug('✅ Marker removed', 'component', { id });
    } catch (error) {
      logger.error('❌ Error removing marker', 'component', { error, id });
    }
  }

  /**
   * Get a marker by ID
   */
  getMarker(id: string): maplibregl.Marker | null {
    return this.registry[id]?.marker || null;
  }

  /**
   * Get all markers of a specific type
   */
  getMarkersByType(type: MarkerType): maplibregl.Marker[] {
    return Object.values(this.registry)
      .filter(reg => reg.type === type)
      .map(reg => reg.marker);
  }

  /**
   * Clear all markers
   */
  clearAll(): void {
    Object.keys(this.registry).forEach(id => this.removeMarker(id));
    logger.info('🗑️ All markers cleared', 'component');
  }

  /**
   * Clear markers by type
   */
  clearByType(type: MarkerType): void {
    Object.keys(this.registry)
      .filter(id => this.registry[id].type === type)
      .forEach(id => this.removeMarker(id));
    logger.info(`🗑️ Cleared ${type} markers`, 'component');
  }

  /**
   * Create marker element based on type
   */
  private createMarkerElement(config: MarkerConfig): HTMLElement {
    const el = document.createElement('div');
    el.className = `marker-${config.type}`;
    el.setAttribute('data-marker-id', config.id);
    el.setAttribute('data-marker-type', config.type);

    // Type-specific element creation
    switch (config.type) {
      case MarkerType.BUS:
        return this.createBusMarkerElement(el, config);
      case MarkerType.DRIVER:
        return this.createDriverMarkerElement(el, config);
      case MarkerType.CLUSTER:
        return this.createClusterMarkerElement(el, config);
      case MarkerType.STOP:
        return this.createStopMarkerElement(el, config);
      case MarkerType.ALERT:
        return this.createAlertMarkerElement(el, config);
      default:
        return this.createDefaultMarkerElement(el, config);
    }
  }

  /**
   * Create bus marker element
   */
  private createBusMarkerElement(el: HTMLElement, config: MarkerConfig): HTMLElement {
    el.className = 'bus-marker';
    el.innerHTML = `
      <div class="bus-marker-pin">
        <div class="bus-marker-icon">🚌</div>
        ${config.pulse ? '<div class="bus-marker-pulse"></div>' : ''}
      </div>
    `;
    el.style.cursor = 'pointer';
    return el;
  }

  /**
   * Create driver marker element
   */
  private createDriverMarkerElement(el: HTMLElement, config: MarkerConfig): HTMLElement {
    el.className = 'driver-marker';
    const speed = config.data?.speed ? `${Math.round(config.data.speed)} km/h` : 'N/A';
    const accuracy = config.data?.accuracy ? `±${Math.round(config.data.accuracy)}m` : '?';
    
    el.innerHTML = `
      <div class="driver-marker-pin">
        <div class="driver-marker-icon">🚗</div>
        ${config.pulse ? '<div class="driver-marker-pulse active"></div>' : ''}
        ${config.pulse ? '<div class="driver-marker-ring active"></div>' : ''}
      </div>
      <div class="driver-marker-content">
        <div class="driver-label">${config.data?.label || 'You'}</div>
        <div class="driver-speed">${speed}</div>
        <div class="driver-accuracy">${accuracy}</div>
      </div>
    `;
    el.style.cursor = 'pointer';
    return el;
  }

  /**
   * Create cluster marker element
   */
  private createClusterMarkerElement(el: HTMLElement, config: MarkerConfig): HTMLElement {
    el.className = 'bus-cluster-marker';
    const count = config.data?.count || 0;
    const size = Math.min(20 + count * 3, 60);
    const color = count > 10 ? '#ef4444' : count > 5 ? '#f59e0b' : '#10b981';
    
    el.innerHTML = `
      <div class="bus-cluster-pin" style="width: ${size}px; height: ${size}px; background: ${color};">
        <div class="bus-cluster-icon">🚌</div>
        <div class="bus-cluster-pulse"></div>
      </div>
      <div class="bus-cluster-count">${count}</div>
    `;
    el.style.cursor = 'pointer';
    
    // Add click handler for expand functionality
    if (config.onClick) {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        config.onClick?.();
      });
    }
    
    return el;
  }

  /**
   * Create stop marker element
   */
  private createStopMarkerElement(el: HTMLElement, config: MarkerConfig): HTMLElement {
    el.className = 'stop-marker';
    el.innerHTML = `
      <div class="stop-marker-pin">
        <div class="stop-marker-icon">📍</div>
      </div>
    `;
    el.style.cursor = 'pointer';
    return el;
  }

  /**
   * Create alert marker element
   */
  private createAlertMarkerElement(el: HTMLElement, config: MarkerConfig): HTMLElement {
    el.className = 'alert-marker';
    el.innerHTML = `
      <div class="alert-marker-pin">
        <div class="alert-marker-icon">⚠️</div>
        <div class="alert-marker-pulse"></div>
      </div>
    `;
    el.style.cursor = 'pointer';
    return el;
  }

  /**
   * Create default marker element
   */
  private createDefaultMarkerElement(el: HTMLElement, config: MarkerConfig): HTMLElement {
    el.innerHTML = `
      <div class="default-marker">
        ${config.icon || '📍'}
      </div>
    `;
    el.style.cursor = 'pointer';
    return el;
  }

  /**
   * Destroy the factory and clean up all markers
   */
  destroy(): void {
    this.clearAll();
    this.map = null;
    logger.info('🗑️ MarkerFactory destroyed', 'component');
  }
}

// Singleton instance
export const markerFactory = new MarkerFactory();

