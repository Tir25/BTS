/**
 * Environment Configuration for User Service
 */

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
  redis: {
    url: string;
    maxRetries: number;
    retryDelay: number;
  };
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  cors: {
    allowedOrigins: (string | RegExp)[];
  };
  serviceDiscovery: {
    consulUrl: string;
    serviceName: string;
    servicePort: number;
    healthCheckInterval: number;
  };
  metrics: {
    prometheusPort: number;
    collectDefaultMetrics: boolean;
  };
}

const getEnvVar = (key: string, defaultValue: string = ''): string => {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value || defaultValue;
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }
  return parsed;
};

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

export const config: EnvironmentConfig = {
  port: getEnvNumber('USER_SERVICE_PORT', 3001),
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  database: {
    url: getEnvVar('USER_DATABASE_URL', 'postgresql://postgres:password@localhost:5432/user_service'),
    poolMax: getEnvNumber('USER_DB_POOL_MAX', 10),
    poolIdleTimeout: getEnvNumber('USER_DB_POOL_IDLE_TIMEOUT', 30000),
    poolConnectionTimeout: getEnvNumber('USER_DB_POOL_CONNECTION_TIMEOUT', 10000),
    retryDelay: getEnvNumber('USER_DB_RETRY_DELAY', 5000),
    maxRetries: getEnvNumber('USER_DB_MAX_RETRIES', 3),
  },
  redis: {
    url: getEnvVar('USER_REDIS_URL', 'redis://localhost:6379'),
    maxRetries: getEnvNumber('USER_REDIS_MAX_RETRIES', 3),
    retryDelay: getEnvNumber('USER_REDIS_RETRY_DELAY', 1000),
  },
  supabase: {
    url: getEnvVar('SUPABASE_URL', ''),
    anonKey: getEnvVar('SUPABASE_ANON_KEY', ''),
    serviceRoleKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY', ''),
  },
  cors: {
    allowedOrigins: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(origin => {
          origin = origin.trim();
          if (origin.startsWith('/') && origin.endsWith('/')) {
            return new RegExp(origin.slice(1, -1));
          }
          return origin;
        })
      : [
          'http://localhost:5173',
          'http://localhost:5174',
          'http://localhost:3000',
          'http://localhost:3001',
        ],
  },
  serviceDiscovery: {
    consulUrl: getEnvVar('CONSUL_URL', 'http://localhost:8500'),
    serviceName: 'user-service',
    servicePort: getEnvNumber('USER_SERVICE_PORT', 3001),
    healthCheckInterval: getEnvNumber('HEALTH_CHECK_INTERVAL', 30000),
  },
  metrics: {
    prometheusPort: getEnvNumber('PROMETHEUS_PORT', 9090),
    collectDefaultMetrics: getEnvBoolean('COLLECT_DEFAULT_METRICS', true),
  },
};

export default config;
