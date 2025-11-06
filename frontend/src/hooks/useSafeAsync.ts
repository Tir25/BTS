import { useCallback } from 'react';
import { handleError, getUserMessage } from '../utils/errorHandler';

export function useSafeAsync() {
  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<{ data?: T; error?: string }> => {
    try {
      const data = await fn();
      return { data };
    } catch (e) {
      const appError = handleError(e, 'useSafeAsync');
      return { error: getUserMessage(appError) };
    }
  }, []);

  return { run };
}


