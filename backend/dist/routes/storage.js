"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const storageService_1 = __importDefault(require("../services/storageService"));
const database_1 = __importDefault(require("../config/database"));
const router = express_1.default.Router();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') ||
            file.mimetype === 'application/pdf') {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
        }
    },
});
router.post('/upload/bus-image', auth_1.authenticateUser, auth_1.requireAdmin, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }
        const busId = req.body.busId;
        if (!busId) {
            return res.status(400).json({ error: 'Bus ID is required' });
        }
        const uploadResult = await storageService_1.default.uploadImage(req.file, 'buses', `bus_${busId}`);
        if (!uploadResult.success) {
            return res.status(400).json({ error: uploadResult.error });
        }
        const result = await database_1.default.query('UPDATE buses SET bus_image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [uploadResult.url, busId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Bus not found' });
        }
        return res.json({
            success: true,
            url: uploadResult.url,
            fileName: uploadResult.fileName,
        });
    }
    catch (error) {
        console.error('Upload bus image error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/upload/driver-photo', auth_1.authenticateUser, auth_1.requireAdmin, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No photo file provided' });
        }
        const driverId = req.body.driverId;
        if (!driverId) {
            return res.status(400).json({ error: 'Driver ID is required' });
        }
        const uploadResult = await storageService_1.default.uploadImage(req.file, 'drivers', `driver_${driverId}`);
        if (!uploadResult.success) {
            return res.status(400).json({ error: uploadResult.error });
        }
        const result = await database_1.default.query('UPDATE users SET profile_photo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND role = $3', [uploadResult.url, driverId, 'driver']);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Driver not found' });
        }
        return res.json({
            success: true,
            url: uploadResult.url,
            fileName: uploadResult.fileName,
        });
    }
    catch (error) {
        console.error('Upload driver photo error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/upload/route-map', auth_1.authenticateUser, auth_1.requireAdmin, upload.single('map'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No map file provided' });
        }
        const routeId = req.body.routeId;
        if (!routeId) {
            return res.status(400).json({ error: 'Route ID is required' });
        }
        const uploadResult = await storageService_1.default.uploadDocument(req.file, 'routes', `route_${routeId}`);
        if (!uploadResult.success) {
            return res.status(400).json({ error: uploadResult.error });
        }
        const result = await database_1.default.query('UPDATE routes SET route_map_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [uploadResult.url, routeId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Route not found' });
        }
        return res.json({
            success: true,
            url: uploadResult.url,
            fileName: uploadResult.fileName,
        });
    }
    catch (error) {
        console.error('Upload route map error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.delete('/delete/:type/:id', auth_1.authenticateUser, auth_1.requireAdmin, async (req, res) => {
    try {
        const { type, id } = req.params;
        const { fileUrl } = req.body;
        if (!fileUrl) {
            return res.status(400).json({ error: 'File URL is required' });
        }
        const deleteResult = await storageService_1.default.deleteFile(fileUrl);
        if (!deleteResult.success) {
            return res.status(400).json({ error: deleteResult.error });
        }
        let updateQuery = '';
        let updateParams = [];
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
        await database_1.default.query(updateQuery, updateParams);
        return res.json({ success: true, message: 'File deleted successfully' });
    }
    catch (error) {
        console.error('Delete file error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/info/:type/:id', auth_1.authenticateUser, auth_1.requireAdmin, async (req, res) => {
    try {
        const { type, id } = req.params;
        let query = '';
        let params = [];
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
        const result = await database_1.default.query(query, params);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        const fileUrl = result.rows[0][`${type}_image_url`] ||
            result.rows[0][`${type}_map_url`] ||
            result.rows[0].profile_photo_url;
        if (!fileUrl) {
            return res.json({ success: true, hasFile: false });
        }
        const fileInfo = await storageService_1.default.getFileInfo(fileUrl);
        return res.json({
            success: true,
            hasFile: true,
            url: fileUrl,
            info: fileInfo,
        });
    }
    catch (error) {
        console.error('Get file info error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/list/:folder', auth_1.authenticateUser, auth_1.requireAdmin, async (req, res) => {
    try {
        const { folder } = req.params;
        const files = await storageService_1.default.listFiles(folder);
        return res.json({
            success: true,
            files: files,
        });
    }
    catch (error) {
        console.error('List files error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/signed-url/:type/:id', auth_1.authenticateUser, async (req, res) => {
    try {
        const { type, id } = req.params;
        let query = '';
        let params = [];
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
        const result = await database_1.default.query(query, params);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        const fileUrl = result.rows[0][`${type}_image_url`] ||
            result.rows[0][`${type}_map_url`] ||
            result.rows[0].profile_photo_url;
        if (!fileUrl) {
            return res.status(404).json({ error: 'No file found for this record' });
        }
        const signedUrlResult = await storageService_1.default.createSignedUrl(fileUrl, 3600);
        if (!signedUrlResult.success) {
            return res.status(500).json({ error: signedUrlResult.error });
        }
        return res.json({
            success: true,
            signedUrl: signedUrlResult.url,
            expiresIn: 3600,
        });
    }
    catch (error) {
        console.error('Get signed URL error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=storage.js.map