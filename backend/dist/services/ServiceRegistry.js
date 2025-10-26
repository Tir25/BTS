"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = exports.UnifiedDatabaseService = exports.serviceRegistry = void 0;
const UnifiedDatabaseService_1 = require("./UnifiedDatabaseService");
Object.defineProperty(exports, "UnifiedDatabaseService", { enumerable: true, get: function () { return UnifiedDatabaseService_1.UnifiedDatabaseService; } });
const AnalyticsService_1 = require("./domain/AnalyticsService");
Object.defineProperty(exports, "AnalyticsService", { enumerable: true, get: function () { return AnalyticsService_1.AnalyticsService; } });
const routeService_1 = require("./routeService");
const storageService_1 = require("./storageService");
const logger_1 = require("../utils/logger");
class ServiceRegistryImpl {
    constructor() {
        this.bus = UnifiedDatabaseService_1.UnifiedDatabaseService;
        this.driver = UnifiedDatabaseService_1.UnifiedDatabaseService;
        this.analytics = AnalyticsService_1.AnalyticsService;
        this.route = routeService_1.RouteService;
        this.storage = storageService_1.StorageService;
    }
    async initialize() {
        try {
            logger_1.logger.info('Initializing service registry', 'service-registry');
            logger_1.logger.info('Service registry initialized successfully', 'service-registry');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize service registry', 'service-registry', { error });
            throw error;
        }
    }
    getService(serviceName) {
        return this[serviceName];
    }
    getAllServices() {
        return {
            bus: this.bus,
            driver: this.driver,
            analytics: this.analytics,
            route: this.route,
            storage: this.storage
        };
    }
}
exports.serviceRegistry = new ServiceRegistryImpl();
//# sourceMappingURL=ServiceRegistry.js.map