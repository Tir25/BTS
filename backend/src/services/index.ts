// Export only concrete service classes/singletons to avoid duplicate type re-exports
export * from './BackendDriverVerificationService';
export * from './ConnectionPoolMonitor';
export * from './ConsolidatedAdminService';
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
// Export specialized services
export * from './database/BusDatabaseService';
export * from './database/DriverDatabaseService';
export * from './database/RouteDatabaseService';
export * from './assignments/AssignmentDashboardService';
export * from './assignments/AssignmentCreationService';
export * from './assignments/AssignmentValidationService';
export * from './routes/RouteQueryService';
export * from './routes/RouteMutationService';

