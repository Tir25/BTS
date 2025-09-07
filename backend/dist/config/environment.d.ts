export interface EnvironmentConfig {
    port: number;
    nodeEnv: string;
    database: {
        url: string;
        poolMax: number;
        poolIdleTimeout: number;
        poolConnectionTimeout: number;
        retryDelay: number;
        maxRetries: number;
    };
    supabase: {
        url: string;
        anonKey: string;
        serviceRoleKey: string;
    };
    cors: {
        allowedOrigins: (string | RegExp)[];
        credentials: boolean;
    };
    rateLimit: {
        windowMs: number;
        maxRequests: number;
        authMaxRequests: number;
    };
    security: {
        enableHelmet: boolean;
        enableCors: boolean;
        enableRateLimit: boolean;
        adminEmails: string[];
    };
    logging: {
        level: string;
        enableDebugLogs: boolean;
    };
    websocket: {
        cors: {
            origin: (string | RegExp)[];
            methods: string[];
            credentials: boolean;
        };
    };
}
export declare const initializeEnvironment: () => EnvironmentConfig;
export default initializeEnvironment;
//# sourceMappingURL=environment.d.ts.map