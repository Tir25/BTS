import React, { useState, useRef } from 'react';

interface FileUploadProps {
  type: 'bus' | 'driver' | 'route';
  entityId: string;
  currentFileUrl?: string;
  onUploadSuccess: (url: string) => void;
  onUploadError: (error: string) => void;
  onDeleteSuccess: () => void;
  onDeleteError: (error: string) => void;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  type,
  entityId,
  currentFileUrl,
  onUploadSuccess,
  onUploadError,
  onDeleteSuccess,
  onDeleteError,
  className = '',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file based on type
    let validation;
    if (type === 'route') {
      validation = validateDocument(file);
    } else {
      validation = validateImage(file);
    }

    if (!validation.isValid) {
      onUploadError(validation.error || 'Invalid file');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      let uploadResult;

      switch (type) {
        case 'bus':
          uploadResult = await uploadBusImage(entityId, file);
          break;
        case 'driver':
          uploadResult = await uploadDriverPhoto(entityId, file);
          break;
        case 'route':
          uploadResult = await uploadRouteMap(entityId, file);
          break;
        default:
          throw new Error('Invalid upload type');
      }

      if (uploadResult.success && uploadResult.url) {
        onUploadSuccess(uploadResult.url);
        setUploadProgress(100);
      } else {
        onUploadError(uploadResult.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      onUploadError('Network error during upload');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!currentFileUrl) return;

    setIsDeleting(true);
    try {
      const deleteResult = await deleteFile(currentFileUrl);
      if (deleteResult.success) {
        onDeleteSuccess();
      } else {
        onDeleteError(deleteResult.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      onDeleteError('Network error during delete');
    } finally {
      setIsDeleting(false);
    }
  };

  // File validation functions
  const validateImage = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'Invalid image type. Use JPEG, PNG, or WebP.' };
    }

    if (file.size > maxSize) {
      return { isValid: false, error: 'Image too large. Maximum size: 5MB' };
    }

    return { isValid: true };
  };

  const validateDocument = (file: File) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'Invalid document type. Use PDF, JPEG, or PNG.' };
    }

    if (file.size > maxSize) {
      return { isValid: false, error: 'Document too large. Maximum size: 10MB' };
    }

    return { isValid: true };
  };

  // Upload functions (these would be imported from services)
  const uploadBusImage = async (busId: string, file: File) => {
    // Implementation would call the actual service
    return { success: true, url: 'placeholder-url' };
  };

  const uploadDriverPhoto = async (driverId: string, file: File) => {
    // Implementation would call the actual service
    return { success: true, url: 'placeholder-url' };
  };

  const uploadRouteMap = async (routeId: string, file: File) => {
    // Implementation would call the actual service
    return { success: true, url: 'placeholder-url' };
  };

  const deleteFile = async (fileUrl: string) => {
    // Implementation would call the actual service
    return { success: true };
  };

  return (
    <div className={`file-upload ${className}`}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {type === 'bus' ? 'Bus Image' : type === 'driver' ? 'Driver Photo' : 'Route Map'}
        </label>
        
        {currentFileUrl ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <img
                src={currentFileUrl}
                alt="Current file"
                className="w-16 h-16 object-cover rounded-lg border"
              />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Current file</p>
                <a
                  href={currentFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  View file
                </a>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Replace
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept={type === 'route' ? '.pdf,.jpg,.jpeg,.png' : '.jpg,.jpeg,.png,.webp'}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isUploading ? 'Uploading...' : 'Choose File'}
            </button>
            {isUploading && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-1">{uploadProgress}%</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
