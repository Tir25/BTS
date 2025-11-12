/**
 * Hook for managing bus ID aliases and canonical bus ID resolution
 */
import { useRef, useCallback } from 'react';
import { logger } from '../../../utils/logger';
import { BusInfo } from '../../../types';

export interface UseBusIdManagementProps {
  buses?: BusInfo[];
}

export interface UseBusIdManagementReturn {
  busIdAliases: React.MutableRefObject<Map<string, string>>;
  busInfoCache: React.MutableRefObject<Map<string, BusInfo>>;
  pendingBusFetches: React.MutableRefObject<Set<string>>;
  getCanonicalBusId: (incomingId: string) => string;
  setBusAlias: (incomingId: string, canonicalId: string) => void;
}

/**
 * Manages bus ID aliases and canonical bus ID resolution
 */
export function useBusIdManagement({ buses = [] }: UseBusIdManagementProps = {}): UseBusIdManagementReturn {
  const busIdAliases = useRef<Map<string, string>>(new Map());
  const busInfoCache = useRef<Map<string, BusInfo>>(new Map());
  const pendingBusFetches = useRef<Set<string>>(new Set());

  // Resolve canonical bus ID
  const getCanonicalBusId = useCallback((incomingId: string): string => {
    // 1) If we already mapped it, return cached canonical id
    const existing = busIdAliases.current.get(incomingId);
    if (existing) {
      return existing;
    }

    // 2) Check if incomingId itself is in cache (it's already canonical)
    if (busInfoCache.current.has(incomingId)) {
      busIdAliases.current.set(incomingId, incomingId);
      return incomingId;
    }

    // 3) Try direct match with loaded buses array
    const direct = buses.find(b => 
      (b as any).id === incomingId || 
      b.busId === incomingId || 
      (b as any).bus_id === incomingId ||
      b.busNumber === incomingId
    );
    if (direct) {
      const canonical = (direct as any).id || direct.busId || (direct as any).bus_id || incomingId;
      busIdAliases.current.set(incomingId, canonical);
      busInfoCache.current.set(canonical, direct);
      return canonical;
    }

    // 4) Try to find a match in cache by bus number or other identifiers
    for (const [cacheKey, busInfo] of busInfoCache.current.entries()) {
      // Exact match
      if (cacheKey === incomingId) {
        busIdAliases.current.set(incomingId, cacheKey);
        return cacheKey;
      }

      // Bus number match
      if (busInfo.busNumber === incomingId) {
        busIdAliases.current.set(incomingId, cacheKey);
        return cacheKey;
      }

      // String match
      if (String(cacheKey) === String(incomingId)) {
        busIdAliases.current.set(incomingId, cacheKey);
        return cacheKey;
      }

      // Partial match
      if (cacheKey.includes(incomingId) || incomingId.includes(cacheKey)) {
        busIdAliases.current.set(incomingId, cacheKey);
        return cacheKey;
      }
    }

    // 5) No match found - use incomingId as canonical (first time we see this bus)
    busIdAliases.current.set(incomingId, incomingId);
    return incomingId;
  }, [buses]);

  // Set bus alias
  const setBusAlias = useCallback((incomingId: string, canonicalId: string) => {
    busIdAliases.current.set(incomingId, canonicalId);
  }, []);

  return {
    busIdAliases,
    busInfoCache,
    pendingBusFetches,
    getCanonicalBusId,
    setBusAlias,
  };
}

