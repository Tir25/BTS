import React, { useMemo, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { BusInfo } from '../../types';

interface ClusterPoint {
  id: string;
  latitude: number;
  longitude: number;
  count: number;
  buses: BusInfo[];
}

interface MarkerClusteringProps {
  map: maplibregl.Map | null;
  buses: BusInfo[];
  zoom: number;
  maxZoom: number;
  clusterRadius: number;
  onClusterClick?: (cluster: ClusterPoint) => void;
  onBusClick?: (bus: BusInfo) => void;
}

const MarkerClustering = ({
  map,
  buses,
  zoom,
  maxZoom = 14,
  clusterRadius = 50,
  onClusterClick,
  onBusClick,
}: MarkerClusteringProps): {
  clusters: ClusterPoint[];
  clusterStats: {
    totalBuses: number;
    totalClusters: number;
    singleBusClusters: number;
    multiBusClusters: number;
    averageClusterSize: number;
  };
  renderClusters: () => void;
} => {
  // Calculate distance between two points
  const calculateDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371; // Earth's radius in kilometers
      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLon = (lon2 - lon1) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
          Math.cos(lat2 * (Math.PI / 180)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    []
  );

  // Convert distance to pixels based on zoom level
  const distanceToPixels = useCallback(
    (distanceKm: number, zoomLevel: number): number => {
      const earthCircumference = 40075; // km
      const pixelsPerKm = (256 * Math.pow(2, zoomLevel)) / earthCircumference;
      return distanceKm * pixelsPerKm;
    },
    []
  );

  // Cluster buses based on proximity
  const clusterBuses = useCallback(
    (buses: BusInfo[], zoomLevel: number): ClusterPoint[] => {
      if (zoomLevel >= maxZoom) {
        // At max zoom, show individual buses
        return buses.map((bus) => ({
          id: bus.busId,
          latitude: bus.currentLocation?.latitude || 0,
          longitude: bus.currentLocation?.longitude || 0,
          count: 1,
          buses: [bus],
        }));
      }

      const clusters: ClusterPoint[] = [];
      const processed = new Set<string>();

      buses.forEach((bus) => {
        if (processed.has(bus.busId)) return;

        const busLat = bus.currentLocation?.latitude || 0;
        const busLon = bus.currentLocation?.longitude || 0;

        // Find nearby buses
        const nearbyBuses = buses.filter((otherBus) => {
          if (processed.has(otherBus.busId)) return false;
          if (bus.busId === otherBus.busId) return false;

          const otherLat = otherBus.currentLocation?.latitude || 0;
          const otherLon = otherBus.currentLocation?.longitude || 0;
          const distance = calculateDistance(busLat, busLon, otherLat, otherLon);
          const pixelDistance = distanceToPixels(distance, zoomLevel);

          return pixelDistance <= clusterRadius;
        });

        // Create cluster
        const clusterBuses = [bus, ...nearbyBuses];
        const clusterLat = clusterBuses.reduce((sum, b) => sum + (b.currentLocation?.latitude || 0), 0) / clusterBuses.length;
        const clusterLon = clusterBuses.reduce((sum, b) => sum + (b.currentLocation?.longitude || 0), 0) / clusterBuses.length;

        clusters.push({
          id: `cluster_${bus.busId}`,
          latitude: clusterLat,
          longitude: clusterLon,
          count: clusterBuses.length,
          buses: clusterBuses,
        });

        // Mark buses as processed
        clusterBuses.forEach((b) => processed.add(b.busId));
      });

      return clusters;
    },
    [calculateDistance, distanceToPixels, clusterRadius, maxZoom]
  );

  // Memoized clusters
  const clusters = useMemo(() => {
    return clusterBuses(buses, zoom);
  }, [buses, zoom, clusterBuses]);

  // Create cluster marker element
  const createClusterMarker = useCallback(
    (cluster: ClusterPoint): HTMLElement => {
      const el = document.createElement('div');
      el.className = 'cluster-marker';
      
      const size = Math.min(20 + cluster.count * 3, 60);
      const color = cluster.count > 10 ? '#ef4444' : cluster.count > 5 ? '#f59e0b' : '#10b981';
      
      el.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${Math.min(size / 3, 14)}px;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        transition: transform 0.2s ease;
      `;
      
      el.textContent = cluster.count.toString();
      
      // Add hover effect
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.1)';
      });
      
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });
      
      return el;
    },
    []
  );

  // Create individual bus marker element
  const createBusMarker = useCallback(
    (bus: BusInfo): HTMLElement => {
      const el = document.createElement('div');
      el.className = 'bus-marker';
      
      el.innerHTML = `
        <div class="bus-marker-pin">
          <div class="bus-marker-icon">🚌</div>
          <div class="bus-marker-pulse"></div>
        </div>
        <div class="bus-marker-content">
          <div class="bus-number">${bus.busNumber}</div>
          <div class="bus-speed">${bus.currentLocation?.speed ? `${bus.currentLocation.speed} km/h` : 'N/A'}</div>
          <div class="bus-eta">${bus.eta ? `ETA: ${bus.eta} min` : 'ETA: N/A'}</div>
        </div>
      `;
      
      return el;
    },
    []
  );

  // Render clusters on map
  const renderClusters = useCallback(() => {
    if (!map) return;

    // Clear existing markers
    const existingMarkers = document.querySelectorAll('.cluster-marker, .bus-marker');
    existingMarkers.forEach(marker => marker.remove());

    clusters.forEach((cluster) => {
      if (cluster.count === 1) {
        // Single bus marker
        const bus = cluster.buses[0];
        const marker = new maplibregl.Marker({
          element: createBusMarker(bus),
          anchor: 'center',
        })
          .setLngLat([cluster.longitude, cluster.latitude])
          .addTo(map);

        // Add click handler
        marker.getElement().addEventListener('click', () => {
          onBusClick?.(bus);
        });
      } else {
        // Cluster marker
        const marker = new maplibregl.Marker({
          element: createClusterMarker(cluster),
          anchor: 'center',
        })
          .setLngLat([cluster.longitude, cluster.latitude])
          .addTo(map);

        // Add click handler
        marker.getElement().addEventListener('click', () => {
          onClusterClick?.(cluster);
        });
      }
    });
  }, [map, clusters, createBusMarker, createClusterMarker, onBusClick, onClusterClick]);

  // Render clusters when dependencies change
  React.useEffect(() => {
    renderClusters();
  }, [renderClusters]);

  // Get cluster statistics
  const getClusterStats = useCallback(() => {
    const totalBuses = buses.length;
    const totalClusters = clusters.length;
    const singleBusClusters = clusters.filter(c => c.count === 1).length;
    const multiBusClusters = clusters.filter(c => c.count > 1).length;
    const averageClusterSize = totalClusters > 0 ? totalBuses / totalClusters : 0;

    return {
      totalBuses,
      totalClusters,
      singleBusClusters,
      multiBusClusters,
      averageClusterSize: Math.round(averageClusterSize * 10) / 10,
    };
  }, [buses.length, clusters]);

  return {
    clusters,
    clusterStats: getClusterStats(),
    renderClusters,
  };
};

export default MarkerClustering;
