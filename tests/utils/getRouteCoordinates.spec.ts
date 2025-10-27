import { describe, it, expect } from '@jest/globals';
import { getRouteCoordinates } from '../../frontend/src/utils/mapHelpers';

describe('getRouteCoordinates', () => {
  it('should return coordinates from direct coordinates array', () => {
    const route = {
      id: 'route-1',
      coordinates: [[-73.9857, 40.7484], [-73.9870, 40.7490]]
    };
    const result = getRouteCoordinates(route);
    expect(result).toEqual([[-73.9857, 40.7484], [-73.9870, 40.7490]]);
  });

  it('should return coordinates from GeoJSON geom property', () => {
    const route = {
      id: 'route-2',
      geom: {
        coordinates: [[-73.9857, 40.7484], [-73.9870, 40.7490]]
      }
    };
    const result = getRouteCoordinates(route);
    expect(result).toEqual([[-73.9857, 40.7484], [-73.9870, 40.7490]]);
  });

  it('should return coordinates from stops array with lat/lng', () => {
    const route = {
      id: 'route-3',
      stops: [
        { lat: 40.7484, lng: -73.9857 },
        { lat: 40.7490, lng: -73.9870 }
      ]
    };
    const result = getRouteCoordinates(route);
    expect(result).toEqual([[-73.9857, 40.7484], [-73.9870, 40.7490]]);
  });

  it('should return coordinates from stops array with location property', () => {
    const route = {
      id: 'route-4',
      stops: [
        { location: { lat: 40.7484, lng: -73.9857 } },
        { location: { lat: 40.7490, lng: -73.9870 } }
      ]
    };
    const result = getRouteCoordinates(route);
    expect(result).toEqual([[-73.9857, 40.7484], [-73.9870, 40.7490]]);
  });

  it('should return coordinates from stops array with coordinates property', () => {
    const route = {
      id: 'route-5',
      stops: [
        { coordinates: [-73.9857, 40.7484] },
        { coordinates: [-73.9870, 40.7490] }
      ]
    };
    const result = getRouteCoordinates(route);
    expect(result).toEqual([[-73.9857, 40.7484], [-73.9870, 40.7490]]);
  });

  it('should prioritize direct coordinates over geom', () => {
    const route = {
      id: 'route-6',
      coordinates: [[-73.9857, 40.7484]],
      geom: {
        coordinates: [[-73.9870, 40.7490]]
      }
    };
    const result = getRouteCoordinates(route);
    expect(result).toEqual([[-73.9857, 40.7484]]);
  });

  it('should return null for route with no coordinates', () => {
    const route = { id: 'route-7', name: 'Route without coordinates' };
    const result = getRouteCoordinates(route);
    expect(result).toBeNull();
  });

  it('should return null for null input', () => {
    expect(getRouteCoordinates(null)).toBeNull();
  });

  it('should return null for undefined input', () => {
    expect(getRouteCoordinates(undefined)).toBeNull();
  });

  it('should return null for non-object input', () => {
    expect(getRouteCoordinates('invalid')).toBeNull();
    expect(getRouteCoordinates(123)).toBeNull();
    expect(getRouteCoordinates([])).toBeNull();
  });

  it('should return null for empty coordinates array', () => {
    const route = { id: 'route-8', coordinates: [] };
    const result = getRouteCoordinates(route);
    expect(result).toBeNull();
  });

  it('should return null for invalid coordinates format', () => {
    const route = { id: 'route-9', coordinates: [['invalid']] };
    const result = getRouteCoordinates(route);
    expect(result).toBeNull();
  });

  it('should handle stops array with mixed valid/invalid entries', () => {
    const route = {
      id: 'route-10',
      stops: [
        { lat: 40.7484, lng: -73.9857 },
        { invalid: 'data' },
        { lat: 40.7490, lng: -73.9870 }
      ]
    };
    const result = getRouteCoordinates(route);
    expect(result).toEqual([[-73.9857, 40.7484], [-73.9870, 40.7490]]);
  });

  it('should handle GeoJSON LineString format', () => {
    const route = {
      id: 'route-11',
      geom: {
        type: 'LineString',
        coordinates: [[-73.9857, 40.7484], [-73.9870, 40.7490]]
      }
    };
    const result = getRouteCoordinates(route);
    expect(result).toEqual([[-73.9857, 40.7484], [-73.9870, 40.7490]]);
  });
});

