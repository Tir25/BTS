export declare class HealthService {
    private static readonly HEALTH_CHECK_TIMEOUT;
    static getBasicHealth(): Promise<{
        status: 'healthy' | 'degraded';
        timestamp: string;
        uptime: number;
        environment: string;
        version: string;
        services: {
            database: string;
            redis: string;
            websocket: string;
        };
    }>;
    static getDetailedHealth(): Promise<{
        status: 'healthy' | 'degraded';
        timestamp: string;
        uptime: number;
        environment: string;
        version: string;
        system: {
            platform: string;
            arch: string;
            nodeVersion: string;
            pid: number;
        };
        memory: {
            rss: string;
            heapTotal: string;
            heapUsed: string;
            external: string;
        };
        services: {
            database: any;
            redis: any;
            websocket: any;
        };
        responseTime: string;
    }>;
    static getReadiness(): Promise<{
        status: 'ready' | 'not ready';
        timestamp: string;
        reason?: string;
        services: {
            database: string;
            redis: string;
            websocket: string;
        };
    }>;
    static getLiveness(): {
        status: 'alive';
        timestamp: string;
        uptime: number;
    };
    static getWebSocketHealth(): import("./WebSocketHealthService").WebSocketHealth;
    static getWebSocketStats(): import("./WebSocketHealthService").WebSocketStats;
    static getConnectionPoolHealth(): {
        healthy: boolean;
        score: number;
        issues: string[];
    };
    static getConnectionPoolMetrics(): import("./ConnectionPoolMonitor").PoolMetrics;
    static getConnectionPoolOptimization(): import("./ConnectionPoolMonitor").PoolOptimization;
    static getConnectionPoolAlerts(): import("./ConnectionPoolMonitor").PoolAlert[];
    static getMetrics(): {
        timestamp: string;
        uptime: number;
        memory: {
            rss: number;
            heapTotal: number;
            heapUsed: number;
            external: number;
        };
        cpu: {
            user: number;
            system: number;
        };
        eventLoop: {
            lag: bigint;
        };
        websocket: any;
    };
}
//# sourceMappingURL=HealthService.d.ts.map