import { supabaseAdmin } from '../config/supabase';

// File type validation
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

// File size limits (in bytes)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  fileName?: string;
  filePath?: string; // Add file path for private bucket access
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export interface SignedUrlResult {
  success: boolean;
  url?: string;
  error?: string;
  expiresIn?: number;
}

export class StorageService {
  // Validate file type and size
  static validateFile(
    file: any,
    allowedTypes: string[],
    maxSize: number
  ): FileValidationResult {
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

  // Generate public URL for file
  private static generatePublicUrl(filePath: string): string {
    const supabaseUrl = process.env.SUPABASE_URL;
    const bucketName = 'bus-tracking-media';
    return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`;
  }

  // Convert file path to public URL if needed
  static convertToPublicUrl(filePathOrUrl: string): string {
    if (!filePathOrUrl) return '';

    // If it's already a full URL, return as is
    if (filePathOrUrl.startsWith('http')) {
      return filePathOrUrl;
    }

    // If it's a file path, convert to public URL
    if (filePathOrUrl.includes('/')) {
      return this.generatePublicUrl(filePathOrUrl);
    }

    return filePathOrUrl;
  }

  // Upload image file
  static async uploadImage(
    file: any,
    folder: string,
    fileName?: string
  ): Promise<UploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(
        file,
        ALLOWED_IMAGE_TYPES,
        MAX_IMAGE_SIZE
      );
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      // Generate unique filename with timestamp to avoid conflicts
      const timestamp = Date.now();
      const fileExtension = file.originalname.split('.').pop();
      const baseFileName = fileName
        ? fileName.replace(/\.[^/.]+$/, '')
        : `${folder}_${timestamp}`;
      const uniqueFileName = `${baseFileName}_${timestamp}.${fileExtension}`;
      const filePath = `${folder}/${uniqueFileName}`;

      // Upload to Supabase Storage with upsert to handle conflicts
      const { error } = await supabaseAdmin.storage
        .from('bus-tracking-media')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
          upsert: true, // Allow overwriting existing files
        });

      if (error) {
        console.error('Storage upload error:', error);
        return {
          success: false,
          error: `Failed to upload file to storage: ${error.message}`,
        };
      }

      // Generate public URL for the uploaded file
      const publicUrl = this.generatePublicUrl(filePath);

      return {
        success: true,
        url: publicUrl, // Return public URL instead of file path
        fileName: uniqueFileName,
        filePath: filePath,
      };
    } catch (error) {
      console.error('Upload error:', error);
      return { success: false, error: 'Internal server error during upload' };
    }
  }

  // Upload document file
  static async uploadDocument(
    file: any,
    folder: string,
    fileName?: string
  ): Promise<UploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(
        file,
        ALLOWED_DOCUMENT_TYPES,
        MAX_DOCUMENT_SIZE
      );
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      // Generate unique filename with timestamp to avoid conflicts
      const timestamp = Date.now();
      const fileExtension = file.originalname.split('.').pop();
      const baseFileName = fileName
        ? fileName.replace(/\.[^/.]+$/, '')
        : `${folder}_${timestamp}`;
      const uniqueFileName = `${baseFileName}_${timestamp}.${fileExtension}`;
      const filePath = `${folder}/${uniqueFileName}`;

      // Upload to Supabase Storage with upsert to handle conflicts
      const { error } = await supabaseAdmin.storage
        .from('bus-tracking-media')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
          upsert: true, // Allow overwriting existing files
        });

      if (error) {
        console.error('Storage upload error:', error);
        return {
          success: false,
          error: `Failed to upload file to storage: ${error.message}`,
        };
      }

      // Generate public URL for the uploaded file
      const publicUrl = this.generatePublicUrl(filePath);

      return {
        success: true,
        url: publicUrl, // Return public URL instead of file path
        fileName: uniqueFileName,
        filePath: filePath,
      };
    } catch (error) {
      console.error('Upload error:', error);
      return { success: false, error: 'Internal server error during upload' };
    }
  }

  // Generate signed URL for private bucket access
  static async createSignedUrl(
    filePath: string,
    expiresIn: number = 3600
  ): Promise<SignedUrlResult> {
    try {
      const { data, error } = await supabaseAdmin.storage
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
    } catch (error) {
      console.error('Signed URL error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  // Delete file from storage
  static async deleteFile(
    filePath: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabaseAdmin.storage
        .from('bus-tracking-media')
        .remove([filePath]);

      if (error) {
        console.error('Delete file error:', error);
        return { success: false, error: 'Failed to delete file from storage' };
      }

      return { success: true };
    } catch (error) {
      console.error('Delete file error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  // Get file info
  static async getFileInfo(
    filePath: string
  ): Promise<{ success: boolean; info?: any; error?: string }> {
    try {
      const { data, error } = await supabaseAdmin.storage
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
    } catch (error) {
      console.error('Get file info error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  // List files in a folder
  static async listFiles(
    folder: string
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from('bus-tracking-media')
        .list(folder);

      if (error) {
        console.error('Storage list error:', error);
        return { success: false, error: 'Failed to list files' };
      }

      return { success: true, data };
    } catch (error) {
      console.error('List files error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  // Extract file path from URL
  static extractFilePathFromUrl(url: string): string | null {
    try {
      // If it's already a file path (not a URL), return it as is
      if (!url.startsWith('http')) {
        return url;
      }

      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const storageIndex = pathParts.findIndex(
        (part) => part === 'bus-tracking-media'
      );

      if (storageIndex === -1) {
        return null;
      }

      return pathParts.slice(storageIndex + 1).join('/');
    } catch (error) {
      console.error('Error extracting file path:', error);
      return null;
    }
  }
}

export default StorageService;
