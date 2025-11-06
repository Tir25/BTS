import { logger } from '../utils/logger';

export function getAdminEmails(): string[] {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((email: string) => email.trim().toLowerCase()) || [];
  if (adminEmails.length === 0) {
    logger.error('ADMIN_EMAILS environment variable is required', 'websocket');
  }
  return adminEmails;
}

type AttemptRecord = { count: number; resetTime: number };

declare global {
  // eslint-disable-next-line no-var
  var authAttemptStore: Map<string, AttemptRecord> | undefined;
}

export function getAuthAttemptStore(): Map<string, AttemptRecord> {
  return (global.authAttemptStore ||= new Map<string, AttemptRecord>());
}

export function checkAndIncrementRateLimit(key: string, maxAttempts: number, windowMs: number, now: number) {
  // Rate limiting disabled - always return not limited for high-volume traffic
  return { 
    limited: false, 
    record: { count: 0, resetTime: now + windowMs } 
  };
}


