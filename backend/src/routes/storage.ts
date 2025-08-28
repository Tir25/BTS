import express from 'express';
import multer from 'multer';
import { authenticateUser, requireAdmin } from '../middleware/auth';
import StorageService from '../services/storageService';
import pool from '../config/database';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs
    if (
      file.mimetype.startsWith('image/') ||
      file.mimetype === 'application/pdf'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
    }
  },
});

// Upload bus image
// @ts-ignore
router.post(
  '/upload/bus-image',
  authenticateUser,
  requireAdmin,
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const busId = req.body.busId;
      if (!busId) {
        return res.status(400).json({ error: 'Bus ID is required' });
      }

      // Upload image to storage
      const uploadResult = await StorageService.uploadImage(
        req.file,
        'buses',
        `bus_${busId}`
      );

      if (!uploadResult.success) {
        return res.status(400).json({ error: uploadResult.error });
      }

      // Update bus record with image URL
      const result = await pool.query(
        'UPDATE buses SET bus_image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [uploadResult.url, busId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Bus not found' });
      }

      return res.json({
        success: true,
        url: uploadResult.url,
        fileName: uploadResult.fileName,
      });
    } catch (error) {
      console.error('Upload bus image error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Upload driver profile photo
// @ts-ignore
router.post(
  '/upload/driver-photo',
  authenticateUser,
  requireAdmin,
  upload.single('photo'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No photo file provided' });
      }

      const driverId = req.body.driverId;
      if (!driverId) {
        return res.status(400).json({ error: 'Driver ID is required' });
      }

      // Upload photo to storage
      const uploadResult = await StorageService.uploadImage(
        req.file,
        'drivers',
        `driver_${driverId}`
      );

      if (!uploadResult.success) {
        return res.status(400).json({ error: uploadResult.error });
      }

      // Update driver record with photo URL
      const result = await pool.query(
        'UPDATE users SET profile_photo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND role = $3',
        [uploadResult.url, driverId, 'driver']
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Driver not found' });
      }

      return res.json({
        success: true,
        url: uploadResult.url,
        fileName: uploadResult.fileName,
      });
    } catch (error) {
      console.error('Upload driver photo error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Upload route map
// @ts-ignore
router.post(
  '/upload/route-map',
  authenticateUser,
  requireAdmin,
  upload.single('map'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No map file provided' });
      }

      const routeId = req.body.routeId;
      if (!routeId) {
        return res.status(400).json({ error: 'Route ID is required' });
      }

      // Upload map to storage
      const uploadResult = await StorageService.uploadDocument(
        req.file,
        'routes',
        `route_${routeId}`
      );

      if (!uploadResult.success) {
        return res.status(400).json({ error: uploadResult.error });
      }

      // Update route record with map URL
      const result = await pool.query(
        'UPDATE routes SET route_map_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [uploadResult.url, routeId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Route not found' });
      }

      return res.json({
        success: true,
        url: uploadResult.url,
        fileName: uploadResult.fileName,
      });
    } catch (error) {
      console.error('Upload route map error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete file
router.delete(
  '/delete/:type/:id',
  authenticateUser,
  requireAdmin,
  async (req, res) => {
    try {
      const { type, id } = req.params;
      const { fileUrl } = req.body;

      if (!fileUrl) {
        return res.status(400).json({ error: 'File URL is required' });
      }

      // Delete file from storage
      const deleteResult = await StorageService.deleteFile(fileUrl);

      if (!deleteResult.success) {
        return res.status(400).json({ error: deleteResult.error });
      }

      // Clear URL from database
      let updateQuery = '';
      let updateParams: string[] = [];

      switch (type) {
        case 'bus':
          updateQuery =
            'UPDATE buses SET bus_image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1';
          updateParams = [id];
          break;
        case 'driver':
          updateQuery =
            'UPDATE users SET profile_photo_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND role = $2';
          updateParams = [id, 'driver'];
          break;
        case 'route':
          updateQuery =
            'UPDATE routes SET route_map_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1';
          updateParams = [id];
          break;
        default:
          return res.status(400).json({ error: 'Invalid type' });
      }

      await pool.query(updateQuery, updateParams);

      return res.json({ success: true, message: 'File deleted successfully' });
    } catch (error) {
      console.error('Delete file error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get file info
router.get(
  '/info/:type/:id',
  authenticateUser,
  requireAdmin,
  async (req, res) => {
    try {
      const { type, id } = req.params;

      let query = '';
      let params: string[] = [];

      switch (type) {
        case 'bus':
          query = 'SELECT bus_image_url FROM buses WHERE id = $1';
          params = [id];
          break;
        case 'driver':
          query =
            'SELECT profile_photo_url FROM users WHERE id = $1 AND role = $2';
          params = [id, 'driver'];
          break;
        case 'route':
          query = 'SELECT route_map_url FROM routes WHERE id = $1';
          params = [id];
          break;
        default:
          return res.status(400).json({ error: 'Invalid type' });
      }

      const result = await pool.query(query, params);

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Record not found' });
      }

      const fileUrl =
        result.rows[0][`${type}_image_url`] ||
        result.rows[0][`${type}_map_url`] ||
        result.rows[0].profile_photo_url;

      if (!fileUrl) {
        return res.json({ success: true, hasFile: false });
      }

      // Get file info from storage
      const fileInfo = await StorageService.getFileInfo(fileUrl);

      return res.json({
        success: true,
        hasFile: true,
        url: fileUrl,
        info: fileInfo,
      });
    } catch (error) {
      console.error('Get file info error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// List files in a folder
router.get(
  '/list/:folder',
  authenticateUser,
  requireAdmin,
  async (req, res) => {
    try {
      const { folder } = req.params;

      const files = await StorageService.listFiles(folder);

      return res.json({
        success: true,
        files: files,
      });
    } catch (error) {
      console.error('List files error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get signed URL for private bucket access
router.get('/signed-url/:type/:id', authenticateUser, async (req, res) => {
  try {
    const { type, id } = req.params;

    let query = '';
    let params: string[] = [];

    switch (type) {
      case 'bus':
        query = 'SELECT bus_image_url FROM buses WHERE id = $1';
        params = [id];
        break;
      case 'driver':
        query =
          'SELECT profile_photo_url FROM users WHERE id = $1 AND role = $2';
        params = [id, 'driver'];
        break;
      case 'route':
        query = 'SELECT route_map_url FROM routes WHERE id = $1';
        params = [id];
        break;
      default:
        return res.status(400).json({ error: 'Invalid type' });
    }

    const result = await pool.query(query, params);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const fileUrl =
      result.rows[0][`${type}_image_url`] ||
      result.rows[0][`${type}_map_url`] ||
      result.rows[0].profile_photo_url;

    if (!fileUrl) {
      return res.status(404).json({ error: 'No file found for this record' });
    }

    // Generate signed URL for private bucket access
    const signedUrlResult = await StorageService.createSignedUrl(fileUrl, 3600); // 1 hour expiry

    if (!signedUrlResult.success) {
      return res.status(500).json({ error: signedUrlResult.error });
    }

    return res.json({
      success: true,
      signedUrl: signedUrlResult.url,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error('Get signed URL error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
