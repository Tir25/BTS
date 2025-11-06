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
export * from './ProductionAssignmentService';
export * from './RedisCacheService';
export { RouteService } from './routeService';
export * from './storageService';
export * from './StudentRouteService';
export * from './TrackingService';
export * from './UnifiedDatabaseService';
export * from './WebSocketHealthService';

