"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortManager = void 0;
const net_1 = require("net");
const child_process_1 = require("child_process");
const logger_1 = require("./logger");
class PortManager {
    constructor() { }
    static getInstance() {
        if (!PortManager.instance) {
            PortManager.instance = new PortManager();
        }
        return PortManager.instance;
    }
    async isPortAvailable(port) {
        return new Promise((resolve) => {
            const server = (0, net_1.createServer)();
            server.listen(port, () => {
                server.close(() => {
                    resolve(true);
                });
            });
            server.on('error', () => {
                resolve(false);
            });
        });
    }
    async findAvailablePort(config) {
        const { preferredPort, fallbackPorts, maxAttempts } = config;
        if (await this.isPortAvailable(preferredPort)) {
            logger_1.logger.info(`Port ${preferredPort} is available`, 'portManager');
            return preferredPort;
        }
        logger_1.logger.warn(`Port ${preferredPort} is in use, trying fallback ports...`, 'portManager');
        for (let i = 0; i < Math.min(fallbackPorts.length, maxAttempts); i++) {
            const port = fallbackPorts[i];
            if (await this.isPortAvailable(port)) {
                logger_1.logger.info(`Found available port: ${port}`, 'portManager');
                return port;
            }
        }
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const randomPort = Math.floor(Math.random() * (65535 - 3000)) + 3000;
            if (await this.isPortAvailable(randomPort)) {
                logger_1.logger.warn(`Using random available port: ${randomPort}`, 'portManager');
                return randomPort;
            }
        }
        throw new Error('No available ports found after maximum attempts');
    }
    getFrontendPortConfig() {
        return {
            preferredPort: 5173,
            fallbackPorts: [5174, 5175, 5176, 3000, 3001],
            maxAttempts: 10
        };
    }
    getBackendPortConfig() {
        return {
            preferredPort: 3000,
            fallbackPorts: [3001, 3002, 8000, 8080],
            maxAttempts: 5
        };
    }
    async killProcessOnPort(port) {
        try {
            return new Promise((resolve) => {
                (0, child_process_1.exec)(`netstat -ano | findstr :${port}`, (error, stdout) => {
                    if (error || !stdout.trim()) {
                        resolve(false);
                        return;
                    }
                    const lines = stdout.trim().split('\n');
                    const pids = new Set();
                    lines.forEach(line => {
                        const parts = line.trim().split(/\s+/);
                        if (parts.length >= 5) {
                            const pid = parts[parts.length - 1];
                            if (pid && pid !== '0') {
                                pids.add(pid);
                            }
                        }
                    });
                    if (pids.size === 0) {
                        resolve(false);
                        return;
                    }
                    let killedCount = 0;
                    const totalPids = pids.size;
                    pids.forEach(pid => {
                        (0, child_process_1.exec)(`taskkill /PID ${pid} /F`, (killError) => {
                            if (!killError) {
                                killedCount++;
                                logger_1.logger.info(`Killed process ${pid} on port ${port}`, 'portManager');
                            }
                            if (killedCount + (totalPids - killedCount) === totalPids) {
                                resolve(killedCount > 0);
                            }
                        });
                    });
                });
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to kill process on port', 'portManager', { error: String(error) });
            return false;
        }
    }
}
exports.PortManager = PortManager;
exports.default = PortManager;
//# sourceMappingURL=portManager.js.map