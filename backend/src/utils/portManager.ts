import { createServer } from 'net';
import { exec } from 'child_process';
import { logger } from './logger';

export interface PortConfig {
  preferredPort: number;
  fallbackPorts: number[];
  maxAttempts: number;
}

export class PortManager {
  private static instance: PortManager;

  private constructor() {}

  static getInstance(): PortManager {
    if (!PortManager.instance) {
      PortManager.instance = new PortManager();
    }
    return PortManager.instance;
  }

  /**
   * Check if a port is available
   */
  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = createServer();
      
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

  /**
   * Find an available port from a list of preferred ports
   */
  public async findAvailablePort(config: PortConfig): Promise<number> {
    const { preferredPort, fallbackPorts, maxAttempts } = config;
    
    // Check preferred port first
    if (await this.isPortAvailable(preferredPort)) {
      logger.info(`Port ${preferredPort} is available`, 'portManager');
      return preferredPort;
    }

    logger.warn(`Port ${preferredPort} is in use, trying fallback ports...`, 'portManager');

    // Try fallback ports
    for (let i = 0; i < Math.min(fallbackPorts.length, maxAttempts); i++) {
      const port = fallbackPorts[i];
      if (await this.isPortAvailable(port)) {
        logger.info(`Found available port: ${port}`, 'portManager');
        return port;
      }
    }

    // If no fallback ports work, try random ports
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const randomPort = Math.floor(Math.random() * (65535 - 3000)) + 3000;
      if (await this.isPortAvailable(randomPort)) {
        logger.warn(`Using random available port: ${randomPort}`, 'portManager');
        return randomPort;
      }
    }

    throw new Error('No available ports found after maximum attempts');
  }

  /**
   * Get frontend port configuration
   */
  public getFrontendPortConfig(): PortConfig {
    return {
      preferredPort: 5173,
      fallbackPorts: [5174, 5175, 5176, 3000, 3001],
      maxAttempts: 10
    };
  }

  /**
   * Get backend port configuration
   */
  public getBackendPortConfig(): PortConfig {
    return {
      preferredPort: 3000,
      fallbackPorts: [3001, 3002, 8000, 8080],
      maxAttempts: 5
    };
  }

  /**
   * Kill process using a specific port (Windows)
   */
  public async killProcessOnPort(port: number): Promise<boolean> {
    try {
      
      return new Promise((resolve) => {
        exec(`netstat -ano | findstr :${port}`, (error: any, stdout: string) => {
          if (error || !stdout.trim()) {
            resolve(false);
            return;
          }

          const lines = stdout.trim().split('\n');
          const pids = new Set<string>();

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

          // Kill processes
          let killedCount = 0;
          const totalPids = pids.size;

          pids.forEach(pid => {
            exec(`taskkill /PID ${pid} /F`, (killError: any) => {
              if (!killError) {
                killedCount++;
                logger.info(`Killed process ${pid} on port ${port}`, 'portManager');
              }
              
              if (killedCount + (totalPids - killedCount) === totalPids) {
                resolve(killedCount > 0);
              }
            });
          });
        });
      });
    } catch (error) {
      logger.error('Failed to kill process on port', 'portManager', { error: String(error) });
      return false;
    }
  }
}

export default PortManager;
