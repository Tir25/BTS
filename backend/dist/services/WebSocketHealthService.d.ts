import { Server as SocketIOServer } from 'socket.io';
export interface WebSocketHealth {
    connected: boolean;
    activeConnections: number;
    totalConnections: number;
    driverConnections: number;
    studentConnections: number;
    adminConnections: number;
    averageLatency: number;
    errorRate: number;
    uptime: number;
    lastActivity: string;
    performance: {
        eventsPerSecond: number;
        bytesPerSecond: number;
        memoryUsage: number;
    };
}
export interface WebSocketStats {
    connections: {
        total: number;
        drivers: number;
        students: number;
        admins: number;
        anonymous: number;
    };
    performance: {
        eventsPerSecond: number;
        bytesPerSecond: number;
        averageLatency: number;
        errorRate: number;
    };
    memory: {
        used: number;
        peak: number;
    };
}
export declare class WebSocketHealthService {
    private io;
    private startTime;
    private eventCount;
    private errorCount;
    private bytesTransferred;
    private lastActivity;
    private performanceInterval;
    private eventsPerSecond;
    private bytesPerSecond;
    constructor();
    initialize(io: SocketIOServer): void;
    getHealth(): WebSocketHealth;
    getStats(): WebSocketStats;
    recordEvent(bytes?: number): void;
    recordError(): void;
    isHealthy(): boolean;
    getConnectionMetrics(): any;
    private monitorSocket;
    private startPerformanceMonitoring;
    private calculateAverageLatency;
    private getMemoryUsage;
    private getPeakMemoryUsage;
    stop(): void;
}
export declare const webSocketHealth: WebSocketHealthService;
//# sourceMappingURL=WebSocketHealthService.d.ts.map