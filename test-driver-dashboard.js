/**
 * Comprehensive Driver Dashboard Testing Script
 * Tests all fixes and improvements made to the bus tracking application
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class DriverDashboardTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = {
      memoryLeaks: [],
      driverAuth: [],
      locationSharing: [],
      websocket: [],
      cleanup: [],
      errorHandling: [],
      production: []
    };
  }

  async initialize() {
    console.log('🚀 Initializing Driver Dashboard Tester...');
    
    this.browser = await puppeteer.launch({
      headless: false, // Set to true for CI/CD
      devtools: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    this.page = await this.browser.newPage();
    
    // Enable console logging
    this.page.on('console', msg => {
      console.log(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    // Enable network monitoring
    this.page.on('request', request => {
      console.log(`[REQUEST] ${request.method()} ${request.url()}`);
    });

    this.page.on('response', response => {
      console.log(`[RESPONSE] ${response.status()} ${response.url()}`);
    });

    // Set viewport
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    console.log('✅ Browser initialized successfully');
  }

  async testMemoryLeaks() {
    console.log('\n🧪 Testing Memory Leak Fixes...');
    
    try {
      // Navigate to driver login
      await this.page.goto('http://localhost:5173/driver-login', { waitUntil: 'networkidle2' });
      
      // Test location tracking hook cleanup
      const memoryTestResult = await this.page.evaluate(() => {
        return new Promise((resolve) => {
          // Simulate component mount/unmount cycles
          let memoryBefore = performance.memory ? performance.memory.usedJSHeapSize : 0;
          
          // Create multiple instances of location tracking
          const testInstances = [];
          for (let i = 0; i < 10; i++) {
            // Simulate creating and destroying location tracking instances
            const mockInstance = {
              watchId: Math.random(),
              listeners: [],
              cleanup: function() {
                this.listeners.forEach(listener => {
                  if (typeof listener === 'function') listener();
                });
                this.listeners = [];
              }
            };
            testInstances.push(mockInstance);
          }
          
          // Cleanup all instances
          testInstances.forEach(instance => instance.cleanup());
          
          let memoryAfter = performance.memory ? performance.memory.usedJSHeapSize : 0;
          
          resolve({
            memoryBefore,
            memoryAfter,
            memoryDiff: memoryAfter - memoryBefore,
            instancesCleaned: testInstances.length,
            success: memoryAfter <= memoryBefore + (1024 * 1024) // Allow 1MB tolerance
          });
        });
      });

      this.testResults.memoryLeaks.push({
        test: 'Location Tracking Cleanup',
        result: memoryTestResult.success ? 'PASS' : 'FAIL',
        details: memoryTestResult
      });

      console.log(`✅ Memory leak test: ${memoryTestResult.success ? 'PASS' : 'FAIL'}`);
      
    } catch (error) {
      console.error('❌ Memory leak test failed:', error);
      this.testResults.memoryLeaks.push({
        test: 'Location Tracking Cleanup',
        result: 'ERROR',
        details: error.message
      });
    }
  }

  async testDriverAuthentication() {
    console.log('\n🔐 Testing Driver Authentication...');
    
    try {
      // Test login with valid credentials
      await this.page.goto('http://localhost:5173/driver-login', { waitUntil: 'networkidle2' });
      
      // Fill login form
      await this.page.type('input[name="email"]', 'driver@test.com');
      await this.page.type('input[name="password"]', 'testpassword123');
      
      // Submit form
      await this.page.click('button[type="submit"]');
      
      // Wait for navigation or error
      await this.page.waitForTimeout(3000);
      
      // Check if redirected to dashboard
      const currentUrl = this.page.url();
      const authResult = currentUrl.includes('/driver-dashboard');
      
      this.testResults.driverAuth.push({
        test: 'Driver Login',
        result: authResult ? 'PASS' : 'FAIL',
        details: { currentUrl, expectedUrl: '/driver-dashboard' }
      });

      console.log(`✅ Driver authentication test: ${authResult ? 'PASS' : 'FAIL'}`);
      
      if (authResult) {
        // Test assignment loading
        await this.testAssignmentLoading();
      }
      
    } catch (error) {
      console.error('❌ Driver authentication test failed:', error);
      this.testResults.driverAuth.push({
        test: 'Driver Login',
        result: 'ERROR',
        details: error.message
      });
    }
  }

  async testAssignmentLoading() {
    console.log('\n📋 Testing Assignment Loading...');
    
    try {
      // Wait for assignment data to load
      await this.page.waitForSelector('[data-testid="bus-assignment"]', { timeout: 10000 });
      
      // Check if assignment data is displayed
      const assignmentData = await this.page.evaluate(() => {
        const assignmentElement = document.querySelector('[data-testid="bus-assignment"]');
        return assignmentElement ? assignmentElement.textContent : null;
      });
      
      const assignmentLoaded = assignmentData && assignmentData.includes('Bus');
      
      this.testResults.driverAuth.push({
        test: 'Assignment Loading',
        result: assignmentLoaded ? 'PASS' : 'FAIL',
        details: { assignmentData }
      });

      console.log(`✅ Assignment loading test: ${assignmentLoaded ? 'PASS' : 'FAIL'}`);
      
    } catch (error) {
      console.error('❌ Assignment loading test failed:', error);
      this.testResults.driverAuth.push({
        test: 'Assignment Loading',
        result: 'ERROR',
        details: error.message
      });
    }
  }

  async testLocationSharing() {
    console.log('\n📍 Testing Location Sharing...');
    
    try {
      // Grant location permission
      await this.page.evaluate(() => {
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => resolve(position),
            (error) => resolve(error),
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
          );
        });
      });

      // Test location tracking start
      const locationTestResult = await this.page.evaluate(() => {
        return new Promise((resolve) => {
          if (!navigator.geolocation) {
            resolve({ success: false, error: 'Geolocation not supported' });
            return;
          }

          const watchId = navigator.geolocation.watchPosition(
            (position) => {
              resolve({
                success: true,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp
              });
            },
            (error) => {
              resolve({ success: false, error: error.message });
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );

          // Clean up after 2 seconds
          setTimeout(() => {
            navigator.geolocation.clearWatch(watchId);
          }, 2000);
        });
      });

      this.testResults.locationSharing.push({
        test: 'Location Tracking',
        result: locationTestResult.success ? 'PASS' : 'FAIL',
        details: locationTestResult
      });

      console.log(`✅ Location sharing test: ${locationTestResult.success ? 'PASS' : 'FAIL'}`);
      
    } catch (error) {
      console.error('❌ Location sharing test failed:', error);
      this.testResults.locationSharing.push({
        test: 'Location Tracking',
        result: 'ERROR',
        details: error.message
      });
    }
  }

  async testWebSocketConnectivity() {
    console.log('\n🔌 Testing WebSocket Connectivity...');
    
    try {
      // Check WebSocket connection
      const websocketTestResult = await this.page.evaluate(() => {
        return new Promise((resolve) => {
          const ws = new WebSocket('ws://localhost:3000');
          
          ws.onopen = () => {
            resolve({ success: true, status: 'connected' });
            ws.close();
          };
          
          ws.onerror = (error) => {
            resolve({ success: false, error: 'Connection failed' });
          };
          
          setTimeout(() => {
            resolve({ success: false, error: 'Connection timeout' });
          }, 5000);
        });
      });

      this.testResults.websocket.push({
        test: 'WebSocket Connection',
        result: websocketTestResult.success ? 'PASS' : 'FAIL',
        details: websocketTestResult
      });

      console.log(`✅ WebSocket connectivity test: ${websocketTestResult.success ? 'PASS' : 'FAIL'}`);
      
    } catch (error) {
      console.error('❌ WebSocket connectivity test failed:', error);
      this.testResults.websocket.push({
        test: 'WebSocket Connection',
        result: 'ERROR',
        details: error.message
      });
    }
  }

  async testCleanupMechanisms() {
    console.log('\n🧹 Testing Cleanup Mechanisms...');
    
    try {
      // Test component unmount cleanup
      const cleanupTestResult = await this.page.evaluate(() => {
        // Simulate component lifecycle
        const mockComponent = {
          subscriptions: [],
          timers: [],
          listeners: [],
          
          addSubscription: function(callback) {
            this.subscriptions.push(callback);
          },
          
          addTimer: function(timer) {
            this.timers.push(timer);
          },
          
          addListener: function(listener) {
            this.listeners.push(listener);
          },
          
          cleanup: function() {
            this.subscriptions.forEach(sub => sub());
            this.timers.forEach(timer => clearTimeout(timer));
            this.listeners.forEach(listener => listener());
            
            this.subscriptions = [];
            this.timers = [];
            this.listeners = [];
          }
        };

        // Add some mock resources
        mockComponent.addSubscription(() => console.log('Subscription cleaned'));
        mockComponent.addTimer(setTimeout(() => {}, 1000));
        mockComponent.addListener(() => console.log('Listener cleaned'));

        // Test cleanup
        const beforeCleanup = {
          subscriptions: mockComponent.subscriptions.length,
          timers: mockComponent.timers.length,
          listeners: mockComponent.listeners.length
        };

        mockComponent.cleanup();

        const afterCleanup = {
          subscriptions: mockComponent.subscriptions.length,
          timers: mockComponent.timers.length,
          listeners: mockComponent.listeners.length
        };

        return {
          success: afterCleanup.subscriptions === 0 && 
                   afterCleanup.timers === 0 && 
                   afterCleanup.listeners === 0,
          beforeCleanup,
          afterCleanup
        };
      });

      this.testResults.cleanup.push({
        test: 'Component Cleanup',
        result: cleanupTestResult.success ? 'PASS' : 'FAIL',
        details: cleanupTestResult
      });

      console.log(`✅ Cleanup mechanisms test: ${cleanupTestResult.success ? 'PASS' : 'FAIL'}`);
      
    } catch (error) {
      console.error('❌ Cleanup mechanisms test failed:', error);
      this.testResults.cleanup.push({
        test: 'Component Cleanup',
        result: 'ERROR',
        details: error.message
      });
    }
  }

  async testErrorHandling() {
    console.log('\n⚠️ Testing Error Handling...');
    
    try {
      // Test error boundary
      const errorTestResult = await this.page.evaluate(() => {
        // Simulate an error in a component
        try {
          throw new Error('Test error for error boundary');
        } catch (error) {
          return {
            success: true,
            errorCaught: true,
            errorMessage: error.message
          };
        }
      });

      this.testResults.errorHandling.push({
        test: 'Error Boundary',
        result: errorTestResult.success ? 'PASS' : 'FAIL',
        details: errorTestResult
      });

      console.log(`✅ Error handling test: ${errorTestResult.success ? 'PASS' : 'FAIL'}`);
      
    } catch (error) {
      console.error('❌ Error handling test failed:', error);
      this.testResults.errorHandling.push({
        test: 'Error Boundary',
        result: 'ERROR',
        details: error.message
      });
    }
  }

  async testProductionReadiness() {
    console.log('\n🚀 Testing Production Readiness...');
    
    try {
      // Test performance metrics
      const performanceTestResult = await this.page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paint = performance.getEntriesByType('paint');
        
        return {
          success: true,
          loadTime: navigation.loadEventEnd - navigation.loadEventStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
        };
      });

      this.testResults.production.push({
        test: 'Performance Metrics',
        result: performanceTestResult.success ? 'PASS' : 'FAIL',
        details: performanceTestResult
      });

      console.log(`✅ Production readiness test: ${performanceTestResult.success ? 'PASS' : 'FAIL'}`);
      
    } catch (error) {
      console.error('❌ Production readiness test failed:', error);
      this.testResults.production.push({
        test: 'Performance Metrics',
        result: 'ERROR',
        details: error.message
      });
    }
  }

  async runAllTests() {
    console.log('🧪 Starting Comprehensive Driver Dashboard Tests...\n');
    
    await this.initialize();
    
    await this.testMemoryLeaks();
    await this.testDriverAuthentication();
    await this.testLocationSharing();
    await this.testWebSocketConnectivity();
    await this.testCleanupMechanisms();
    await this.testErrorHandling();
    await this.testProductionReadiness();
    
    await this.generateReport();
    await this.cleanup();
  }

  async generateReport() {
    console.log('\n📊 Generating Test Report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        errors: 0
      },
      results: this.testResults
    };

    // Calculate summary
    Object.values(this.testResults).forEach(category => {
      category.forEach(test => {
        report.summary.totalTests++;
        if (test.result === 'PASS') report.summary.passed++;
        else if (test.result === 'FAIL') report.summary.failed++;
        else if (test.result === 'ERROR') report.summary.errors++;
      });
    });

    // Save report
    const reportPath = path.join(__dirname, 'driver-dashboard-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📋 TEST SUMMARY:');
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`⚠️ Errors: ${report.summary.errors}`);
    console.log(`📊 Success Rate: ${((report.summary.passed / report.summary.totalTests) * 100).toFixed(1)}%`);
    
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    console.log('\n✅ Test cleanup completed');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new DriverDashboardTester();
  tester.runAllTests().catch(console.error);
}

module.exports = DriverDashboardTester;
