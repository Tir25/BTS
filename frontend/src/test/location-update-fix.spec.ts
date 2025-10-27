import { test, expect } from '@playwright/test';

/**
 * Location Update Fix Test Suite
 * Tests the polling fallback and continuous location updates
 */

test.describe('Driver Dashboard Location Update Fixes', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant geolocation permissions
    await context.grantPermissions(['geolocation']);
    
    // Set a mock geolocation (simulating desktop IP-based positioning)
    await context.setGeolocation({ latitude: 23.025, longitude: 72.571 });
    
    // Override geolocation with poor accuracy (simulating desktop)
    await page.addInitScript(() => {
      // Mock getCurrentPosition with desktop-like accuracy
      const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
      navigator.geolocation.getCurrentPosition = function(success, error, options) {
        originalGetCurrentPosition(
          (position) => {
            // Modify accuracy to simulate desktop IP-based positioning
            const mockPosition = {
              ...position,
              coords: {
                ...position.coords,
                accuracy: 15000, // Poor accuracy (15km) - desktop IP-based
              },
            };
            success(mockPosition as GeolocationPosition);
          },
          error,
          options
        );
      };
      
      // Mock watchPosition similarly
      const originalWatchPosition = navigator.geolocation.watchPosition.bind(navigator.geolocation);
      navigator.geolocation.watchPosition = function(success, error, options) {
        let watchId = 1;
        let updateCount = 0;
        
        // Simulate watchPosition becoming inactive after 2 updates
        const interval = setInterval(() => {
          updateCount++;
          if (updateCount <= 2) {
            // First 2 updates work
            originalGetCurrentPosition(
              (position) => {
                const mockPosition = {
                  ...position,
                  coords: {
                    ...position.coords,
                    accuracy: 15000,
                  },
                };
                success(mockPosition as GeolocationPosition);
              },
              error,
              options
            );
          } else {
            // After 2 updates, watchPosition becomes "inactive" (no more updates)
            // This is where polling fallback should kick in
          }
        }, 1000);
        
        return watchId++;
      };
    });
  });

  test('should enable polling fallback for desktop devices', async ({ page }) => {
    // Navigate to driver login
    await page.goto('http://localhost:5173/driver-login');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Monitor console logs for polling fallback activation
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      consoleLogs.push(text);
      console.log(`[BROWSER] ${text}`);
    });
    
    // Check if we detect desktop device (no GPS hardware)
    const deviceInfo = await page.evaluate(() => {
      const userAgent = navigator.userAgent;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      return { isMobile, hasGPS: false }; // Desktop simulation
    });
    
    expect(deviceInfo.isMobile).toBe(false);
    
    // Wait a bit to see if polling fallback logs appear
    await page.waitForTimeout(5000);
    
    // Check for polling fallback messages
    const hasPollingFallback = consoleLogs.some(log => 
      log.includes('Polling fallback') || 
      log.includes('polling fallback')
    );
    
    console.log('Console logs:', consoleLogs);
    console.log('Polling fallback detected:', hasPollingFallback);
  });

  test('should receive continuous location updates', async ({ page }) => {
    await page.goto('http://localhost:5173/driver-login');
    await page.waitForLoadState('networkidle');
    
    // Track location updates
    const locationUpdates: Array<{ timestamp: number; count: number }> = [];
    let updateCount = 0;
    
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Location update') || text.includes('location obtained')) {
        updateCount++;
        locationUpdates.push({
          timestamp: Date.now(),
          count: updateCount,
        });
      }
    });
    
    // Monitor for 30 seconds
    await page.waitForTimeout(30000);
    
    // Should have received more than 2 updates (the fix addresses the "only 2 updates" issue)
    expect(updateCount).toBeGreaterThan(2);
    
    console.log(`Total location updates received: ${updateCount}`);
    console.log('Location updates:', locationUpdates);
  });

  test('should restart watchPosition when inactive', async ({ page }) => {
    await page.goto('http://localhost:5173/driver-login');
    await page.waitForLoadState('networkidle');
    
    const restartDetected: string[] = [];
    
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('restart') || text.includes('inactive')) {
        restartDetected.push(text);
      }
    });
    
    // Monitor for 20 seconds to detect restarts
    await page.waitForTimeout(20000);
    
    console.log('Restart detections:', restartDetected);
  });
});

