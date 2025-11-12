import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../config/supabase';
import { timeoutConfig } from '../../config/timeoutConfig';
import { logger } from '../../utils/logger';
import { tokenStorage } from './tokenStorage';

/**
 * Session management helpers
 * Handles session refresh, validation, and proactive refresh
 */
export class SessionHelpers {
  private isRefreshingSession = false;
  private sessionRefreshInterval: NodeJS.Timeout | null = null;

  /**
   * Check if session needs refresh and refresh proactively
   */
  async checkAndRefreshSession(
    currentSession: Session | null,
    onSessionUpdate: (session: Session | null, user: User | null) => void
  ): Promise<void> {
    // Prevent concurrent refresh attempts
    if (this.isRefreshingSession) {
      return;
    }

    if (!currentSession || !currentSession.expires_at) {
      logger.warn('⚠️ No current session detected - attempting recovery', 'auth');
      return;
    }

    const expiresAt = currentSession.expires_at * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    const refreshThreshold = timeoutConfig.session.refreshBeforeExpiry;

    // Handle expired sessions
    if (timeUntilExpiry <= 0) {
      logger.warn('⚠️ Session has expired - attempting refresh', 'auth', {
        expiredBy: `${Math.round(Math.abs(timeUntilExpiry) / 1000)  }s`,
      });

      this.isRefreshingSession = true;
      try {
        const result = await this.refreshSession();
        if (result.success && result.session) {
          logger.info('✅ Expired session refreshed successfully', 'auth');
          onSessionUpdate(result.session, result.user ?? null);
        } else {
          logger.error('❌ Failed to refresh expired session', 'auth', {
            error: result.error,
          });
        }
      } catch (error) {
        logger.error('❌ Error refreshing expired session', 'auth', {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        this.isRefreshingSession = false;
      }
      return;
    }

    // Refresh if session expires within the threshold
    if (timeUntilExpiry <= refreshThreshold && timeUntilExpiry > 0) {
      this.isRefreshingSession = true;
      logger.info('🔄 Proactively refreshing session before expiry', 'auth', {
        timeUntilExpiry: `${Math.round(timeUntilExpiry / 1000)  }s`,
      });

      try {
        const result = await this.refreshSession();
        if (result.success && result.session) {
          logger.info('✅ Proactive session refresh successful', 'auth');
          onSessionUpdate(result.session, result.user ?? null);
        } else {
          logger.warn('⚠️ Proactive session refresh failed', 'auth', {
            error: result.error,
          });
        }
      } catch (error) {
        logger.error('❌ Error during proactive session refresh', 'auth', {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        this.isRefreshingSession = false;
      }
    }
  }

  /**
   * Refresh session with proper race condition protection
   */
  async refreshSession(): Promise<{
    success: boolean;
    session?: Session;
    user?: User;
    error?: string;
  }> {
    // Prevent concurrent refresh attempts
    if (this.isRefreshingSession) {
      logger.debug('🔄 Session refresh already in progress', 'auth');
      return { success: false, error: 'Refresh already in progress' };
    }

    try {
      this.isRefreshingSession = true;
      logger.info('🔄 Starting session refresh', 'auth');

      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        if (error.message.includes('Auth session missing')) {
          logger.debug('🔄 No session to refresh (expected for unauthenticated users)', 'auth');
          return { success: false, error: 'No session to refresh' };
        }
        logger.error('❌ Session refresh error', 'auth', { error: error.message });
        return { success: false, error: error.message };
      }

      if (data.session) {
        // Clear token cache after refresh
        tokenStorage.clearCache();
        logger.info('✅ Session refreshed successfully', 'auth');
        return { success: true, session: data.session, user: data.user };
      }

      return { success: false, error: 'Session refresh failed' };
    } catch (error) {
      logger.error('❌ Session refresh error', 'auth', { error: String(error) });
      return { success: false, error: 'Network error during session refresh' };
    } finally {
      this.isRefreshingSession = false;
    }
  }

  /**
   * Start proactive session refresh interval
   */
  startProactiveRefresh(
    currentSession: Session | null,
    onSessionUpdate: (session: Session | null, user: User | null) => void
  ): void {
    // Stop existing interval if any
    this.stopProactiveRefresh();

    // Start checking session expiry periodically
    this.sessionRefreshInterval = setInterval(() => {
      this.checkAndRefreshSession(currentSession, onSessionUpdate);
    }, timeoutConfig.session.checkInterval);

    logger.info('✅ Proactive session refresh started', 'auth', {
      checkInterval: `${timeoutConfig.session.checkInterval / 1000  }s`,
      refreshThreshold: `${timeoutConfig.session.refreshBeforeExpiry / 1000  }s`,
    });
  }

  /**
   * Stop proactive session refresh interval
   */
  stopProactiveRefresh(): void {
    if (this.sessionRefreshInterval) {
      clearInterval(this.sessionRefreshInterval);
      this.sessionRefreshInterval = null;
      logger.info('🛑 Proactive session refresh stopped', 'auth');
    }
  }

  /**
   * Validate token for API calls
   */
  async validateTokenForAPI(
    currentSession: Session | null
  ): Promise<{
    valid: boolean;
    token: string | null;
    refreshed: boolean;
  }> {
    // Prevent concurrent validation calls
    if (this.isRefreshingSession) {
      logger.debug('🔄 Session refresh in progress, waiting...', 'auth');
      // Wait for current refresh to complete
      while (this.isRefreshingSession) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    let token = currentSession?.access_token || null;
    let refreshed = false;

    if (!token) {
      return { valid: false, token: null, refreshed: false };
    }

    try {
      // Validate the current token
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        logger.debug('🔄 Token validation failed, attempting refresh', 'auth', { error: error?.message });

        // Try to refresh the session
        const refreshResult = await this.refreshSession();
        if (refreshResult.success && refreshResult.session) {
          token = refreshResult.session.access_token || null;
          refreshed = true;
          logger.info('✅ Token refreshed successfully', 'auth');
        } else {
          logger.warn('❌ Token refresh failed', 'auth', { error: refreshResult.error });
          return { valid: false, token: null, refreshed: false };
        }
      }

      return { valid: true, token, refreshed };
    } catch (error) {
      logger.error('❌ Token validation error', 'auth', { error: String(error) });
      return { valid: false, token: null, refreshed: false };
    }
  }
}

// Export singleton instance
export const sessionHelpers = new SessionHelpers();

