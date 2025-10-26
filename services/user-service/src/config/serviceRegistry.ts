/**
 * Service Registry for Microservices
 * Handles service discovery and registration
 */

import { logger } from '../utils/logger';
import config from './environment';

interface ServiceInstance {
  id: string;
  name: string;
  address: string;
  port: number;
  healthCheck: string;
  version: string;
  tags: string[];
  metadata: Record<string, any>;
}

interface ServiceRegistration {
  name: string;
  port: number;
  healthCheck: string;
  version: string;
}

class ServiceRegistry {
  private services: Map<string, ServiceInstance[]> = new Map();
  private registeredServices: Set<string> = new Set();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Register a service with the registry
   */
  public async register(service: ServiceRegistration): Promise<void> {
    try {
      const serviceId = `${service.name}-${Date.now()}`;
      const serviceInstance: ServiceInstance = {
        id: serviceId,
        name: service.name,
        address: 'localhost', // In production, this would be the actual IP
        port: service.port,
        healthCheck: service.healthCheck,
        version: service.version,
        tags: ['microservice', 'user-management'],
        metadata: {
          registeredAt: new Date().toISOString(),
          environment: config.nodeEnv,
        },
      };

      // Add to local registry
      if (!this.services.has(service.name)) {
        this.services.set(service.name, []);
      }
      this.services.get(service.name)!.push(serviceInstance);
      this.registeredServices.add(serviceId);

      // Start health check monitoring
      this.startHealthCheck(serviceId, serviceInstance);

      logger.info(`Service ${service.name} registered successfully`, 'serviceRegistry', {
        serviceId,
        port: service.port,
        healthCheck: service.healthCheck,
      });

    } catch (error) {
      logger.error('Failed to register service', 'serviceRegistry', { 
        error: (error as Error).message,
        service: service.name 
      });
      throw error;
    }
  }

  /**
   * Unregister a service from the registry
   */
  public async unregister(serviceName: string): Promise<void> {
    try {
      const serviceInstances = this.services.get(serviceName);
      if (serviceInstances) {
        for (const instance of serviceInstances) {
          // Stop health check
          const interval = this.healthCheckIntervals.get(instance.id);
          if (interval) {
            clearInterval(interval);
            this.healthCheckIntervals.delete(instance.id);
          }

          // Remove from registered services
          this.registeredServices.delete(instance.id);
        }
        this.services.delete(serviceName);
      }

      logger.info(`Service ${serviceName} unregistered successfully`, 'serviceRegistry');

    } catch (error) {
      logger.error('Failed to unregister service', 'serviceRegistry', { 
        error: (error as Error).message,
        service: serviceName 
      });
    }
  }

  /**
   * Discover available instances of a service
   */
  public discover(serviceName: string): ServiceInstance[] {
    const instances = this.services.get(serviceName) || [];
    
    // Filter out unhealthy instances
    const healthyInstances = instances.filter(instance => {
      // In a real implementation, this would check the health status
      return true;
    });

    logger.debug(`Discovered ${healthyInstances.length} instances for ${serviceName}`, 'serviceRegistry');
    return healthyInstances;
  }

  /**
   * Get a random healthy instance of a service
   */
  public getInstance(serviceName: string): ServiceInstance | null {
    const instances = this.discover(serviceName);
    if (instances.length === 0) {
      return null;
    }

    // Simple round-robin selection
    const randomIndex = Math.floor(Math.random() * instances.length);
    return instances[randomIndex];
  }

  /**
   * Check if a service is available
   */
  public isServiceAvailable(serviceName: string): boolean {
    const instances = this.discover(serviceName);
    return instances.length > 0;
  }

  /**
   * Get all registered services
   */
  public getAllServices(): Map<string, ServiceInstance[]> {
    return new Map(this.services);
  }

  /**
   * Start health check monitoring for a service
   */
  private startHealthCheck(serviceId: string, instance: ServiceInstance): void {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(instance.healthCheck, {
          method: 'GET',
          timeout: 5000,
        });

        if (!response.ok) {
          logger.warn(`Health check failed for ${instance.name}`, 'serviceRegistry', {
            serviceId,
            status: response.status,
            statusText: response.statusText,
          });
        }
      } catch (error) {
        logger.warn(`Health check error for ${instance.name}`, 'serviceRegistry', {
          serviceId,
          error: (error as Error).message,
        });
      }
    }, config.serviceDiscovery.healthCheckInterval);

    this.healthCheckIntervals.set(serviceId, interval);
  }

  /**
   * Get service statistics
   */
  public getStats(): {
    totalServices: number;
    totalInstances: number;
    registeredServices: string[];
  } {
    const totalServices = this.services.size;
    const totalInstances = Array.from(this.services.values()).reduce(
      (total, instances) => total + instances.length,
      0
    );
    const registeredServices = Array.from(this.registeredServices);

    return {
      totalServices,
      totalInstances,
      registeredServices,
    };
  }
}

// Global service registry instance
export const serviceRegistry = new ServiceRegistry();

export default serviceRegistry;
