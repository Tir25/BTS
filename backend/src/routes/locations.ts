import express from 'express';
import { authenticateUser } from '../middleware/auth';
// CRITICAL FIX: Use OptimizedLocationService instead of legacy locationService
import { optimizedLocationService } from '../services/OptimizedLocationService';
import { parsePostGISPoint } from '../utils/postgisHelpers';
import { logger } from '../utils/logger';

const router = express.Router();

// Apply authentication middleware only to routes that require it
// Students can view current locations without authentication

// Get current bus locations
router.get('/current', async (req, res) => {
  try {
    const locations = await optimizedLocationService.getCurrentBusLocations();
    
    // Convert PostGIS POINT format to frontend-friendly format with lat/lng
    const formattedLocations = locations
      .map((location) => {
        const coords = parsePostGISPoint(location.location);
        if (!coords) {
          logger.warn('Failed to parse location coordinates', 'locations-route', { 
            busId: location.bus_id,
            locationString: location.location 
          });
          return null;
        }

        return {
          busId: location.bus_id,
          driverId: location.driver_id || '',
          latitude: coords.latitude,
          longitude: coords.longitude,
          timestamp: location.timestamp || new Date().toISOString(),
          speed: location.speed,
          heading: location.heading,
        };
      })
      .filter((loc): loc is NonNullable<typeof loc> => loc !== null);
    
    res.json({
      success: true,
      data: formattedLocations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching current locations', 'locations-route', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch current locations',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get live locations within viewport (spatial query) - MUST come before /history/:busId
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

    const locations = await optimizedLocationService.getCurrentBusLocations();

    // Convert to frontend-friendly format and filter by viewport
    const formattedLocations = locations
      .map((location) => {
        const coords = parsePostGISPoint(location.location);
        if (!coords) {
          logger.warn('Failed to parse location coordinates in viewport', 'locations-route', { 
            busId: location.bus_id,
            locationString: location.location 
          });
          return null;
        }

        // Filter by viewport
        if (
          coords.latitude < viewport.minLat ||
          coords.latitude > viewport.maxLat ||
          coords.longitude < viewport.minLng ||
          coords.longitude > viewport.maxLng
        ) {
          return null;
        }

        return {
          busId: location.bus_id,
          driverId: location.driver_id || '',
          latitude: coords.latitude,
          longitude: coords.longitude,
          timestamp: location.timestamp,
          speed: location.speed,
          heading: location.heading,
        };
      })
      .filter((loc): loc is NonNullable<typeof loc> => loc !== null);

    return res.json({
      success: true,
      data: formattedLocations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching locations in viewport', 'locations-route', { error });
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch locations in viewport',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get bus location history (requires authentication)
router.get('/history/:busId', authenticateUser, async (req, res) => {
  try {
    const { busId } = req.params;
    const { startTime, endTime } = req.query;

    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        message: 'startTime and endTime are required',
      });
    }

    // CRITICAL FIX: Use OptimizedLocationService.getBusLocationHistory instead of legacy service
    const locations = await optimizedLocationService.getBusLocationHistory(
      busId,
      startTime as string,
      endTime as string
    );

    res.json({
      success: true,
      data: locations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching location history', 'locations-route', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch location history',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Update live location (requires authentication)
router.post('/update', authenticateUser, async (req, res) => {
  try {
    const { busId, driverId, latitude, longitude, speed, heading } = req.body;

    // Validate required fields
    if (
      !busId ||
      !driverId ||
      latitude === undefined ||
      longitude === undefined
    ) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'busId, driverId, latitude, and longitude are required',
      });
    }

    // Validate coordinates
    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates',
        message:
          'Latitude must be between -90 and 90, longitude between -180 and 180',
      });
    }

    const locationData = {
      driverId,
      busId,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timestamp: new Date().toISOString(),
      speed: speed ? parseFloat(speed) : undefined,
      heading: heading ? parseFloat(heading) : undefined,
    };

    // CRITICAL FIX: Use OptimizedLocationService instead of deprecated locationService
    const savedLocation = await optimizedLocationService.saveLocationUpdate(locationData);

    if (!savedLocation) {
      return res.status(500).json({
        success: false,
        error: 'Failed to save location',
        message: 'Database error occurred',
      });
    }

    res.json({
      success: true,
      data: savedLocation,
      message: 'Location updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error updating location', 'locations-route', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to update location',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
