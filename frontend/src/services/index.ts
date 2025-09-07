// Core Services
export { default as authService } from './authService';
export { websocketService } from './websocket';
export { busService } from './busService';
export { apiService } from './api';
export { MapService } from './MapService';
export { DataManager } from './DataManager';
export { ConnectionManager } from './ConnectionManager';
export { ServiceFactory, serviceFactory } from './ServiceFactory';

// Service Interfaces
export type { IMapService } from './interfaces/IMapService';
export type { IWebSocketService } from './interfaces/IWebSocketService';
export type { IBusService } from './interfaces/IBusService';
export type { IApiService } from './interfaces/IApiService';

// Utility Services
export { workerService } from './workerService';
export { StorageService } from './storageService';
export { adminApiService } from './adminApiService';
export { supabaseUserService } from './supabaseUserService';

// Resilience Services
export { resilientApiService } from './resilience/ResilientApiService';
export { apiCircuitBreaker } from './resilience/CircuitBreaker';

// Offline Services
export { offlineStorage } from './offline/OfflineStorage';

// Real-time Services (Marked as deprecated - use with caution)
export { supabaseRealtimeService } from './realtime/SupabaseRealtimeService';
export { sseService } from './realtime/SSEService';
export { realtimeManager } from './realtime/RealtimeManager';
export { connectionPool } from './realtime/ConnectionPool';
