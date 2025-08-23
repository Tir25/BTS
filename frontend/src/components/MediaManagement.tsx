import { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { adminApiService } from '../services/adminApiService';

interface Bus {
  id?: string;
  number_plate: string;
  bus_image_url?: string;
}

interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  profile_photo_url?: string;
}

interface Route {
  id: string;
  name: string;
  route_map_url?: string;
}

export default function MediaManagement() {
  const [activeTab, setActiveTab] = useState<'bus' | 'driver' | 'route'>('bus');
  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [busesResult, driversResult, routesResult] = await Promise.all([
        adminApiService.getAllBuses(),
        adminApiService.getAllDrivers(),
        adminApiService.getAllRoutes(),
      ]);

      if (busesResult.success && busesResult.data) {
        setBuses(busesResult.data);
      }

      if (driversResult.success && driversResult.data) {
        setDrivers(driversResult.data);
      }

      if (routesResult.success && routesResult.data) {
        setRoutes(routesResult.data);
      }
    } catch (err) {
      setError('Failed to load data');
      console.error('❌ Data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedItem) {
      setError('Please select a file and an item');
      return;
    }

    console.log('🚀 Starting upload...', {
      activeTab,
      selectedItem,
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      fileType: selectedFile.type,
    });

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      let result;

      switch (activeTab) {
        case 'bus':
          console.log('📤 Uploading bus image...');
          result = await StorageService.uploadBusImage(
            selectedItem,
            selectedFile
          );
          break;
        case 'driver':
          console.log('📤 Uploading driver photo...');
          result = await StorageService.uploadDriverPhoto(
            selectedItem,
            selectedFile
          );
          break;
        case 'route':
          console.log('📤 Uploading route map...');
          result = await StorageService.uploadRouteMap(
            selectedItem,
            selectedFile
          );
          break;
      }

      console.log('📥 Upload result:', result);

      if (result.success) {
        setSuccess('File uploaded successfully!');
        setSelectedFile(null);
        setSelectedItem('');
        loadData(); // Refresh the data
      } else {
        setError(result.error || 'Upload failed');
        console.error('❌ Upload failed:', result.error);
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
      console.error('❌ Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (itemId: string, fileUrl: string) => {
    if (!confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      const result = await StorageService.deleteFile(
        activeTab,
        itemId,
        fileUrl
      );
      if (result.success) {
        setSuccess('File deleted successfully!');
        loadData(); // Refresh the data
      } else {
        setError(result.error || 'Delete failed');
      }
    } catch (err) {
      setError('Delete failed. Please try again.');
      console.error('❌ Delete error:', err);
    }
  };

  const getCurrentItems = () => {
    switch (activeTab) {
      case 'bus':
        return buses;
      case 'driver':
        return drivers;
      case 'route':
        return routes;
      default:
        return [];
    }
  };

  const getDisplayName = (item: Bus | Driver | Route) => {
    switch (activeTab) {
      case 'bus':
        return (item as Bus).number_plate;
      case 'driver': {
        const driver = item as Driver;
        return `${driver.first_name} ${driver.last_name}`;
      }
      case 'route':
        return (item as Route).name;
      default:
        return 'Unknown';
    }
  };

  const getFileUrl = (item: Bus | Driver | Route) => {
    let url: string | null = null;

    switch (activeTab) {
      case 'bus':
        url = (item as Bus).bus_image_url || null;
        break;
      case 'driver':
        url = (item as Driver).profile_photo_url || null;
        break;
      case 'route':
        url = (item as Route).route_map_url || null;
        break;
      default:
        return null;
    }

    // If no URL, return null
    if (!url) return null;

    // If it's already a full URL, return as is
    if (url.startsWith('http')) {
      return url;
    }

    // If it's a file path, convert to public URL
    if (url.includes('/')) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const bucketName = 'bus-tracking-media';
      return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${url}`;
    }

    return url;
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'bus':
        return 'Bus Images';
      case 'driver':
        return 'Driver Photos';
      case 'route':
        return 'Route Maps';
      default:
        return 'Media';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading media management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Media Management
            </h1>

            {/* Error/Success Messages */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
                <p className="text-green-700">{success}</p>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'bus', name: 'Bus Images' },
                  { id: 'driver', name: 'Driver Photos' },
                  { id: 'route', name: 'Route Maps' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() =>
                      setActiveTab(tab.id as 'bus' | 'driver' | 'route')
                    }
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Upload Section */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Upload {getTabTitle()}
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* File Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select File
                  </label>
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    accept={
                      activeTab === 'route'
                        ? '.pdf,.jpg,.jpeg,.png'
                        : '.jpg,.jpeg,.png,.webp'
                    }
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                  />
                  {selectedFile && (
                    <p className="mt-1 text-sm text-gray-500">
                      Selected: {selectedFile.name} (
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                {/* Item Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select{' '}
                    {activeTab === 'bus'
                      ? 'Bus'
                      : activeTab === 'driver'
                        ? 'Driver'
                        : 'Route'}
                  </label>
                  <select
                    value={selectedItem}
                    onChange={(e) => setSelectedItem(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Choose...</option>
                    {getCurrentItems().map((item) => (
                      <option key={item.id || 'temp'} value={item.id || ''}>
                        {getDisplayName(item)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Upload Button */}
                <div className="flex items-end">
                  <button
                    onClick={handleUpload}
                    disabled={!selectedFile || !selectedItem || uploading}
                    className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </div>
            </div>

            {/* Media List */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Current {getTabTitle()}
              </h3>

              {getCurrentItems().length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No items found.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {getCurrentItems().map((item) => {
                    const fileUrl = getFileUrl(item);
                    const displayName = getDisplayName(item);
                    return (
                      <div
                        key={item.id || 'temp'}
                        className="bg-white border border-gray-200 rounded-lg p-4"
                      >
                        <h4 className="font-medium text-gray-900 mb-2">
                          {displayName}
                        </h4>

                        {fileUrl ? (
                          <div>
                            <div className="mb-3">
                              {activeTab !== 'route' ? (
                                <img
                                  src={fileUrl}
                                  alt={displayName}
                                  className="w-full h-32 object-cover rounded-md"
                                  onError={(e) => {
                                    e.currentTarget.src =
                                      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBVbmF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-32 bg-gray-100 rounded-md flex items-center justify-center">
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
                            </div>

                            <div className="flex space-x-2">
                              <button
                                onClick={() => window.open(fileUrl, '_blank')}
                                className="flex-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                              >
                                View
                              </button>
                              <button
                                onClick={() =>
                                  item.id && handleDelete(item.id, fileUrl)
                                }
                                className="flex-1 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                                disabled={!item.id}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-gray-500 text-sm mb-2">
                              No file uploaded
                            </p>
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                              <svg
                                className="w-6 h-6 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
