// Sensor Fusion for Improved Location Accuracy
// Combines GPS, accelerometer, gyroscope, and network data for better positioning

export interface SensorData {
  timestamp: number;
  type: 'gps' | 'accelerometer' | 'gyroscope' | 'magnetometer' | 'network';
  accuracy?: number;
  data: any;
}

export interface GPSData {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface AccelerometerData {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

export interface GyroscopeData {
  alpha: number; // rotation around z-axis
  beta: number;  // rotation around x-axis
  gamma: number; // rotation around y-axis
  timestamp: number;
}

export interface MagnetometerData {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

export interface NetworkData {
  cellTowers: Array<{
    cellId: number;
    locationAreaCode: number;
    mobileCountryCode: number;
    mobileNetworkCode: number;
    signalStrength: number;
  }>;
  wifiAccessPoints: Array<{
    macAddress: string;
    signalStrength: number;
    ssid?: string;
  }>;
  timestamp: number;
}

export interface FusedLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy: number;
  confidence: number; // 0-1, higher is better
  heading?: number;
  speed?: number;
  timestamp: number;
  sources: string[]; // Which sensors contributed
}

export interface SensorFusionConfig {
  // Kalman filter parameters
  kalman: {
    processNoise: number;
    measurementNoise: number;
    initialCovariance: number;
  };
  
  // Weighting factors for different sensors
  weights: {
    gps: number;
    accelerometer: number;
    gyroscope: number;
    magnetometer: number;
    network: number;
  };
  
  // Accuracy thresholds
  thresholds: {
    gps: number; // meters
    network: number; // meters
    accelerometer: number; // m/s²
    gyroscope: number; // rad/s
  };
  
  // Time windows
  timeWindows: {
    gps: number; // ms
    network: number; // ms
    motion: number; // ms
  };
}

class SensorFusionEngine {
  private config: SensorFusionConfig;
  private sensorHistory: Map<string, SensorData[]> = new Map();
  private kalmanState: {
    position: { lat: number; lng: number };
    velocity: { lat: number; lng: number };
    covariance: number[][];
  } | null = null;
  private lastFusedLocation: FusedLocation | null = null;
  private motionState: 'stationary' | 'walking' | 'driving' | 'unknown' = 'unknown';

  constructor(config: Partial<SensorFusionConfig> = {}) {
    this.config = {
      kalman: {
        processNoise: 0.1,
        measurementNoise: 1.0,
        initialCovariance: 10.0
      },
      weights: {
        gps: 0.7,
        accelerometer: 0.1,
        gyroscope: 0.1,
        magnetometer: 0.05,
        network: 0.05
      },
      thresholds: {
        gps: 10, // 10 meters
        network: 100, // 100 meters
        accelerometer: 0.5, // 0.5 m/s²
        gyroscope: 0.1 // 0.1 rad/s
      },
      timeWindows: {
        gps: 5000, // 5 seconds
        network: 10000, // 10 seconds
        motion: 2000 // 2 seconds
      },
      ...config
    };
  }

  // Add sensor data to the fusion engine
  addSensorData(data: SensorData): void {
    const history = this.sensorHistory.get(data.type) || [];
    history.push(data);
    
    // Keep only recent data within time window
    const timeWindow = this.getTimeWindow(data.type);
    const cutoff = Date.now() - timeWindow;
    const filteredHistory = history.filter(d => d.timestamp >= cutoff);
    
    this.sensorHistory.set(data.type, filteredHistory);
    
    // Update motion state based on accelerometer data
    if (data.type === 'accelerometer') {
      this.updateMotionState(data as SensorData & { data: AccelerometerData });
    }
  }

  // Get time window for sensor type
  private getTimeWindow(type: string): number {
    switch (type) {
      case 'gps': return this.config.timeWindows.gps;
      case 'network': return this.config.timeWindows.network;
      case 'accelerometer':
      case 'gyroscope':
      case 'magnetometer': return this.config.timeWindows.motion;
      default: return 5000;
    }
  }

