export interface AppConfig {
    port: number;
    nodeEnv: string;
    database: {
        url: string;
        poolMax: number;
        poolIdleTimeout: number;
        poolConnectionTimeout: number;
    };
    supabase: {
        url: string;
        anonKey: string;
        serviceRoleKey: string;
    };
    security: {
        corsOrigins: string[];
        enableHelmet: boolean;
        enableCors: boolean;
        enableRateLimit: boolean;
    };
    rateLimit: {
        windowMs: number;
        maxRequests: number;
    };
    logging: {
        level: string;
        enableDebugLogs: boolean;
    };
}
declare class ConfigManager {
    private static instance;
    private config;
    private constructor();
    static getInstance(): ConfigManager;
    private loadConfig;
    private validateRequiredEnvVars;
    private getEnvVar;
    private getEnvNumber;
    private getEnvBoolean;
    private getCorsOrigins;
    getConfig(): AppConfig;
    get<K extends keyof AppConfig>(key: K): AppConfig[K];
    isProduction(): boolean;
    isDevelopment(): boolean;
    reload(): void;
}
export declare const configManager: ConfigManager;
export declare const getConfig: () => AppConfig;
export declare const getConfigValue: <K extends keyof AppConfig>(key: K) => AppConfig[K];
export declare const isProduction: () => boolean;
export declare const isDevelopment: () => boolean;
export {};
//# sourceMappingURL=ConfigManager.d.ts.map