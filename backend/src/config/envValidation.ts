import { config } from 'dotenv';

// Load environment variables
config();

interface RequiredEnvVars {
  NODE_ENV: string;
  PORT: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  DATABASE_URL: string;
}

interface OptionalEnvVars {
  JWT_SECRET?: string;
  CORS_ORIGIN?: string;
  CORS_METHODS?: string;
  CORS_CREDENTIALS?: string;
  RATE_LIMIT_WINDOW_MS?: string;
  RATE_LIMIT_MAX?: string;
  LOG_LEVEL?: string;
  ENABLE_DEBUG_LOGS?: string;
  WEBSOCKET_PATH?: string;
  DB_POOL_MAX?: string;
  DB_POOL_IDLE_TIMEOUT?: string;
  DB_POOL_CONNECTION_TIMEOUT?: string;
  DB_RETRY_DELAY?: string;
  DB_MAX_RETRIES?: string;
}

const requiredEnvVars: (keyof RequiredEnvVars)[] = [
  'NODE_ENV',
  'PORT',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
];

const optionalEnvVars: (keyof OptionalEnvVars)[] = [
  'JWT_SECRET',
  'CORS_ORIGIN',
  'CORS_METHODS',
  'CORS_CREDENTIALS',
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX',
  'LOG_LEVEL',
  'ENABLE_DEBUG_LOGS',
  'WEBSOCKET_PATH',
  'DB_POOL_MAX',
  'DB_POOL_IDLE_TIMEOUT',
  'DB_POOL_CONNECTION_TIMEOUT',
  'DB_RETRY_DELAY',
  'DB_MAX_RETRIES',
];

/**
 * Validates environment variables based on required and optional lists
 * Throws an error if any required variables are missing or invalid
 * Supports different validation levels based on environment
 */
export const validateEnvironment = (): void => {
  const missingVars: string[] = [];
  const invalidVars: string[] = [];

  // Check required environment variables - strict validation for security
  requiredEnvVars.forEach((varName) => {
    const value = process.env[varName];
    if (!value) {
      missingVars.push(varName);
    }
  });

  // Report missing variables
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    console.error('💡 Please check your .env file and ensure all required variables are set');
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate specific formats
  if (process.env.PORT && isNaN(Number(process.env.PORT))) {
    invalidVars.push('PORT must be a number');
  }

  if (
    process.env.SUPABASE_URL &&
    !process.env.SUPABASE_URL.startsWith('https://')
  ) {
    invalidVars.push('SUPABASE_URL must be a valid HTTPS URL');
  }

  if (
    process.env.SUPABASE_ANON_KEY &&
    process.env.SUPABASE_ANON_KEY.length < 20
  ) {
    invalidVars.push('SUPABASE_ANON_KEY appears to be invalid');
  }

  if (
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY.length < 20
  ) {
    invalidVars.push('SUPABASE_SERVICE_ROLE_KEY appears to be invalid');
  }

  if (
    process.env.DATABASE_URL &&
    !process.env.DATABASE_URL.startsWith('postgres://') &&
    !process.env.DATABASE_URL.startsWith('postgresql://')
  ) {
    // Additional check for URL-encoded strings
    const decodedUrl = decodeURIComponent(process.env.DATABASE_URL);
    if (!decodedUrl.startsWith('postgres://') && !decodedUrl.startsWith('postgresql://')) {
      invalidVars.push(
        'DATABASE_URL must be a valid PostgreSQL connection string'
      );
    }
  }

  // Report errors
  if (missingVars.length > 0) {
    console.error(
      '❌ Missing required environment variables:',
      missingVars.join(', ')
    );
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }

  if (invalidVars.length > 0) {
    console.error('❌ Invalid environment variables:', invalidVars.join(', '));
    throw new Error(`Invalid environment variables: ${invalidVars.join(', ')}`);
  }

  // Log successful validation
  console.log('✅ Environment variables validated successfully');

  // Log optional variables that are missing (for development guidance)
  const missingOptional = optionalEnvVars.filter(
    (varName) => !process.env[varName]
  );
  if (missingOptional.length > 0) {
    console.log(
      'ℹ️  Optional environment variables not set:',
      missingOptional.join(', ')
    );
  }
};

/**
 * Gets an environment variable with type safety
 * @param name - The name of the environment variable
 * @param defaultValue - Optional default value if the variable is not set
 * @returns The value of the environment variable or the default value
 * @throws Error if the variable is required but not set
 */
export const getEnvVar = (name: string, defaultValue?: string): string => {
  const value = process.env[name];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${name} is required but not set`);
  }
  return value || defaultValue!;
};

/**
 * Gets an environment variable as a number with type safety
 * @param name - The name of the environment variable
 * @param defaultValue - Optional default value if the variable is not set
 * @returns The numeric value of the environment variable or the default value
 * @throws Error if the variable is required but not set or is not a valid number
 */
export const getEnvNumber = (name: string, defaultValue?: number): number => {
  const value = process.env[name];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${name} is required but not set`);
  }
  const numValue = value ? Number(value) : defaultValue!;
  if (isNaN(numValue)) {
    throw new Error(`Environment variable ${name} must be a valid number`);
  }
  return numValue;
};

/**
 * Gets an environment variable as a boolean with type safety
 * @param name - The name of the environment variable
 * @param defaultValue - Optional default value if the variable is not set
 * @returns The boolean value of the environment variable or the default value
 * @throws Error if the variable is required but not set
 */
export const getEnvBoolean = (
  name: string,
  defaultValue?: boolean
): boolean => {
  const value = process.env[name];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${name} is required but not set`);
  }
  if (!value) return defaultValue!;
  return value.toLowerCase() === 'true' || value === '1';
};

/**
 * Gets an environment variable as a string array
 * @param name - The name of the environment variable
 * @param separator - The separator used to split the string into an array (default: ',')
 * @param defaultValue - Optional default value if the variable is not set
 * @returns The array value of the environment variable or the default value
 */
export const getEnvArray = (
  name: string,
  separator = ',',
  defaultValue?: string[]
): string[] => {
  const value = process.env[name];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${name} is required but not set`);
  }
  if (!value) return defaultValue!;
  return value.split(separator).map(item => item.trim());
};
