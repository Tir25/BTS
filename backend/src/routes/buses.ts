import express from 'express';
import { authenticateUser, requireAdminOrStudent } from '../middleware/auth';
import { getBusInfo, getAllBuses } from '../services/locationService';
import { validateUUIDWithError } from '../utils/validation';
import { sendNotFoundError, sendValidationError, sendSuccessResponse, sendInternalServerError } from '../utils/responseHelpers';

const router = express.Router();

// Get all active buses (accessible to students and admins)
router.get('/', authenticateUser, requireAdminOrStudent, async (_req, res) => {
  try {
    const buses = await getAllBuses();
    return sendSuccessResponse(res, buses);
  } catch (error) {
    console.error('❌ Error fetching buses:', error);
    return sendInternalServerError(res, error instanceof Error ? error : undefined);
  }
});

// Get specific bus information (accessible to students and admins)
router.get('/:busId', authenticateUser, requireAdminOrStudent, async (req, res) => {
  try {
    const { busId } = req.params;
    
    // Validate bus ID
    const validationError = validateUUIDWithError(busId, 'Bus ID');
    if (validationError) {
      return sendValidationError(res, 'busId', validationError);
    }
    
    const busInfo = await getBusInfo(busId);

    if (!busInfo) {
      return sendNotFoundError(res, 'Bus', busId);
    }

    return sendSuccessResponse(res, busInfo);
  } catch (error) {
    console.error('❌ Error fetching bus info:', error);
    return sendInternalServerError(res, error instanceof Error ? error : undefined);
  }
});

export default router;
