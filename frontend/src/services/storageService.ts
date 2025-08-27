import { authService } from './authService';
import { environment } from '../config/environment';

const API_BASE_URL = environment.api.url;

export interface UploadResult {
  success: boolean;
  url?: string;
  fileName?: string;
  error?: string;
}

export interface FileInfo {
  success: boolean;
  hasFile: boolean;
  url?: string;
  info?: unknown;
  error?: string;
}

export interface SignedUrlResult {
  success: boolean;
  signedUrl?: string;
  expiresIn?: number;
  error?: string;
}

export class StorageService {
  // Helper function to make authenticated requests
  private static async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    let token = authService.getAccessToken();

    // If no token, only try to refresh if user is authenticated
    if (!token && authService.isAuthenticated()) {
      console.log(
        '🔄 No token found but user is authenticated, attempting to refresh session...'
      );
      const refreshResult = await authService.refreshSession();
      if (refreshResult.success) {
        token = authService.getAccessToken();
        console.log('✅ Session refreshed, new token obtained');
      } else {
        console.error('❌ Failed to refresh session:', refreshResult.error);
        throw new Error('Authentication required');
      }
    }

    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    // Ensure we're using the correct backend URL for production
    const baseUrl = API_BASE_URL || environment.api.url;
    return fetch(`${baseUrl}/storage${endpoint}`, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });
  }

  // Upload bus image
  static async uploadBusImage(
    busId: string,
    file: File
  ): Promise<UploadResult> {
    try {
      console.log('🔐 Getting access token...');
      const token = authService.getAccessToken();
      if (!token) {
        console.error('❌ No access token available');
        return { success: false, error: 'Authentication required' };
      }
      console.log('✅ Access token obtained');

      const formData = new FormData();
      formData.append('image', file);
      formData.append('busId', busId);

      // Ensure we're using the correct backend URL for production
      const baseUrl = API_BASE_URL || environment.api.url;
      console.log(
        '📤 Sending request to:',
        `${baseUrl}/storage/upload/bus-image`
      );
      console.log('📋 FormData contents:', {
        busId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      const response = await fetch(`${baseUrl}/storage/upload/bus-image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      console.log('📥 Response status:', response.status);
      console.log(
        '📥 Response headers:',
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Upload failed:', errorData);
        return { success: false, error: errorData.error || 'Upload failed' };
      }

      const data = await response.json();
      console.log('✅ Upload successful:', data);
      return {
        success: true,
        url: data.url,
        fileName: data.fileName,
      };
    } catch (error) {
      console.error('❌ Upload bus image error:', error);
      return { success: false, error: 'Network error during upload' };
    }
  }

  // Upload driver photo
  static async uploadDriverPhoto(
    driverId: string,
    file: File
  ): Promise<UploadResult> {
    try {
      const token = authService.getAccessToken();
      if (!token) {
        return { success: false, error: 'Authentication required' };
      }

      const formData = new FormData();
      formData.append('photo', file);
      formData.append('driverId', driverId);

      // Ensure we're using the correct backend URL for production
      const baseUrl = API_BASE_URL || environment.api.url;
      const response = await fetch(
        `${baseUrl}/storage/upload/driver-photo`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Upload failed' };
      }

      const data = await response.json();
      return {
        success: true,
        url: data.url,
        fileName: data.fileName,
      };
    } catch (error) {
      console.error('Upload driver photo error:', error);
      return { success: false, error: 'Network error during upload' };
    }
  }

  // Upload route map
  static async uploadRouteMap(
    routeId: string,
    file: File
  ): Promise<UploadResult> {
    try {
      const token = authService.getAccessToken();
      if (!token) {
        return { success: false, error: 'Authentication required' };
      }

      const formData = new FormData();
      formData.append('map', file);
      formData.append('routeId', routeId);

      // Ensure we're using the correct backend URL for production
      const baseUrl = API_BASE_URL || environment.api.url;
      const response = await fetch(`${baseUrl}/storage/upload/route-map`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Upload failed' };
      }

      const data = await response.json();
      return {
        success: true,
        url: data.url,
        fileName: data.fileName,
      };
    } catch (error) {
      console.error('Upload route map error:', error);
      return { success: false, error: 'Network error during upload' };
    }
  }

  // Get signed URL for file access (for private bucket)
  static async getSignedUrl(
    type: 'bus' | 'driver' | 'route',
    id: string
  ): Promise<SignedUrlResult> {
    try {
      const response = await this.makeRequest(
        `/signed-url/${type}/${id}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'Failed to get signed URL',
        };
      }

      const data = await response.json();
      return {
        success: true,
        signedUrl: data.signedUrl,
        expiresIn: data.expiresIn,
      };
    } catch (error) {
      console.error('Get signed URL error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  // Delete file
  static async deleteFile(
    type: 'bus' | 'driver' | 'route',
    id: string,
    fileUrl: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.makeRequest(`/delete/${type}/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ fileUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Delete failed' };
      }

      return { success: true };
    } catch (error) {
      console.error('Delete file error:', error);
      return { success: false, error: 'Network error during deletion' };
    }
  }

  // Get file info
  static async getFileInfo(
    type: 'bus' | 'driver' | 'route',
    id: string
  ): Promise<FileInfo> {
    try {
      const response = await this.makeRequest(`/info/${type}/${id}`);

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          hasFile: false,
          error: errorData.error || 'Failed to get file info',
        };
      }

      const data = await response.json();
      return {
        success: true,
        hasFile: data.hasFile,
        url: data.url,
        info: data.info,
      };
    } catch (error) {
      console.error('Get file info error:', error);
      return { success: false, hasFile: false, error: 'Network error' };
    }
  }

  // List files in a folder
  static async listFiles(
    folder: string
  ): Promise<{ success: boolean; files?: unknown[]; error?: string }> {
    try {
      const response = await this.makeRequest(`/list/${folder}`);

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'Failed to list files',
        };
      }

      const data = await response.json();
      return {
        success: true,
        files: data.files,
      };
    } catch (error) {
      console.error('List files error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  // File validation
  static validateFile(
    file: File,
    allowedTypes: string[],
    maxSize: number
  ): { isValid: boolean; error?: string } {
    if (!file) {
      return { isValid: false, error: 'No file selected' };
    }

    if (!allowedTypes.includes(file.type)) {
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

  // Validate image file
  static validateImage(file: File): { isValid: boolean; error?: string } {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    return this.validateFile(file, allowedTypes, maxSize);
  }

  // Validate document file
  static validateDocument(file: File): { isValid: boolean; error?: string } {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB
    return this.validateFile(file, allowedTypes, maxSize);
  }
}

export default StorageService;
