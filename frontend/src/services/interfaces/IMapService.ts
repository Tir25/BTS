import { Route, BusLocation } from '../../types';

export interface IMapService {
  initialize(container: HTMLDivElement): Promise<void>;
  addRoute(routeId: string, routeData: Route): void;
  updateBusMarker(busId: string, location: BusLocation): void;
  removeBusMarker(busId: string): void;
  centerOnBuses(locations: BusLocation[]): void;
  destroy(): void;
  isInitialized(): boolean;
  isMapReady(): boolean;
}

export interface IMapConfiguration {
  center: [number, number];
  zoom: number;
  style: Record<string, unknown>; // MapLibre GL style specification
  maxZoom: number;
  minZoom: number;
}
