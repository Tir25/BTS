import express from 'express';
import { authenticateUser } from '../middleware/auth';
import {
  getCurrentBusLocations,
  getBusLocationHistory,
  saveLocationUpdate,
} from '../services/locationService';

const router = express.Router();

// Apply authentication middleware only to routes that require it
// Students can view current locations without authentication

// Get current bus locations
router.get('/current', async (req, res) => {
  try {
    const locations = await getCurrentBusLocations();
    res.json({
      success: true,
      data: locations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error fetching current locations:', error);
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

    const locations = await getCurrentBusLocations();

    // Filter locations within viewport
    const locationsInViewport = locations.filter((location) => {
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

    // Convert to frontend-friendly format
    const formattedLocations = locationsInViewport.map((location) => {
      const pointMatch = location.location.match(/POINT\(([^)]+)\)/);
      const [longitude, latitude] = pointMatch
        ? pointMatch[1].split(' ').map(Number)
        : [0, 0];

      return {
        busId: location.bus_id,
        driverId: location.driver_id,
        latitude,
        longitude,
        timestamp: location.timestamp,
        speed: location.speed,
        heading: location.heading,
      };
    });

    return res.json({
      success: true,
      data: formattedLocations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error fetching locations in viewport:', error);
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

    const locations = await getBusLocationHistory(
      busId,
      startTime as string,
      endTime as string
    );

    return res.json({
      success: true,
      data: locations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error fetching location history:', error);
    return res.status(500).json({
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

    const savedLocation = await saveLocationUpdate(locationData);

    if (!savedLocation) {
      return res.status(500).json({
        success: false,
        error: 'Failed to save location',
        message: 'Database error occurred',
      });
    }

    return res.json({
      success: true,
      data: savedLocation,
      message: 'Location updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error updating location:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update location',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
