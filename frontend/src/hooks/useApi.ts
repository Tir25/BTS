/**
 * useApi
 * Generic API hook that exposes typed get/post helpers with built-in
 * loading and user-friendly error state using centralized error handling.
 */
import { useCallback, useState } from 'react';
import { api } from '../services/api';
import { handleApiError, getUserMessage } from '../utils/errorHandler';

export function useApi<T = unknown>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const get = useCallback(async (path: string, init?: RequestInit): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<T>(path, init);
      return data;
    } catch (e) {
      const appError = handleApiError(e, path);
      setError(getUserMessage(appError));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const post = useCallback(async (path: string, body?: unknown, init?: RequestInit): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<T>(path, body, init);
      return data;
    } catch (e) {
      const appError = handleApiError(e, path);
      setError(getUserMessage(appError));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { get, post, loading, error };
}


