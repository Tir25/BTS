import { UnifiedDatabaseService } from './UnifiedDatabaseService';
import { AnalyticsService } from './domain/AnalyticsService';
import { RouteService } from './routeService';
import { StorageService } from './storageService';
export interface ServiceRegistry {
    bus: typeof UnifiedDatabaseService;
    driver: typeof UnifiedDatabaseService;
    analytics: typeof AnalyticsService;
    route: typeof RouteService;
    storage: typeof StorageService;
}
declare class ServiceRegistryImpl implements ServiceRegistry {
    readonly bus: typeof UnifiedDatabaseService;
    readonly driver: typeof UnifiedDatabaseService;
    readonly analytics: typeof AnalyticsService;
    readonly route: typeof RouteService;
    readonly storage: typeof StorageService;
    initialize(): Promise<void>;
    getService<T extends keyof ServiceRegistry>(serviceName: T): ServiceRegistry[T];
    getAllServices(): ServiceRegistry;
}
export declare const serviceRegistry: ServiceRegistryImpl;
export { UnifiedDatabaseService, AnalyticsService };
//# sourceMappingURL=ServiceRegistry.d.ts.map