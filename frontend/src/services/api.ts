/**
 * Central API service
 * Provides minimal, reusable HTTP helpers (get/post/put/delete) with base URL and auth token injection.
 * Keep request/response shaping at call sites or domain services.
 */
import { environment } from '../config/environment';
import { authService } from './authService';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp?: string;
}

/**
 * Safely join baseUrl and endpoint, handling trailing/leading slashes
 * PRODUCTION FIX: Prevents double-slash URLs that cause 404 errors
 */
function joinUrl(baseUrl: string, endpoint: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${normalizedBase}${normalizedEndpoint}`;
}

async function request<T>(
  path: string,
  method: HttpMethod = 'GET',
  body?: unknown,
  init?: RequestInit
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };

  try {
    const token = authService.getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } catch {}

  // PRODUCTION FIX: Use safe URL join to prevent double-slash issues
  const baseUrl = environment.api.baseUrl.replace(/\/+$/, '');
  const url = joinUrl(baseUrl, path);
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string, init?: RequestInit) => request<T>(path, 'GET', undefined, init),
  post: <T>(path: string, body?: unknown, init?: RequestInit) => request<T>(path, 'POST', body, init),
  put: <T>(path: string, body?: unknown, init?: RequestInit) => request<T>(path, 'PUT', body, init),
  delete: <T>(path: string, init?: RequestInit) => request<T>(path, 'DELETE', undefined, init),
};

export default api;


