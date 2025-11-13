import express from 'express';
// CRITICAL FIX: Use OptimizedLocationService instead of legacy locationService
import { optimizedLocationService } from '../services/OptimizedLocationService';
import { BusDatabaseService } from '../services/database/BusDatabaseService';
import { parsePostGISPoint } from '../utils/postgisHelpers';

const router = express.Router();

// Get all active buses with optional filtering
router.get('/', async (req, res) => {
  try {
    const { driver_id } = req.query;

    if (driver_id) {
      // Filter buses by driver_id
      const buses = await BusDatabaseService.getAllBuses();
      const filteredBuses = buses.filter(
        (bus) =>
          bus.driver_id === driver_id
      );

      res.json({
        success: true,
        data: filteredBuses,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Get all buses
      const buses = await BusDatabaseService.getAllBuses();
      res.json({
        success: true,
        data: buses,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    const { logger } = await import('../utils/logger');
    logger.error('Error fetching buses', 'buses-route', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch buses',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get buses within viewport (spatial query) - MUST come before /:busId
router.get('/viewport', async (req, res) => {
  try {
    const { minLng, minLat, maxLng, maxLat } = req.query;

    if (!minLng || !minLat || !maxLng || !maxLat) {
      return res.status(400).json({
        success: false,
        error: 'Missing viewport parameters',
        message: 'minLng, minLat, maxLng, maxLat are required',
      });
    }

    const viewport = {
      minLng: parseFloat(minLng as string),
      minLat: parseFloat(minLat as string),
      maxLng: parseFloat(maxLng as string),
      maxLat: parseFloat(maxLat as string),
    };

    // Get current locations and filter by viewport
    const currentLocations = await optimizedLocationService.getCurrentBusLocations();
    const locationsInViewport = currentLocations.filter((location: { location: string; bus_id: string }) => {
      // Parse PostGIS Point format: "POINT(longitude latitude)"
      const pointMatch = location.location.match(/POINT\(([^)]+)\)/);
      if (!pointMatch) return false;

      const [longitude, latitude] = pointMatch[1].split(' ').map(Number);
      return (
        latitude >= viewport.minLat &&
        latitude <= viewport.maxLat &&
        longitude >= viewport.minLng &&
        longitude <= viewport.maxLng
      );
    });

    // Get bus info for buses in viewport
    const busIds = [...new Set(locationsInViewport.map((loc: { bus_id: string }) => loc.bus_id))];
    const busesInViewport: any[] = [];

    for (const busId of busIds) {
      // CRITICAL FIX: Use OptimizedLocationService.getBusInfo instead of legacy service
      const busInfo = await optimizedLocationService.getBusInfo(busId as string);
      if (busInfo) {
        const location = locationsInViewport.find(
          (loc: { bus_id: string }) => loc.bus_id === busId
        );
        const coords = location ? parsePostGISPoint(location.location) : null;
        busesInViewport.push({
          ...busInfo,
          currentLocation: coords && location
            ? {
                latitude: coords.latitude,
                longitude: coords.longitude,
                timestamp: location.timestamp || new Date().toISOString(),
                speed: location.speed || undefined,
                heading: location.heading || undefined,
              }
            : null,
        });
      }
    }

    return res.json({
      success: true,
      data: busesInViewport,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const { logger } = await import('../utils/logger');
    logger.error('Error fetching buses in viewport', 'buses-route', { error });
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch buses in viewport',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get bus clusters within viewport - MUST come before /:busId
router.get('/clusters', async (req, res) => {
  try {
    const { minLng, minLat, maxLng, maxLat, zoom } = req.query;

    if (!minLng || !minLat || !maxLng || !maxLat) {
      return res.status(400).json({
        success: false,
        error: 'Missing viewport parameters',
        message: 'minLng, minLat, maxLng, maxLat are required',
      });
    }

    const viewport = {
      minLng: parseFloat(minLng as string),
      minLat: parseFloat(minLat as string),
      maxLng: parseFloat(maxLng as string),
      maxLat: parseFloat(maxLat as string),
      zoom: zoom ? parseInt(zoom as string) : 12,
    };

    // Get current locations and filter by viewport
    const currentLocations = await optimizedLocationService.getCurrentBusLocations();
    const locationsInViewport = currentLocations.filter((location: { location: string; bus_id: string }) => {
      // Parse PostGIS Point format: "POINT(longitude latitude)"
      const pointMatch = location.location.match(/POINT\(([^)]+)\)/);
      if (!pointMatch) return false;

      const [longitude, latitude] = pointMatch[1].split(' ').map(Number);
      return (
        latitude >= viewport.minLat &&
        latitude <= viewport.maxLat &&
        longitude >= viewport.minLng &&
        longitude <= viewport.maxLng
      );
    });

    // Simple clustering algorithm
    const clusterRadius = Math.max(
      0.001,
      0.01 / Math.pow(2, viewport.zoom - 10)
    );
    const clusters: any[] = [];
    const processedLocations = new Set<string>();

    locationsInViewport.forEach((location: { id: string; location: string }) => {
      if (processedLocations.has(location.id)) return;

      const pointMatch = location.location.match(/POINT\(([^)]+)\)/);
      if (!pointMatch) return;

      const [longitude, latitude] = pointMatch[1].split(' ').map(Number);

      const cluster = {
        id: `cluster_${clusters.length}`,
        center: {
          latitude,
          longitude,
        },
        buses: [location],
        count: 1,
      };

      // Find nearby buses
      locationsInViewport.forEach((otherLocation: { id: string; location: string }) => {
        if (
          otherLocation.id === location.id ||
          processedLocations.has(otherLocation.id)
        )
          return;

        const otherPointMatch =
          otherLocation.location.match(/POINT\(([^)]+)\)/);
        if (!otherPointMatch) return;

        const [otherLongitude, otherLatitude] = otherPointMatch[1]
          .split(' ')
          .map(Number);

        const distance = Math.sqrt(
          Math.pow(latitude - otherLatitude, 2) +
            Math.pow(longitude - otherLongitude, 2)
        );

        if (distance <= clusterRadius) {
          cluster.buses.push(otherLocation);
          cluster.count++;
          processedLocations.add(otherLocation.id);
        }
      });

      clusters.push(cluster);
      processedLocations.add(location.id);
    });

    return res.json({
      success: true,
      data: clusters,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const { logger } = await import('../utils/logger');
    logger.error('Error fetching bus clusters', 'buses-route', { error });
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch bus clusters',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get specific bus information
router.get('/:busId', async (req, res) => {
  try {
    const { busId } = req.params;
    // CRITICAL FIX: Use OptimizedLocationService.getBusInfo instead of legacy service
    const busInfo = await optimizedLocationService.getBusInfo(busId);

    if (!busInfo) {
      return res.status(404).json({
        success: false,
        error: 'Bus not found',
        message: `Bus with ID ${busId} not found`,
      });
    }

    return res.json({
      success: true,
      data: busInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const { logger } = await import('../utils/logger');
    logger.error('Error fetching bus info', 'buses-route', { error });
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch bus information',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
