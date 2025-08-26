import express from 'express';
import { getBusInfo, getAllBuses } from '../services/locationService';

const router = express.Router();

// Get all active buses
router.get('/', async (_req, res) => {
  try {
    const buses = await getAllBuses();
    res.json({
      success: true,
      data: buses,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error fetching buses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch buses',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get specific bus information
router.get('/:busId', async (req, res) => {
  try {
    const { busId } = req.params;
    const busInfo = await getBusInfo(busId);

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
    console.error('❌ Error fetching bus info:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch bus information',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
