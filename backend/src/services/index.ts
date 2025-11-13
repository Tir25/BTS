// Export only concrete service classes/singletons to avoid duplicate type re-exports
export * from './BackendDriverVerificationService';
export * from './ConnectionPoolMonitor';
export { InMemoryCacheService, inMemoryCache } from './InMemoryCacheService';
export * from './LocationArchiveService';
export * from './locationService';
export * from './MonitoringService';
export * from './OptimizedAssignmentService';
export * from './OptimizedLocationService';
export * from './RedisCacheService';
export * from './storageService';
export * from './StudentRouteService';
export * from './TrackingService';
export * from './WebSocketHealthService';
// Export specialized services - use explicit exports to avoid type conflicts
export { BusDatabaseService } from './database/BusDatabaseService';
export { DriverDatabaseService } from './database/DriverDatabaseService';
export { RouteDatabaseService, type RouteDatabaseData } from './database/RouteDatabaseService';
export * from './assignments/AssignmentDashboardService';
export * from './assignments/AssignmentCreationService';
export * from './assignments/AssignmentValidationService';
export * from './routes/RouteQueryService';
export { RouteMutationService, type RouteData } from './routes/RouteMutationService';

