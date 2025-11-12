/**
 * Hook for handling driver sign-out
 */
import { useCallback, useRef } from 'react';
import { logger } from '../../../utils/logger';
import { unifiedWebSocketService } from '../../../services/UnifiedWebSocketService';
import { authService } from '../../../services/authService';

export interface UseDriverSignOutProps {
  logout: () => Promise<void>;
  stopTracking?: () => void;
}

/**
 * Handles driver sign-out with cleanup
 */
export function useDriverSignOut({
  logout,
  stopTracking,
}: UseDriverSignOutProps) {
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  const handleSignOut = useCallback(async () => {
    try {
      logger.info('🚪 Driver sign-out initiated', 'useDriverSignOut');

      // Stop tracking first (soft-fail)
      try { 
        if (stopTracking) {
          stopTracking();
        }
      } catch (err) { 
        logger.warn('Tracking stop on signout failed', err ? String(err) : undefined); 
      }

      // Disconnect WebSocket (soft-fail)
      try { 
        await unifiedWebSocketService.disconnect?.(); 
      } catch (wsError) { 
        logger.warn('WebSocket signout disconnect error', wsError ? String(wsError) : undefined); 
      }

      // Context logout (use latest ref)
      try { 
        await logoutRef.current?.(); 
      } catch (err) { 
        logger.warn('Driver context logout not completed', err ? String(err) : undefined); 
      }

      // Global auth sign out (soft-fail)
      try { 
        await authService.signOut?.(); 
      } catch (err) { 
        logger.warn('authService.signOut failed', err ? String(err) : undefined); 
      }

      // Clear auth-related storage keys
      try {
        if (typeof localStorage !== 'undefined') {
          const localKeys: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('supabase') || key.includes('auth') || key.includes('sb-') || key.includes('driver_'))) {
              localKeys.push(key);
            }
          }
          localKeys.forEach(k => localStorage.removeItem(k));
        }
        if (typeof sessionStorage !== 'undefined') {
          const sessionKeys: string[] = [];
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && (key.includes('supabase') || key.includes('auth') || key.includes('sb-') || key.includes('driver_'))) {
              sessionKeys.push(key);
            }
          }
          sessionKeys.forEach(k => sessionStorage.removeItem(k));
        }
        logger.info('✅ All authentication-related storage cleared', 'useDriverSignOut');
      } catch (storageError) {
        logger.warn('⚠️ Error clearing storage during sign-out', storageError ? String(storageError) : undefined);
      }

      // Final redirect
      logger.info('🔄 Redirecting to /driver-login', 'useDriverSignOut');
      window.location.replace('/driver-login');
    } catch (err) {
      logger.error('❌ Sign-out fatal error', 'useDriverSignOut', { error: err ? String(err) : undefined });
      window.location.replace('/driver-login');
    }
  }, [stopTracking]);

  return {
    handleSignOut,
  };
}

