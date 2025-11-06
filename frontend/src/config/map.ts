import environment from './environment';

export const MAP_TILE_URLS: string[] = [
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
];

export const MAP_TILE_ATTRIBUTION = '© OpenStreetMap contributors';

export const MAP_DEFAULT_CENTER = environment.map.defaultCenter as [number, number];
export const MAP_DEFAULT_ZOOM = environment.map.defaultZoom;
export const MAP_MAX_ZOOM = environment.map.maxZoom;
export const MAP_MIN_ZOOM = environment.map.minZoom;

export default {
  MAP_TILE_URLS,
  MAP_TILE_ATTRIBUTION,
  MAP_DEFAULT_CENTER,
  MAP_DEFAULT_ZOOM,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
};


