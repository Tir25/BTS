import express from 'express';
import { authenticateUser } from '../middleware/auth';
import { 
  getCurrentBusLocations, 
  getBusLocationHistory, 
  saveLocationUpdate 
} from '../services/locationService';

const router = express.Router();

// Apply authentication middleware to all location routes
router.use(authenticateUser);

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

// Get bus location history
router.get('/history/:busId', async (req, res) => {
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

    res.json({
      success: true,
      data: locations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error fetching location history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch location history',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Update live location
router.post('/update', async (req, res) => {
  try {
    const { busId, driverId, latitude, longitude, speed, heading } = req.body;

    // Validate required fields
    if (!busId || !driverId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'busId, driverId, latitude, and longitude are required',
      });
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates',
        message: 'Latitude must be between -90 and 90, longitude between -180 and 180',
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

    res.json({
      success: true,
      data: savedLocation,
      message: 'Location updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error updating location:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update location',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
