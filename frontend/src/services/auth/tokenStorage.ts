import { logger } from '../../utils/logger';

/**
 * Token storage utility for managing authentication tokens
 * Handles in-memory token caching with expiration tracking
 */
export class TokenStorage {
  private tokenCache: { token: string | null; expiresAt: number } = {
    token: null,
    expiresAt: 0
  };

  /**
   * Clear token cache
   */
  clearCache(): void {
    this.tokenCache = { token: null, expiresAt: 0 };
    logger.debug('🗑️ Token cache cleared', 'auth');
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(): boolean {
    if (!this.tokenCache.token || !this.tokenCache.expiresAt) {
      return true;
    }
    const now = Date.now();
    const bufferTime = 60 * 1000; // 1 minute buffer
    return now >= (this.tokenCache.expiresAt - bufferTime);
  }

  /**
   * Get cached token if valid
   */
  getCachedToken(): string | null {
    if (this.tokenCache.token && !this.isTokenExpired()) {
      return this.tokenCache.token;
    }
    return null;
  }

  /**
   * Cache token with expiration
   */
  cacheToken(token: string, expiresAt: number): void {
    this.tokenCache = {
      token,
      expiresAt: expiresAt * 1000 // Convert to milliseconds
    };
    
    logger.debug('🔑 Token cached', 'auth', {
      hasToken: !!token,
      expiresAt: new Date(this.tokenCache.expiresAt).toISOString()
    });
  }

  /**
   * Get current cache state (for debugging)
   */
  getCacheState() {
    return {
      hasToken: !!this.tokenCache.token,
      expiresAt: this.tokenCache.expiresAt ? new Date(this.tokenCache.expiresAt).toISOString() : null,
      isExpired: this.isTokenExpired()
    };
  }
}

// Export singleton instance
export const tokenStorage = new TokenStorage();

