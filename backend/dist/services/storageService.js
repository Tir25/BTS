"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const supabase_1 = require("../config/supabase");
const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
];
const ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
class StorageService {
    static validateFile(file, allowedTypes, maxSize) {
        if (!file) {
            return { isValid: false, error: 'No file provided' };
        }
        if (!allowedTypes.includes(file.mimetype)) {
            return {
                isValid: false,
                error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
            };
        }
        if (file.size > maxSize) {
            return {
                isValid: false,
                error: `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`,
            };
        }
        return { isValid: true };
    }
    static generatePublicUrl(filePath) {
        const supabaseUrl = process.env.SUPABASE_URL;
        const bucketName = 'bus-tracking-media';
        return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`;
    }
    static convertToPublicUrl(filePathOrUrl) {
        if (!filePathOrUrl)
            return '';
        if (filePathOrUrl.startsWith('http')) {
            return filePathOrUrl;
        }
        if (filePathOrUrl.includes('/')) {
            return this.generatePublicUrl(filePathOrUrl);
        }
        return filePathOrUrl;
    }
    static async uploadImage(file, folder, fileName) {
        try {
            const validation = this.validateFile(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
            if (!validation.isValid) {
                return { success: false, error: validation.error };
            }
            const timestamp = Date.now();
            const fileExtension = file.originalname.split('.').pop();
            const baseFileName = fileName
                ? fileName.replace(/\.[^/.]+$/, '')
                : `${folder}_${timestamp}`;
            const uniqueFileName = `${baseFileName}_${timestamp}.${fileExtension}`;
            const filePath = `${folder}/${uniqueFileName}`;
            const { error } = await supabase_1.supabaseAdmin.storage
                .from('bus-tracking-media')
                .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                cacheControl: '3600',
                upsert: true,
            });
            if (error) {
                console.error('Storage upload error:', error);
                return {
                    success: false,
                    error: `Failed to upload file to storage: ${error.message}`,
                };
            }
            const publicUrl = this.generatePublicUrl(filePath);
            return {
                success: true,
                url: publicUrl,
                fileName: uniqueFileName,
                filePath: filePath,
            };
        }
        catch (error) {
            console.error('Upload error:', error);
            return { success: false, error: 'Internal server error during upload' };
        }
    }
    static async uploadDocument(file, folder, fileName) {
        try {
            const validation = this.validateFile(file, ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_SIZE);
            if (!validation.isValid) {
                return { success: false, error: validation.error };
            }
            const timestamp = Date.now();
            const fileExtension = file.originalname.split('.').pop();
            const baseFileName = fileName
                ? fileName.replace(/\.[^/.]+$/, '')
                : `${folder}_${timestamp}`;
            const uniqueFileName = `${baseFileName}_${timestamp}.${fileExtension}`;
            const filePath = `${folder}/${uniqueFileName}`;
            const { error } = await supabase_1.supabaseAdmin.storage
                .from('bus-tracking-media')
                .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                cacheControl: '3600',
                upsert: true,
            });
            if (error) {
                console.error('Storage upload error:', error);
                return {
                    success: false,
                    error: `Failed to upload file to storage: ${error.message}`,
                };
            }
            const publicUrl = this.generatePublicUrl(filePath);
            return {
                success: true,
                url: publicUrl,
                fileName: uniqueFileName,
                filePath: filePath,
            };
        }
        catch (error) {
            console.error('Upload error:', error);
            return { success: false, error: 'Internal server error during upload' };
        }
    }
    static async createSignedUrl(filePath, expiresIn = 3600) {
        try {
            const { data, error } = await supabase_1.supabaseAdmin.storage
                .from('bus-tracking-media')
                .createSignedUrl(filePath, expiresIn);
            if (error) {
                console.error('Signed URL error:', error);
                return { success: false, error: 'Failed to generate signed URL' };
            }
            return {
                success: true,
                url: data.signedUrl,
                expiresIn: expiresIn,
            };
        }
        catch (error) {
            console.error('Signed URL error:', error);
            return { success: false, error: 'Internal server error' };
        }
    }
    static async deleteFile(filePath) {
        try {
            const { error } = await supabase_1.supabaseAdmin.storage
                .from('bus-tracking-media')
                .remove([filePath]);
            if (error) {
                console.error('Delete file error:', error);
                return { success: false, error: 'Failed to delete file from storage' };
            }
            return { success: true };
        }
        catch (error) {
            console.error('Delete file error:', error);
            return { success: false, error: 'Internal server error' };
        }
    }
    static async getFileInfo(filePath) {
        try {
            const { data, error } = await supabase_1.supabaseAdmin.storage
                .from('bus-tracking-media')
                .list(filePath.split('/').slice(0, -1).join('/'), {
                search: filePath.split('/').pop(),
            });
            if (error) {
                console.error('Get file info error:', error);
                return { success: false, error: 'Failed to get file info' };
            }
            return {
                success: true,
                info: data,
            };
        }
        catch (error) {
            console.error('Get file info error:', error);
            return { success: false, error: 'Internal server error' };
        }
    }
    static async listFiles(folder) {
        try {
            const { data, error } = await supabase_1.supabaseAdmin.storage
                .from('bus-tracking-media')
                .list(folder);
            if (error) {
                console.error('Storage list error:', error);
                return { success: false, error: 'Failed to list files' };
            }
            return { success: true, data };
        }
        catch (error) {
            console.error('List files error:', error);
            return { success: false, error: 'Internal server error' };
        }
    }
    static extractFilePathFromUrl(url) {
        try {
            if (!url.startsWith('http')) {
                return url;
            }
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/');
            const storageIndex = pathParts.findIndex((part) => part === 'bus-tracking-media');
            if (storageIndex === -1) {
                return null;
            }
            return pathParts.slice(storageIndex + 1).join('/');
        }
        catch (error) {
            console.error('Error extracting file path:', error);
            return null;
        }
    }
}
exports.StorageService = StorageService;
exports.default = StorageService;
//# sourceMappingURL=storageService.js.map