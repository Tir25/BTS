import React, { useState, useRef } from 'react';
import { StorageService } from '../services/storageService';

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

export default function FileUpload({
  type,
  entityId,
  currentFileUrl,
  onUploadSuccess,
  onUploadError,
  onDeleteSuccess,
  onDeleteError,
  className = '',
}: FileUploadProps) {
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
      validation = StorageService.validateDocument(file);
    } else {
      validation = StorageService.validateImage(file);
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
          uploadResult = await StorageService.uploadBusImage(entityId, file);
          break;
        case 'driver':
          uploadResult = await StorageService.uploadDriverPhoto(entityId, file);
          break;
        case 'route':
          uploadResult = await StorageService.uploadRouteMap(entityId, file);
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
      const deleteResult = await StorageService.deleteFile(
        type,
        entityId,
        currentFileUrl
      );

      if (deleteResult.success) {
        onDeleteSuccess();
      } else {
        onDeleteError(deleteResult.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      onDeleteError('Network error during deletion');
    } finally {
      setIsDeleting(false);
    }
  };

  const getFileTypeLabel = () => {
    switch (type) {
      case 'bus':
        return 'Bus Image';
      case 'driver':
        return 'Driver Photo';
      case 'route':
        return 'Route Map';
      default:
        return 'File';
    }
  };

  const getAcceptedTypes = () => {
    switch (type) {
      case 'route':
        return '.pdf,.jpg,.jpeg,.png';
      default:
        return '.jpg,.jpeg,.png,.webp';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          {getFileTypeLabel()}
        </h3>
        {currentFileUrl && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-700"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Deleting...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete
              </>
            )}
          </button>
        )}
      </div>

      {currentFileUrl ? (
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            {type !== 'route' ? (
              <img
                src={currentFileUrl}
                alt={getFileTypeLabel()}
                className="w-20 h-20 object-cover rounded-lg border border-gray-200"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                Current {getFileTypeLabel().toLowerCase()}
              </p>
              <a
                href={currentFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                View file
              </a>
            </div>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Replace {getFileTypeLabel().toLowerCase()}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
            <div className="space-y-2 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor={`file-upload-${type}-${entityId}`}
                  className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                >
                  <span>Upload a {getFileTypeLabel().toLowerCase()}</span>
                  <input
                    id={`file-upload-${type}-${entityId}`}
                    ref={fileInputRef}
                    name={`file-upload-${type}`}
                    type="file"
                    className="sr-only"
                    accept={getAcceptedTypes()}
                    onChange={handleFileSelect}
                    disabled={isUploading}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">
                {type === 'route'
                  ? 'PDF, JPG, PNG up to 10MB'
                  : 'JPG, PNG, WebP up to 5MB'}
              </p>
            </div>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}
