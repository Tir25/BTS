/**
 * Route Path Drawer Component
 * Allows drawing route paths on a map by clicking points or searching for locations
 */

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_TILE_URLS, MAP_TILE_ATTRIBUTION, MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM, MAP_MAX_ZOOM } from '../../config/map';
import { logger } from '../../utils/logger';

interface RoutePathDrawerProps {
  onPathChange: (coordinates: [number, number][]) => void;
  initialCoordinates?: [number, number][];
  height?: string;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

const RoutePathDrawer: React.FC<RoutePathDrawerProps> = ({
  onPathChange,
  initialCoordinates = [],
  height = '400px',
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const routeSourceId = 'route-path-source';
  const routeLayerId = 'route-path-layer';
  const markersSourceId = 'route-markers-source';
  const markersLayerId = 'route-markers-layer';
  const searchMarkerRef = useRef<maplibregl.Marker | null>(null);
  
  const [coordinates, setCoordinates] = useState<[number, number][]>(initialCoordinates);
  const [isDrawing, setIsDrawing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [clickedLocationInfo, setClickedLocationInfo] = useState<{ address: string; coordinates: [number, number] } | null>(null);
  const clickPopupRef = useRef<maplibregl.Popup | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    logger.info('Initializing route path drawer map', 'RoutePathDrawer');

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: MAP_TILE_URLS,
            tileSize: 256,
            attribution: MAP_TILE_ATTRIBUTION,
          },
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: MAP_MAX_ZOOM,
          },
        ],
      },
      center: initialCoordinates.length > 0 
        ? initialCoordinates[0] 
        : MAP_DEFAULT_CENTER,
      zoom: MAP_DEFAULT_ZOOM,
      preserveDrawingBuffer: true,
      antialias: false,
      maxZoom: MAP_MAX_ZOOM,
      minZoom: 5,
      maxPitch: 0,
      pitch: 0,
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl());

    // Wait for map to load
    map.current.on('load', () => {
      logger.info('Route path drawer map loaded', 'RoutePathDrawer');
      
      // Add route path source and layer
      if (map.current) {
        map.current.addSource(routeSourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates,
            },
          },
        });

        map.current.addLayer({
          id: routeLayerId,
          type: 'line',
          source: routeSourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#3B82F6',
            'line-width': 4,
            'line-opacity': 0.8,
          },
        });

        // Add markers source and layer for route points
        map.current.addSource(markersSourceId, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: coordinates.map((coord, index) => ({
              type: 'Feature',
              properties: { index },
              geometry: {
                type: 'Point',
                coordinates: coord,
              },
            })),
          },
        });

        map.current.addLayer({
          id: markersLayerId,
          type: 'circle',
          source: markersSourceId,
          paint: {
            'circle-radius': 6,
            'circle-color': '#3B82F6',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });

        // Fit bounds if initial coordinates exist
        if (coordinates.length > 0) {
          const bounds = new maplibregl.LngLatBounds(coordinates[0], coordinates[0]);
          coordinates.forEach(coord => bounds.extend(coord));
          map.current.fitBounds(bounds, {
            padding: { top: 50, bottom: 50, left: 50, right: 50 },
            duration: 1000,
          });
        }
      }
    });

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update route path when coordinates change
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    const source = map.current.getSource(routeSourceId) as maplibregl.GeoJSONSource;
    const markersSource = map.current.getSource(markersSourceId) as maplibregl.GeoJSONSource;

    if (source) {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates,
        },
      });
    }

    if (markersSource) {
      markersSource.setData({
        type: 'FeatureCollection',
        features: coordinates.map((coord, index) => ({
          type: 'Feature',
          properties: { index },
          geometry: {
            type: 'Point',
            coordinates: coord,
          },
        })),
      });
    }

    // Fit bounds if coordinates exist
    if (coordinates.length > 0 && map.current) {
      const bounds = new maplibregl.LngLatBounds(coordinates[0], coordinates[0]);
      coordinates.forEach(coord => bounds.extend(coord));
      map.current.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        duration: 500,
      });
    }

    onPathChange(coordinates);
  }, [coordinates, onPathChange]);

  // Handle map click to add points and show location info
  useEffect(() => {
    if (!map.current) return;

    const handleMapClick = async (e: maplibregl.MapMouseEvent) => {
      const newCoord: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      
      // Always reverse geocode to show location info
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newCoord[1]}&lon=${newCoord[0]}&zoom=18&addressdetails=1`
        );
        const data = await response.json();

        if (data && data.display_name) {
          setClickedLocationInfo({
            address: data.display_name,
            coordinates: newCoord,
          });

          // Show popup on map
          if (clickPopupRef.current) {
            clickPopupRef.current.remove();
          }
          clickPopupRef.current = new maplibregl.Popup({ offset: 25 })
            .setLngLat(newCoord)
            .setHTML(`
              <div class="p-2">
                <div class="font-semibold text-sm text-gray-900 mb-1">📍 Location</div>
                <div class="text-xs text-gray-600">${data.display_name}</div>
                <div class="text-xs text-gray-500 mt-1">${newCoord[1].toFixed(6)}, ${newCoord[0].toFixed(6)}</div>
              </div>
            `)
            .addTo(map.current!);
        }
      } catch (error) {
        logger.error('Error reverse geocoding on click', 'RoutePathDrawer', { error });
        setClickedLocationInfo({
          address: `Coordinates: ${newCoord[1].toFixed(6)}, ${newCoord[0].toFixed(6)}`,
          coordinates: newCoord,
        });
      }

      // Add to path if drawing is active
      if (isDrawing) {
        setCoordinates(prev => {
          const newCoords = [...prev, newCoord];
          logger.debug('Added route point', 'RoutePathDrawer', { coord: newCoord, coordinates: newCoords.length });
          return newCoords;
        });
      }
    };

    map.current.on('click', handleMapClick);

    return () => {
      if (map.current) {
        map.current.off('click', handleMapClick);
      }
    };
  }, [isDrawing]);

  const handleStartDrawing = () => {
    setIsDrawing(true);
    setCoordinates([]);
    logger.info('Started drawing route path', 'RoutePathDrawer');
  };

  const handleStopDrawing = () => {
    setIsDrawing(false);
    logger.info('Stopped drawing route path', 'RoutePathDrawer', { 
      pointCount: coordinates.length
    });
  };

  const handleClearPath = () => {
    setCoordinates([]);
    setIsDrawing(false);
    logger.info('Cleared route path', 'RoutePathDrawer');
  };

  const handleRemoveLastPoint = () => {
    setCoordinates(prev => prev.slice(0, -1));
    logger.debug('Removed last route point', 'RoutePathDrawer');
  };

  // Location search functionality with alternative terms
  const searchLocation = async () => {
    if (!searchQuery.trim() || !map.current) return;

    setIsSearching(true);
    setShowSearchResults(false);

    try {
      logger.debug('Searching for location', 'RoutePathDrawer', { query: searchQuery });

      // Try original query first
      let response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=in`
      );
      let data = await response.json();

      // If no results, try alternative terms (chowkdi -> circle, chowk -> circle, etc.)
      if (!data || data.length === 0) {
        const alternatives = [
          searchQuery.replace(/chowkdi/gi, 'circle'),
          searchQuery.replace(/chowk/gi, 'circle'),
          searchQuery.replace(/circle/gi, 'chowk'),
          `${searchQuery} Mehsana`,
          `${searchQuery} Gujarat`,
        ];

        for (const altQuery of alternatives) {
          if (altQuery === searchQuery) continue; // Skip if same as original
          
          logger.debug('Trying alternative search', 'RoutePathDrawer', { query: altQuery });
          response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(altQuery)}&limit=5&countrycodes=in`
          );
          data = await response.json();
          
          if (data && data.length > 0) {
            logger.info('Found results with alternative term', 'RoutePathDrawer', { 
              original: searchQuery,
              alternative: altQuery,
              count: data.length 
            });
            break;
          }
        }
      }

      if (data && data.length > 0) {
        setSearchResults(data);
        setShowSearchResults(true);
        logger.info('Search results found', 'RoutePathDrawer', { count: data.length });
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
        logger.info('No search results found', 'RoutePathDrawer', { query: searchQuery });
      }
    } catch (error) {
      logger.error('Error searching location', 'RoutePathDrawer', { error });
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: SearchResult) => {
    const coordinates: [number, number] = [
      parseFloat(result.lon),
      parseFloat(result.lat),
    ];

    // Fly to location
    if (map.current) {
      map.current.flyTo({
        center: coordinates,
        zoom: 16,
        duration: 1000,
      });

      // Add search marker to show selected location
      if (searchMarkerRef.current) {
        searchMarkerRef.current.remove();
      }
      searchMarkerRef.current = new maplibregl.Marker({ color: '#10b981' })
        .setLngLat(coordinates)
        .addTo(map.current);
    }

    // Automatically add to path (whether drawing is active or not)
    // This makes it easier - search, select, and it's added
    setCoordinates(prev => {
      const newCoords = [...prev, coordinates];
      logger.info('Added location from search to path', 'RoutePathDrawer', { 
        location: result.display_name,
        coordinates,
        totalPoints: newCoords.length,
        wasDrawing: isDrawing
      });
      return newCoords;
    });

    // If not drawing, automatically start drawing mode for convenience
    if (!isDrawing) {
      setIsDrawing(true);
      logger.info('Auto-started drawing mode after search selection', 'RoutePathDrawer');
    }

    // Clear search
    setSearchQuery('');
    setShowSearchResults(false);
    setSearchResults([]);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchLocation();
    }
  };

  // Cleanup search marker on unmount
  useEffect(() => {
    return () => {
      if (searchMarkerRef.current) {
        searchMarkerRef.current.remove();
      }
    };
  }, []);

  return (
    <div className="space-y-2">
      {/* Search Bar */}
      <div className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(false);
            }}
            onKeyPress={handleSearchKeyPress}
            placeholder="Search for location (e.g., Randhanpur Circle Mehsana)..."
            className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500 text-sm"
          />
          <button
            type="button"
            onClick={searchLocation}
            disabled={isSearching || !searchQuery.trim()}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:text-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {isSearching ? 'Searching...' : '🔍 Search'}
          </button>
        </div>

        {/* Search Results Dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-white/20 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((result, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectSearchResult(result)}
                className="w-full text-left px-4 py-2 hover:bg-gray-700 border-b border-white/10 last:border-b-0 transition-colors"
              >
                <div className="text-white text-sm font-medium">
                  {result.display_name.split(',')[0]}
                </div>
                <div className="text-white/60 text-xs mt-1">
                  {result.display_name}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No Results Message */}
        {showSearchResults && searchResults.length === 0 && !isSearching && (
          <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-white/20 rounded-lg shadow-lg p-3">
            <div className="text-white/60 text-sm">
              No results found. Try clicking on the map to place a point manually.
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleStartDrawing}
            disabled={isDrawing}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isDrawing
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isDrawing ? 'Drawing...' : 'Start Drawing'}
          </button>
          {isDrawing && (
            <button
              type="button"
              onClick={handleStopDrawing}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Stop Drawing
            </button>
          )}
          {coordinates.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleRemoveLastPoint}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Remove Last Point
              </button>
              <button
                type="button"
                onClick={handleClearPath}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Clear All
              </button>
            </>
          )}
        </div>
        <div className="text-sm text-white/70">
          {coordinates.length > 0 ? `${coordinates.length} point${coordinates.length !== 1 ? 's' : ''} added` : 'Search for location or click "Start Drawing" to add points'}
        </div>
      </div>

      {/* Map Container */}
      <div
        ref={mapContainer}
        style={{ height, width: '100%' }}
        className="rounded-lg border border-white/20"
      />

      {/* Clicked Location Info */}
      {clickedLocationInfo && (
        <div className="text-sm bg-green-900/20 border border-green-500/30 p-2 rounded">
          <div className="text-green-400 font-medium mb-1">📍 Clicked Location:</div>
          <div className="text-white/80 text-xs">{clickedLocationInfo.address}</div>
          <div className="text-white/60 text-xs mt-1">
            Coordinates: {clickedLocationInfo.coordinates[1].toFixed(6)}, {clickedLocationInfo.coordinates[0].toFixed(6)}
          </div>
          {!isDrawing && (
            <button
              type="button"
              onClick={() => {
                setCoordinates(prev => [...prev, clickedLocationInfo.coordinates]);
                setIsDrawing(true);
                logger.info('Added clicked location to path', 'RoutePathDrawer');
              }}
              className="mt-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
            >
              Add to Path
            </button>
          )}
        </div>
      )}

      {/* Help Text */}
      {isDrawing && (
        <div className="text-sm text-blue-400 bg-blue-900/20 p-2 rounded">
          💡 Click on the map to add route points (location info will appear). Or search for a location and select it. Click "Stop Drawing" when done.
        </div>
      )}
      {!isDrawing && coordinates.length === 0 && (
        <div className="text-sm text-white/60 bg-gray-900/20 p-2 rounded">
          💡 Tip: Click anywhere on the map to see location details. If you see "Randhanpur chowkdi" on the map, click on it to get its coordinates! Or search for locations like "Randhanpur Circle Mehsana".
        </div>
      )}
    </div>
  );
};

export default RoutePathDrawer;

