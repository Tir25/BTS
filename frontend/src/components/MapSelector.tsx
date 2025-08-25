import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { GANPAT_UNIVERSITY } from '../utils/coordinates';

interface MapSelectorProps {
  onLocationSelect: (location: {
    name: string;
    coordinates: [number, number];
    address?: string;
  }) => void;
  onClose: () => void;
  title: string;
  defaultCenter?: [number, number];
  searchPlaceholder?: string;
}

const MapSelector: React.FC<MapSelectorProps> = ({
  onLocationSelect,
  onClose,
  title,
  defaultCenter = GANPAT_UNIVERSITY.coordinates, // Ganpat University coordinates
  searchPlaceholder = 'Search for a location...',
}) => {
  // Prevent multiple instances
  const instanceId = React.useRef(Math.random().toString(36).substr(2, 9));
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{
    name: string;
    coordinates: [number, number];
    address?: string;
  } | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return; // Prevent multiple initializations

    console.log(
      `🗺️ [${instanceId.current}] Initializing map with center:`,
      defaultCenter
    );
    console.log(
      `🗺️ [${instanceId.current}] Ganpat University coordinates:`,
      GANPAT_UNIVERSITY.coordinates
    );

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 22,
          },
        ],
      },
      center: GANPAT_UNIVERSITY.coordinates, // Ganpat University coordinates
      zoom: 12,
      preserveDrawingBuffer: true, // Help with WebGL context stability
      antialias: false, // Reduce GPU load
      maxZoom: 18,
      minZoom: 5,
      maxPitch: 0, // Disable 3D to reduce GPU load
      pitch: 0,
    });

    // Wait for map to load before adding controls and markers
    map.current.on('load', () => {
      console.log('🗺️ Map loaded, adding controls and marker');

      try {
        // Add navigation controls
        map.current?.addControl(new maplibregl.NavigationControl());

        // Add marker at default center
        marker.current = new maplibregl.Marker({
          draggable: true,
          color: '#3B82F6',
        })
          .setLngLat(defaultCenter)
          .addTo(map.current!);

        // Force center the map on Ganpat University
        map.current!.flyTo({
          center: GANPAT_UNIVERSITY.coordinates, // Ganpat University
          zoom: 12,
          duration: 1000,
        });

        // Set initial selected location to Ganpat University
        setSelectedLocation({
          name: GANPAT_UNIVERSITY.name,
          coordinates: GANPAT_UNIVERSITY.coordinates,
          address: GANPAT_UNIVERSITY.address,
        });

        // Handle marker drag after marker is created
        marker.current.on('dragend', () => {
          const coordinates = marker.current?.getLngLat();
          if (coordinates) {
            reverseGeocode([coordinates.lng, coordinates.lat]);
          }
        });

        console.log(
          `🗺️ [${instanceId.current}] Map centered on ${GANPAT_UNIVERSITY.name}`
        );

        setIsMapLoading(false);
      } catch (error) {
        console.error('❌ Error setting up map:', error);
        setMapError('Failed to initialize map');
        setIsMapLoading(false);
      }
    });

    // Handle map errors
    map.current.on('error', (e) => {
      console.error('❌ Map error:', e);
      setMapError('Map failed to load');
      setIsMapLoading(false);
    });

    // Handle map clicks
    map.current.on('click', (e) => {
      const coordinates: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      marker.current?.setLngLat(coordinates);

      // Reverse geocode to get address
      reverseGeocode(coordinates);
    });

    // Handle WebGL context loss
    map.current.on('webglcontextlost', () => {
      console.warn('⚠️ WebGL context lost, attempting to restore...');
    });

    map.current.on('webglcontextrestored', () => {
      console.log('✅ WebGL context restored');
    });

    return () => {
      if (map.current) {
        console.log('🗺️ Cleaning up map instance');
        try {
          // Remove all event listeners
          map.current.off('load', () => {});
          map.current.off('click', () => {});
          map.current.off('error', () => {});
          map.current.off('webglcontextlost', () => {});
          map.current.off('webglcontextrestored', () => {});

          // Remove marker
          if (marker.current) {
            marker.current.remove();
          }

          // Remove map
          map.current.remove();
        } catch (error) {
          console.warn('⚠️ Error during map cleanup:', error);
        } finally {
          map.current = null;
          marker.current = null;
        }
      }
    };
  }, [defaultCenter]); // Include defaultCenter dependency

  const reverseGeocode = async (coordinates: [number, number]) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinates[1]}&lon=${coordinates[0]}&zoom=18&addressdetails=1`
      );
      const data = await response.json();

      const location = {
        name: data.display_name.split(',')[0] || 'Selected Location',
        coordinates: coordinates,
        address: data.display_name,
      };

      setSelectedLocation(location);
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      setSelectedLocation({
        name: 'Selected Location',
        coordinates: coordinates,
        address: `${coordinates[1]}, ${coordinates[0]}`,
      });
    }
  };

  const searchLocation = async () => {
    if (!searchQuery.trim() || !map.current) return;

    try {
      console.log('🔍 Searching for:', searchQuery);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=in`
      );
      const data = await response.json();

      console.log('🔍 Search results:', data);

      if (data.length > 0) {
        const firstResult = data[0];
        const coordinates: [number, number] = [
          parseFloat(firstResult.lon),
          parseFloat(firstResult.lat),
        ];

        console.log('🗺️ Flying to coordinates:', coordinates);

        map.current!.flyTo({
          center: coordinates,
          zoom: 15,
        });

        marker.current?.setLngLat(coordinates);

        const location = {
          name: firstResult.display_name.split(',')[0] || searchQuery,
          coordinates: coordinates,
          address: firstResult.display_name,
        };

        setSelectedLocation(location);
      } else {
        console.log('🔍 No search results found');
      }
    } catch (error) {
      console.error('❌ Error searching location:', error);
    }
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchLocation();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={searchPlaceholder}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={searchLocation}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Search
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (map.current) {
                  console.log(
                    '🏫 Resetting to Ganpat University at coordinates:',
                    GANPAT_UNIVERSITY.coordinates
                  );
                  map.current!.flyTo({
                    center: GANPAT_UNIVERSITY.coordinates, // Ganpat University
                    zoom: 12,
                  });
                  marker.current?.setLngLat(GANPAT_UNIVERSITY.coordinates);
                  setSelectedLocation({
                    name: GANPAT_UNIVERSITY.name,
                    coordinates: GANPAT_UNIVERSITY.coordinates,
                    address: GANPAT_UNIVERSITY.address,
                  });
                }
              }}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              🏫 Reset to Ganpat University
            </button>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          {isMapLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Loading map...</p>
              </div>
            </div>
          )}

          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-10">
              <div className="text-center">
                <p className="text-red-600 mb-2">⚠️ {mapError}</p>
                <button
                  onClick={() => {
                    setMapError(null);
                    setIsMapLoading(true);
                    // Force re-initialization
                    if (map.current) {
                      map.current.remove();
                      map.current = null;
                      marker.current = null;
                    }
                    // Trigger useEffect again
                    const container = mapContainer.current;
                    if (container) {
                      container.innerHTML = '';
                    }
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          <div ref={mapContainer} className="w-full h-full" />
        </div>

        {/* Selected Location Info */}
        {selectedLocation && (
          <div className="p-4 border-t bg-gray-50">
            <div className="mb-4">
              <h3 className="font-semibold text-gray-800 mb-2">
                Selected Location:
              </h3>
              <p className="text-gray-700 font-medium">
                {selectedLocation.name}
              </p>
              {selectedLocation.address && (
                <p className="text-sm text-gray-600 mt-1">
                  {selectedLocation.address}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Coordinates: {selectedLocation.coordinates[1].toFixed(6)},{' '}
                {selectedLocation.coordinates[0].toFixed(6)}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Confirm Selection
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapSelector;