  // Update motion state based on accelerometer data
  private updateMotionState(accelData: SensorData & { data: AccelerometerData }): void {
    const { x, y, z } = accelData.data;
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    
    // Simple motion detection based on acceleration magnitude
    if (magnitude < 0.5) {
      this.motionState = 'stationary';
    } else if (magnitude < 2.0) {
      this.motionState = 'walking';
    } else if (magnitude < 5.0) {
      this.motionState = 'driving';
    } else {
      this.motionState = 'unknown';
    }
  }

  // Fuse all available sensor data to get best location estimate
  fuseLocation(): FusedLocation | null {
    const gpsData = this.getLatestGPSData();
    const networkData = this.getLatestNetworkData();
    const motionData = this.getLatestMotionData();
    
    if (!gpsData && !networkData) {
      return null;
    }

    // Start with best available position
    let fusedLat: number, fusedLng: number, fusedAccuracy: number;
    let confidence = 0;
    const sources: string[] = [];

    if (gpsData && gpsData.accuracy <= this.config.thresholds.gps) {
      // GPS is accurate enough
      fusedLat = gpsData.latitude;
      fusedLng = gpsData.longitude;
      fusedAccuracy = gpsData.accuracy;
      confidence += this.config.weights.gps;
      sources.push('gps');
    } else if (networkData) {
      // Use network positioning
      const networkPos = this.calculateNetworkPosition(networkData);
      fusedLat = networkPos.latitude;
      fusedLng = networkPos.longitude;
      fusedAccuracy = networkPos.accuracy;
      confidence += this.config.weights.network;
      sources.push('network');
    } else if (gpsData) {
      // GPS is available but not very accurate
      fusedLat = gpsData.latitude;
      fusedLng = gpsData.longitude;
      fusedAccuracy = gpsData.accuracy;
      confidence += this.config.weights.gps * 0.5; // Reduced weight
      sources.push('gps');
    } else {
      return null;
    }

    // Apply Kalman filtering if we have previous state
    if (this.kalmanState) {
      const kalmanResult = this.applyKalmanFilter(fusedLat, fusedLng, fusedAccuracy);
      fusedLat = kalmanResult.latitude;
      fusedLng = kalmanResult.longitude;
      fusedAccuracy = kalmanResult.accuracy;
      confidence = Math.min(confidence + 0.1, 1.0); // Kalman improves confidence
    }

    // Apply motion-based corrections
    if (motionData && this.motionState !== 'stationary') {
      const motionCorrected = this.applyMotionCorrection(fusedLat, fusedLng, motionData);
      fusedLat = motionCorrected.latitude;
      fusedLng = motionCorrected.longitude;
      confidence += this.config.weights.accelerometer + this.config.weights.gyroscope;
      sources.push('motion');
    }

    // Update Kalman state
    this.updateKalmanState(fusedLat, fusedLng, fusedAccuracy);

    const fusedLocation: FusedLocation = {
      latitude: fusedLat,
      longitude: fusedLng,
      accuracy: fusedAccuracy,
      confidence: Math.min(confidence, 1.0),
      timestamp: Date.now(),
      sources
    };

    // Add heading and speed if available
    if (gpsData?.heading !== undefined) {
      fusedLocation.heading = gpsData.heading;
    }
    if (gpsData?.speed !== undefined) {
      fusedLocation.speed = gpsData.speed;
    }

    this.lastFusedLocation = fusedLocation;
    return fusedLocation;
  }

  // Get latest GPS data
  private getLatestGPSData(): GPSData | null {
    const gpsHistory = this.sensorHistory.get('gps') || [];
    if (gpsHistory.length === 0) return null;
    
    const latest = gpsHistory[gpsHistory.length - 1];
    return latest.data as GPSData;
  }

  // Get latest network data
  private getLatestNetworkData(): NetworkData | null {
    const networkHistory = this.sensorHistory.get('network') || [];
    if (networkHistory.length === 0) return null;
    
    const latest = networkHistory[networkHistory.length - 1];
    return latest.data as NetworkData;
  }

