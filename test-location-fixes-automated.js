/**
 * Automated Location Update Fix Test
 * Run with: node test-location-fixes-automated.js
 * 
 * This test uses Puppeteer to automate browser testing of location updates
 */

import puppeteer from 'puppeteer';

const TEST_CONFIG = {
  baseUrl: 'http://localhost:5173',
  testDuration: 60000, // 60 seconds
  expectedMinUpdates: 5,
  expectedUpdateInterval: 10000, // 10 seconds
};

async function runLocationTest() {
  console.log('🚀 Starting automated location update fix test...\n');
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    args: ['--disable-web-security', '--allow-running-insecure-content'],
  });

  try {
    const page = await browser.newPage();
    
    // Grant geolocation permissions
    const context = browser.defaultBrowserContext();
    await context.overridePermissions(TEST_CONFIG.baseUrl, ['geolocation']);
    
    // Set mock geolocation (desktop simulation)
    await page.setGeolocation({ latitude: 23.025, longitude: 72.571 });
    
    // Override geolocation accuracy to simulate desktop IP-based positioning
    await page.evaluateOnNewDocument(() => {
      const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
      
      navigator.geolocation.getCurrentPosition = function(success, error, options) {
        originalGetCurrentPosition(
          (position) => {
            // Simulate desktop IP-based positioning (poor accuracy)
            const mockPosition = {
              ...position,
              coords: {
                ...position.coords,
                accuracy: 15000, // 15km accuracy (desktop IP-based)
              },
            };
            success(mockPosition);
          },
          error,
          options
        );
      };
      
      // Mock watchPosition to become inactive after 2 updates
      let watchId = 1;
      let updateCount = 0;
      
      navigator.geolocation.watchPosition = function(success, error, options) {
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
                success(mockPosition);
              },
              error,
              options
            );
          }
          // After 2 updates, watchPosition becomes "inactive"
        }, 1000);
        
        return watchId++;
      };
    });
    
    // Track console logs
    const consoleLogs = [];
    const locationUpdates = [];
    let pollingFallbackActivated = false;
    let watchPositionRestarts = 0;
    
    page.on('console', (msg) => {
      const text = msg.text();
      consoleLogs.push({ timestamp: Date.now(), text });
      
      if (text.includes('Polling fallback enabled') || text.includes('Polling fallback started')) {
        pollingFallbackActivated = true;
        console.log('✅ Polling fallback activated!');
      }
      
      if (text.includes('watchPosition appears inactive') || text.includes('Restarting watchPosition')) {
        watchPositionRestarts++;
        console.log(`⚠️ watchPosition restart detected (count: ${watchPositionRestarts})`);
      }
      
      if (text.includes('Location update') || text.includes('location obtained')) {
        locationUpdates.push({ timestamp: Date.now() });
        console.log(`📍 Location update #${locationUpdates.length}`);
      }
    });
    
    // Navigate to driver login
    console.log(`\n🌐 Navigating to ${TEST_CONFIG.baseUrl}/driver-login...`);
    await page.goto(`${TEST_CONFIG.baseUrl}/driver-login`, { waitUntil: 'networkidle2' });
    
    console.log('📋 Page loaded. Please log in manually and start tracking...');
    console.log('⏱️  Test will run for 60 seconds...\n');
    
    // Wait for test duration
    await page.waitForTimeout(TEST_CONFIG.testDuration);
    
    // Generate test report
    const testReport = {
      testDuration: `${TEST_CONFIG.testDuration / 1000} seconds`,
      totalLocationUpdates: locationUpdates.length,
      expectedMinUpdates: TEST_CONFIG.minUpdates,
      pollingFallbackActivated,
      watchPositionRestarts,
      status: locationUpdates.length >= TEST_CONFIG.expectedMinUpdates ? 'PASS' : 'FAIL',
      locationUpdateIntervals: calculateIntervals(locationUpdates),
    };
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(60));
    console.log(JSON.stringify(testReport, null, 2));
    console.log('='.repeat(60));
    
    if (testReport.status === 'PASS') {
      console.log('\n✅ TEST PASSED: Location updates working correctly!');
      console.log(`   ✓ Received ${locationUpdates.length} updates (expected ≥${TEST_CONFIG.expectedMinUpdates})`);
      if (pollingFallbackActivated) {
        console.log('   ✓ Polling fallback activated as expected');
      }
    } else {
      console.log('\n❌ TEST FAILED: Not enough location updates received');
      console.log(`   ✗ Received ${locationUpdates.length} updates (expected ≥${TEST_CONFIG.expectedMinUpdates})`);
    }
    
    // Check update intervals
    if (testReport.locationUpdateIntervals.length > 0) {
      const avgInterval = testReport.locationUpdateIntervals.reduce((a, b) => a + b, 0) / testReport.locationUpdateIntervals.length;
      console.log(`\n📈 Average update interval: ${Math.round(avgInterval / 1000)}s`);
      
      if (avgInterval <= TEST_CONFIG.expectedUpdateInterval * 1000) {
        console.log('   ✓ Update frequency is acceptable');
      } else {
        console.log('   ⚠️  Update frequency is slower than expected');
      }
    }
    
    return testReport;
    
  } catch (error) {
    console.error('❌ Test error:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

function calculateIntervals(updates) {
  const intervals = [];
  for (let i = 1; i < updates.length; i++) {
    intervals.push(updates[i].timestamp - updates[i - 1].timestamp);
  }
  return intervals;
}

// Run test
runLocationTest()
  .then((report) => {
    console.log('\n✅ Test completed successfully');
    process.exit(report.status === 'PASS' ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

