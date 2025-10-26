export interface PortConfig {
    preferredPort: number;
    fallbackPorts: number[];
    maxAttempts: number;
}
export declare class PortManager {
    private static instance;
    private constructor();
    static getInstance(): PortManager;
    private isPortAvailable;
    findAvailablePort(config: PortConfig): Promise<number>;
    getFrontendPortConfig(): PortConfig;
    getBackendPortConfig(): PortConfig;
    killProcessOnPort(port: number): Promise<boolean>;
}
export default PortManager;
//# sourceMappingURL=portManager.d.ts.map