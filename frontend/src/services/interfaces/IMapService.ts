export interface IMapService {
  initialize(container: HTMLDivElement): Promise<void>;
  addRoute(routeId: string, routeData: any): void;
  updateBusMarker(busId: string, location: any): void;
  removeBusMarker(busId: string): void;
  centerOnBuses(locations: any[]): void;
  destroy(): void;
  isInitialized(): boolean;
  isMapReady(): boolean;
}

export interface IMapConfiguration {
  center: [number, number];
  zoom: number;
  style: any;
  maxZoom: number;
  minZoom: number;
}