  // Get latest motion data (accelerometer + gyroscope)
  private getLatestMotionData(): { accelerometer: AccelerometerData; gyroscope: GyroscopeData } | null {
    const accelHistory = this.sensorHistory.get('accelerometer') || [];
    const gyroHistory = this.sensorHistory.get('gyroscope') || [];
    
    if (accelHistory.length === 0 || gyroHistory.length === 0) return null;
    
    return {
      accelerometer: accelHistory[accelHistory.length - 1].data as AccelerometerData,
      gyroscope: gyroHistory[gyroHistory.length - 1].data as GyroscopeData
    };
  }

  // Calculate position from network data (simplified)
  private calculateNetworkPosition(networkData: NetworkData): { latitude: number; longitude: number; accuracy: number } {
    // This is a simplified implementation
    // In a real app, you'd use a geolocation service like Google's or Mozilla's
    
    // For now, return a rough estimate based on cell tower data
    const cellTower = networkData.cellTowers[0];
    if (cellTower) {
      // This is just a placeholder - real implementation would use cell tower database
      const baseLat = 40.7128; // NYC coordinates as example
      const baseLng = -74.0060;
      
      // Add some noise based on signal strength
      const noise = (100 - cellTower.signalStrength) / 1000;
      
      return {
        latitude: baseLat + (Math.random() - 0.5) * noise,
        longitude: baseLng + (Math.random() - 0.5) * noise,
        accuracy: this.config.thresholds.network
      };
    }
    
    // Fallback to WiFi positioning
    if (networkData.wifiAccessPoints.length > 0) {
      // Again, simplified - real implementation would use WiFi database
      return {
        latitude: 40.7128 + (Math.random() - 0.5) * 0.01,
        longitude: -74.0060 + (Math.random() - 0.5) * 0.01,
        accuracy: 50 // WiFi is generally more accurate than cell towers
      };
    }
    
    // Ultimate fallback
    return {
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 1000
    };
  }

  // Apply Kalman filter for position smoothing
  private applyKalmanFilter(lat: number, lng: number, accuracy: number): { latitude: number; longitude: number; accuracy: number } {
    if (!this.kalmanState) {
      // Initialize Kalman state
      this.kalmanState = {
        position: { lat, lng },
        velocity: { lat: 0, lng: 0 },
        covariance: [
          [this.config.kalman.initialCovariance, 0],
          [0, this.config.kalman.initialCovariance]
        ]
      };
      return { latitude: lat, longitude: lng, accuracy };
    }

    const dt = 1.0; // Time step (1 second)
    const { processNoise, measurementNoise } = this.config.kalman;

    // Predict step
    const predictedPosition = {
      lat: this.kalmanState.position.lat + this.kalmanState.velocity.lat * dt,
      lng: this.kalmanState.position.lng + this.kalmanState.velocity.lng * dt
    };

    // Update covariance
    const predictedCovariance = [
      [this.kalmanState.covariance[0][0] + processNoise, this.kalmanState.covariance[0][1]],
      [this.kalmanState.covariance[1][0], this.kalmanState.covariance[1][1] + processNoise]
    ];

    // Update step
    const innovation = {
      lat: lat - predictedPosition.lat,
      lng: lng - predictedPosition.lng
    };

    const innovationCovariance = predictedCovariance[0][0] + measurementNoise;
    const kalmanGain = predictedCovariance[0][0] / innovationCovariance;

    // Update state
    this.kalmanState.position = {
      lat: predictedPosition.lat + kalmanGain * innovation.lat,
      lng: predictedPosition.lng + kalmanGain * innovation.lng
    };

    this.kalmanState.covariance = [
      [(1 - kalmanGain) * predictedCovariance[0][0], (1 - kalmanGain) * predictedCovariance[0][1]],
      [(1 - kalmanGain) * predictedCovariance[1][0], (1 - kalmanGain) * predictedCovariance[1][1]]
    ];

    // Update velocity estimate
    this.kalmanState.velocity = {
      lat: innovation.lat / dt,
      lng: innovation.lng / dt
    };

    return {
      latitude: this.kalmanState.position.lat,
      longitude: this.kalmanState.position.lng,
      accuracy: Math.sqrt(this.kalmanState.covariance[0][0])
    };
  }

