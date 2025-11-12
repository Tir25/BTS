import { useEffect } from 'react';
import { logger } from '../utils/logger';

/**
 * @deprecated This hook is deprecated. Use useDriverTracking hook instead.
 * Kept as a stub to surface a runtime warning when legacy code attempts to use it.
 */
export const useLocationWebSocketSync = () => {
  useEffect(() => {
    logger.warn(
      '⚠️ useLocationWebSocketSync is deprecated. Use useDriverTracking instead.',
      'deprecated-hook'
    );
  }, []);
};
