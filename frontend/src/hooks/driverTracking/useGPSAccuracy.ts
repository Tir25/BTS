/**
 * Hook for managing GPS accuracy state and messages
 */
import { useState, useRef } from 'react';
import { 
  categorizeAccuracy, 
  getAccuracyMessage, 
  detectGPSDeviceInfo,
  shouldWarnAboutAccuracy 
} from '../../utils/gpsDetection';

export interface GPSAccuracyState {
  accuracy?: number;
  accuracyLevel?: 'excellent' | 'good' | 'fair' | 'poor' | 'very-poor';
  accuracyMessage?: string;
  accuracyWarning?: boolean;
  deviceInfo: ReturnType<typeof detectGPSDeviceInfo>;
}

export interface GPSAccuracyActions {
  updateAccuracy: (accuracy: number) => void;
  resetAccuracy: () => void;
}

/**
 * Manages GPS accuracy state, level, messages, and warnings
 */
export function useGPSAccuracy(): GPSAccuracyState & GPSAccuracyActions {
  const [accuracy, setAccuracy] = useState<number | undefined>(undefined);
  const [accuracyLevel, setAccuracyLevel] = useState<'excellent' | 'good' | 'fair' | 'poor' | 'very-poor' | undefined>(undefined);
  const [accuracyMessage, setAccuracyMessage] = useState<string | undefined>(undefined);
  const [accuracyWarning, setAccuracyWarning] = useState(false);
  const deviceInfoRef = useRef(detectGPSDeviceInfo());

  const updateAccuracy = (newAccuracy: number) => {
    setAccuracy(newAccuracy);
    const category = categorizeAccuracy(newAccuracy);
    setAccuracyLevel(category.level);
    
    const accuracyMsg = getAccuracyMessage(newAccuracy, deviceInfoRef.current);
    setAccuracyMessage(accuracyMsg.message);
    setAccuracyWarning(shouldWarnAboutAccuracy(newAccuracy, deviceInfoRef.current));
  };

  const resetAccuracy = () => {
    setAccuracy(undefined);
    setAccuracyLevel(undefined);
    setAccuracyMessage(undefined);
    setAccuracyWarning(false);
  };

  return {
    accuracy,
    accuracyLevel,
    accuracyMessage,
    accuracyWarning,
    deviceInfo: deviceInfoRef.current,
    updateAccuracy,
    resetAccuracy,
  };
}

