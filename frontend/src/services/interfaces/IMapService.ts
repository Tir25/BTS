export interface IMapService {
  initialize(container: HTMLDivElement): Promise<void>;
  addRoute(routeId: string, routeData: any): void;
  updateBusMarker(busId: string, location: any): void;
  removeBusMarker(busId: string): void;
  centerOnBuses(locations: any[]): void;
  destroy(): void;
  isInitialized(): boolean;
  isMapReady(): boolean;
  // CRITICAL FIX: MapStore integration for single source of truth
  setMapStore(store: any): void;
  setMapInstance(map: any): void;
  setClusteringEnabled(enabled: boolean, maxZoom?: number, radius?: number): void;
  updateClusters(locations: { [busId: string]: any }): void;
  cleanupMarkers(): void;
}

export interface IMapConfiguration {
  center: [number, number];
  zoom: number;
  style: any;
  maxZoom: number;
  minZoom: number;
}
