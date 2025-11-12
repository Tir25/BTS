/**
 * Hook for loading and managing bus data
 */
import { useEffect, useState } from 'react';
import { logger } from '../../../utils/logger';
import { apiService } from '../../../api';
import { BusInfo, BusLocation } from '../../../types';
import { convertBusToBusInfo } from '../utils/busInfoConverter';

export interface UseBusDataLoadingProps {
  busInfoCache: React.MutableRefObject<Map<string, BusInfo>>;
  setBuses: (buses: BusInfo[]) => void;
  lastBusLocations: { [busId: string]: BusLocation };
  busIdAliases: React.MutableRefObject<Map<string, string>>;
}

/**
 * Manages bus data loading and caching
 */
export function useBusDataLoading({
  busInfoCache,
  setBuses,
  lastBusLocations,
  busIdAliases,
}: UseBusDataLoadingProps): {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
} {
  const [isLoading, setIsLoading] = useState(true);

  // Load buses from API on component mount
  useEffect(() => {
    let isMounted = true;
    
    const loadBuses = async () => {
      try {
        logger.info('🔄 Loading buses from API...', 'useBusDataLoading');
        const response = await apiService.getAllBuses();
        
        if (!isMounted) return;
        
        if (response.success && response.data && Array.isArray(response.data)) {
          // Convert API buses to BusInfo format (lastBusLocations will be empty on initial load, which is fine)
          const busesInfo: BusInfo[] = response.data.map(apiBus => convertBusToBusInfo(apiBus, lastBusLocations));
          
          setBuses(busesInfo);
          logger.info('✅ Buses loaded successfully', 'useBusDataLoading', { 
            count: busesInfo.length 
          });
          
          // Update cache with loaded buses
          busesInfo.forEach(bus => {
            const busId = bus.busId;
            busInfoCache.current.set(busId, bus);
            
            // Also cache by other possible IDs
            const apiBus = response.data.find((b: any) => 
              (b.id === busId || b.bus_id === busId) ||
              (b.bus_number === bus.busNumber || b.code === bus.busNumber)
            );
            if (apiBus) {
              const altId = (apiBus as any).id || (apiBus as any).bus_id;
              if (altId && altId !== busId) {
                busInfoCache.current.set(altId, bus);
                busIdAliases.current.set(altId, busId);
              }
            }
          });
          
          setIsLoading(false);
        } else {
          logger.warn('⚠️ No buses data received or invalid format', 'useBusDataLoading', {
            success: response.success,
            hasData: !!response.data,
            isArray: Array.isArray(response.data)
          });
          if (isMounted) setIsLoading(false);
        }
      } catch (error) {
        logger.error('❌ Failed to load buses', 'useBusDataLoading', { 
          error: error instanceof Error ? error.message : String(error)
        });
        if (isMounted) setIsLoading(false);
      }
    };
    
    loadBuses();
    
    return () => {
      isMounted = false;
    };
    // Only load once on mount - lastBusLocations will be empty initially, which is fine
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isLoading,
    setIsLoading,
  };
}

