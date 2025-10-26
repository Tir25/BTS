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
    redis: {
        url: string;
        maxRetries: number;
        retryDelay: number;
        connectTimeout: number;
    };
}
export declare const initializeEnvironment: () => EnvironmentConfig;
declare const config: EnvironmentConfig;
export default config;
//# sourceMappingURL=environment.d.ts.map