  // Apply motion-based corrections
  private applyMotionCorrection(lat: number, lng: number, motionData: { accelerometer: AccelerometerData; gyroscope: GyroscopeData }): { latitude: number; longitude: number } {
    const { accelerometer } = motionData;
    
    // Calculate movement direction from accelerometer
    const acceleration = Math.sqrt(accelerometer.x ** 2 + accelerometer.y ** 2 + accelerometer.z ** 2);
    
    if (acceleration < 0.5) {
      // Not moving significantly
      return { latitude: lat, longitude: lng };
    }
    
    // Apply small correction based on motion
    const correctionFactor = 0.00001; // Small correction
    const latCorrection = (accelerometer.x / 9.81) * correctionFactor;
    const lngCorrection = (accelerometer.y / 9.81) * correctionFactor;
    
    return {
      latitude: lat + latCorrection,
      longitude: lng + lngCorrection
    };
  }

  // Update Kalman state
  private updateKalmanState(lat: number, lng: number, accuracy: number): void {
    if (!this.kalmanState) {
      this.kalmanState = {
        position: { lat, lng },
        velocity: { lat: 0, lng: 0 },
        covariance: [
          [accuracy, 0],
          [0, accuracy]
        ]
      };
    }
  }

  // Get current motion state
  getMotionState(): string {
    return this.motionState;
  }

  // Get last fused location
  getLastFusedLocation(): FusedLocation | null {
    return this.lastFusedLocation;
  }

  // Reset the fusion engine
  reset(): void {
    this.sensorHistory.clear();
    this.kalmanState = null;
    this.lastFusedLocation = null;
    this.motionState = 'unknown';
  }

  // Update configuration
  updateConfig(newConfig: Partial<SensorFusionConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      kalman: { ...this.config.kalman, ...newConfig.kalman },
      weights: { ...this.config.weights, ...newConfig.weights },
      thresholds: { ...this.config.thresholds, ...newConfig.thresholds },
      timeWindows: { ...this.config.timeWindows, ...newConfig.timeWindows }
    };
  }
}

// Create singleton instance
export const sensorFusionEngine = new SensorFusionEngine();

// React hook for sensor fusion
export const useSensorFusion = (config?: Partial<SensorFusionConfig>) => {
  const engine = sensorFusionEngine;
  
  if (config) {
    engine.updateConfig(config);
  }

  const addGPSData = (data: GPSData) => {
    engine.addSensorData({
      timestamp: data.timestamp,
      type: 'gps',
      accuracy: data.accuracy,
      data
    });
  };

  const addAccelerometerData = (data: AccelerometerData) => {
    engine.addSensorData({
      timestamp: data.timestamp,
      type: 'accelerometer',
      data
    });
  };

  const addGyroscopeData = (data: GyroscopeData) => {
    engine.addSensorData({
      timestamp: data.timestamp,
      type: 'gyroscope',
      data
    });
  };

  const addMagnetometerData = (data: MagnetometerData) => {
    engine.addSensorData({
      timestamp: data.timestamp,
      type: 'magnetometer',
      data
    });
  };

  const addNetworkData = (data: NetworkData) => {
    engine.addSensorData({
      timestamp: data.timestamp,
      type: 'network',
      data
    });
  };

  const fuseLocation = () => engine.fuseLocation();
  const getMotionState = () => engine.getMotionState();
  const getLastFusedLocation = () => engine.getLastFusedLocation();
  const reset = () => engine.reset();

  return {
    addGPSData,
    addAccelerometerData,
    addGyroscopeData,
    addMagnetometerData,
    addNetworkData,
    fuseLocation,
    getMotionState,
    getLastFusedLocation,
    reset
  };
};

// Utility functions for sensor data collection
export const requestLocationPermission = async (): Promise<boolean> => {
  if (!navigator.geolocation) {
    return false;
  }

  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return permission.state === 'granted';
  } catch {
    return false;
  }
};

export const requestMotionPermission = async (): Promise<boolean> => {
  if (!navigator.permissions) {
    return false;
  }

  try {
    const permission = await navigator.permissions.query({ name: 'accelerometer' as PermissionName });
    return permission.state === 'granted';
  } catch {
    return false;
  }
};

// Export the engine instance for direct use
export { sensorFusionEngine as fusionEngine };
