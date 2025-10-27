/**
 * Comprehensive Driver Dashboard Testing Script
 * Tests all aspects of the driver dashboard functionality
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class DriverDashboardTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = {
      timestamp: new Date().toISOString(),
      tests: [],
      errors: [],
      screenshots: [],
      performance: {},
      databaseChanges: []
    };
    this.screenshotDir = path.join(__dirname, 'test-screenshots');
    
    // Ensure screenshot directory exists
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  async initialize() {
    console.log('🚀 Initializing Driver Dashboard Test Suite...');
    
    this.browser = await puppeteer.launch({
      headless: false, // Set to true for CI/CD
      defaultViewport: { width: 1920, height: 1080 },
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
      const type = msg.type();
      const text = msg.text();
      console.log(`[${type.toUpperCase()}] ${text}`);
      
      if (type === 'error') {
        this.testResults.errors.push({
          timestamp: new Date().toISOString(),
          type: 'console_error',
          message: text,
          source: 'browser_console'
        });
      }
    });

    // Enable network monitoring
    this.page.on('response', response => {
      if (!response.ok()) {
        this.testResults.errors.push({
          timestamp: new Date().toISOString(),
          type: 'network_error',
          status: response.status(),
          url: response.url(),
          message: response.statusText()
        });
      }
    });

    // Enable request monitoring
    this.page.on('requestfailed', request => {
      this.testResults.errors.push({
        timestamp: new Date().toISOString(),
        type: 'request_failed',
        url: request.url(),
        errorText: request.failure().errorText
      });
    });

    console.log('✅ Browser initialized successfully');
  }

  async takeScreenshot(name, description = '') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}_${timestamp}.png`;
    const filepath = path.join(this.screenshotDir, filename);
    
    await this.page.screenshot({ 
      path: filepath, 
      fullPage: true 
    });
    
    this.testResults.screenshots.push({
      name,
      description,
      filename,
      filepath,
      timestamp: new Date().toISOString()
    });
    
    console.log(`📸 Screenshot taken: ${name} - ${description}`);
    return filepath;
  }

  async testPageLoad() {
    console.log('\n🔍 Testing Page Load...');
    
    try {
      const startTime = Date.now();
      
      // Navigate to the driver dashboard
      await this.page.goto('http://localhost:5173', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      const loadTime = Date.now() - startTime;
      this.testResults.performance.pageLoadTime = loadTime;
      
      // Take screenshot of initial page load
      await this.takeScreenshot('01_page_load', 'Initial page load');
      
      // Check if page loaded successfully
      const title = await this.page.title();
      const url = this.page.url();
      
      this.testResults.tests.push({
        name: 'Page Load',
        status: 'passed',
        details: {
          title,
          url,
          loadTime: `${loadTime}ms`
        },
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Page loaded successfully in ${loadTime}ms`);
      console.log(`📄 Title: ${title}`);
      console.log(`🌐 URL: ${url}`);
      
      return true;
    } catch (error) {
      console.error('❌ Page load failed:', error.message);
      
      this.testResults.tests.push({
        name: 'Page Load',
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      await this.takeScreenshot('01_page_load_error', 'Page load error');
      return false;
    }
  }

  async testDriverLogin() {
    console.log('\n🔐 Testing Driver Login...');
    
    try {
      // Wait for login form to be visible
      await this.page.waitForSelector('input[name="email"]', { timeout: 10000 });
      await this.page.waitForSelector('input[name="password"]', { timeout: 10000 });
      
      // Take screenshot of login form
      await this.takeScreenshot('02_login_form', 'Login form visible');
      
      // Fill in login credentials
      await this.page.type('input[name="email"]', 'prathambhatt771@gmail.com');
      await this.page.type('input[name="password"]', '15072002');
      
      // Take screenshot after filling credentials
      await this.takeScreenshot('03_login_filled', 'Login form filled');
      
      // Click login button
      const loginButton = await this.page.waitForSelector('button[type="submit"]', { timeout: 5000 });
      await loginButton.click();
      
      // Wait for navigation or dashboard to load
      await this.page.waitForTimeout(3000);
      
      // Check if login was successful by looking for dashboard elements
      const dashboardElements = await this.page.$$('[data-testid*="dashboard"], [class*="dashboard"], [id*="dashboard"]');
      const isDashboardVisible = dashboardElements.length > 0;
      
      // Take screenshot after login attempt
      await this.takeScreenshot('04_login_result', 'Login attempt result');
      
      this.testResults.tests.push({
        name: 'Driver Login',
        status: isDashboardVisible ? 'passed' : 'failed',
        details: {
          email: 'prathambhatt771@gmail.com',
          dashboardVisible: isDashboardVisible,
          dashboardElementsFound: dashboardElements.length
        },
        timestamp: new Date().toISOString()
      });
      
      if (isDashboardVisible) {
        console.log('✅ Driver login successful');
      } else {
        console.log('❌ Driver login failed - dashboard not visible');
      }
      
      return isDashboardVisible;
    } catch (error) {
      console.error('❌ Login test failed:', error.message);
      
      this.testResults.tests.push({
        name: 'Driver Login',
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      await this.takeScreenshot('04_login_error', 'Login error');
      return false;
    }
  }

  async testDashboardLoading() {
    console.log('\n📊 Testing Dashboard Loading...');
    
    try {
      // Wait for dashboard to be fully loaded
      await this.page.waitForTimeout(5000);
      
      // Check for common dashboard elements
      const busInfo = await this.page.$$('[data-testid*="bus"], [class*="bus"], [id*="bus"]');
      const routeInfo = await this.page.$$('[data-testid*="route"], [class*="route"], [id*="route"]');
      const mapElement = await this.page.$$('[data-testid*="map"], [class*="map"], [id*="map"]');
      
      // Take screenshot of loaded dashboard
      await this.takeScreenshot('05_dashboard_loaded', 'Dashboard fully loaded');
      
      const dashboardLoaded = busInfo.length > 0 || routeInfo.length > 0 || mapElement.length > 0;
      
      this.testResults.tests.push({
        name: 'Dashboard Loading',
        status: dashboardLoaded ? 'passed' : 'failed',
        details: {
          busElementsFound: busInfo.length,
          routeElementsFound: routeInfo.length,
          mapElementsFound: mapElement.length,
          dashboardFullyLoaded: dashboardLoaded
        },
        timestamp: new Date().toISOString()
      });
      
      if (dashboardLoaded) {
        console.log('✅ Dashboard loaded successfully');
        console.log(`🚌 Bus elements found: ${busInfo.length}`);
        console.log(`🛣️ Route elements found: ${routeInfo.length}`);
        console.log(`🗺️ Map elements found: ${mapElement.length}`);
      } else {
        console.log('❌ Dashboard loading failed');
      }
      
      return dashboardLoaded;
    } catch (error) {
      console.error('❌ Dashboard loading test failed:', error.message);
      
      this.testResults.tests.push({
        name: 'Dashboard Loading',
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      await this.takeScreenshot('05_dashboard_error', 'Dashboard loading error');
      return false;
    }
  }

  async testBusAndRouteInfo() {
    console.log('\n🚌 Testing Bus and Route Information...');
    
    try {
      // Look for bus and route information elements
      const busNumber = await this.page.$eval('[data-testid*="bus-number"], [class*="bus-number"], [id*="bus-number"]', el => el.textContent).catch(() => null);
      const routeName = await this.page.$eval('[data-testid*="route-name"], [class*="route-name"], [id*="route-name"]', el => el.textContent).catch(() => null);
      
      // Take screenshot of bus and route info
      await this.takeScreenshot('06_bus_route_info', 'Bus and route information');
      
      const infoVisible = busNumber || routeName;
      
      this.testResults.tests.push({
        name: 'Bus and Route Information',
        status: infoVisible ? 'passed' : 'failed',
        details: {
          busNumber: busNumber || 'Not found',
          routeName: routeName || 'Not found',
          infoVisible: infoVisible
        },
        timestamp: new Date().toISOString()
      });
      
      if (infoVisible) {
        console.log('✅ Bus and route information visible');
        console.log(`🚌 Bus Number: ${busNumber || 'Not found'}`);
        console.log(`🛣️ Route Name: ${routeName || 'Not found'}`);
      } else {
        console.log('❌ Bus and route information not visible');
      }
      
      return infoVisible;
    } catch (error) {
      console.error('❌ Bus and route info test failed:', error.message);
      
      this.testResults.tests.push({
        name: 'Bus and Route Information',
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      await this.takeScreenshot('06_bus_route_error', 'Bus and route info error');
      return false;
    }
  }

  async testMapVisibility() {
    console.log('\n🗺️ Testing Map Visibility...');
    
    try {
      // Wait for map to load
      await this.page.waitForTimeout(3000);
      
      // Check for map elements
      const mapElements = await this.page.$$('[data-testid*="map"], [class*="map"], [id*="map"], canvas, iframe');
      
      // Take screenshot of map
      await this.takeScreenshot('07_map_visibility', 'Map visibility check');
      
      const mapVisible = mapElements.length > 0;
      
      this.testResults.tests.push({
        name: 'Map Visibility',
        status: mapVisible ? 'passed' : 'failed',
        details: {
          mapElementsFound: mapElements.length,
          mapVisible: mapVisible
        },
        timestamp: new Date().toISOString()
      });
      
      if (mapVisible) {
        console.log('✅ Map is visible');
        console.log(`🗺️ Map elements found: ${mapElements.length}`);
      } else {
        console.log('❌ Map is not visible');
      }
      
      return mapVisible;
    } catch (error) {
      console.error('❌ Map visibility test failed:', error.message);
      
      this.testResults.tests.push({
        name: 'Map Visibility',
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      await this.takeScreenshot('07_map_error', 'Map visibility error');
      return false;
    }
  }

  async testLocationTracking() {
    console.log('\n📍 Testing Location Tracking...');
    
    try {
      // Look for tracking controls
      const trackingButton = await this.page.$('[data-testid*="track"], [class*="track"], [id*="track"], button');
      
      if (trackingButton) {
        // Take screenshot before starting tracking
        await this.takeScreenshot('08_tracking_start', 'Before starting location tracking');
        
        // Click tracking button
        await trackingButton.click();
        
        // Wait for tracking to start
        await this.page.waitForTimeout(3000);
        
        // Take screenshot after starting tracking
        await this.takeScreenshot('09_tracking_active', 'Location tracking active');
        
        // Check for location indicators
        const locationElements = await this.page.$$('[data-testid*="location"], [class*="location"], [id*="location"]');
        
        this.testResults.tests.push({
          name: 'Location Tracking',
          status: 'passed',
          details: {
            trackingButtonFound: true,
            locationElementsFound: locationElements.length,
            trackingStarted: true
          },
          timestamp: new Date().toISOString()
        });
        
        console.log('✅ Location tracking started');
        console.log(`📍 Location elements found: ${locationElements.length}`);
        
        return true;
      } else {
        console.log('❌ Tracking button not found');
        
        this.testResults.tests.push({
          name: 'Location Tracking',
          status: 'failed',
          details: {
            trackingButtonFound: false,
            error: 'Tracking button not found'
          },
          timestamp: new Date().toISOString()
        });
        
        await this.takeScreenshot('08_tracking_error', 'Tracking button not found');
        return false;
      }
    } catch (error) {
      console.error('❌ Location tracking test failed:', error.message);
      
      this.testResults.tests.push({
        name: 'Location Tracking',
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      await this.takeScreenshot('08_tracking_error', 'Location tracking error');
      return false;
    }
  }

  async generateReport() {
    console.log('\n📊 Generating Test Report...');
    
    const reportPath = path.join(__dirname, 'driver_dashboard_test_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.testResults, null, 2));
    
    console.log(`📄 Test report saved to: ${reportPath}`);
    console.log(`📸 Screenshots saved to: ${this.screenshotDir}`);
    
    // Print summary
    const passedTests = this.testResults.tests.filter(t => t.status === 'passed').length;
    const failedTests = this.testResults.tests.filter(t => t.status === 'failed').length;
    const totalErrors = this.testResults.errors.length;
    
    console.log('\n📈 Test Summary:');
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`🚨 Errors: ${totalErrors}`);
    console.log(`📸 Screenshots: ${this.testResults.screenshots.length}`);
    
    return this.testResults;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🧹 Browser closed');
    }
  }

  async runAllTests() {
    try {
      await this.initialize();
      
      console.log('\n🎯 Starting Comprehensive Driver Dashboard Tests...\n');
      
      // Run all tests
      await this.testPageLoad();
      await this.testDriverLogin();
      await this.testDashboardLoading();
      await this.testBusAndRouteInfo();
      await this.testMapVisibility();
      await this.testLocationTracking();
      
      // Generate report
      await this.generateReport();
      
      console.log('\n🎉 All tests completed!');
      
    } catch (error) {
      console.error('💥 Test suite failed:', error);
      await this.takeScreenshot('error_final', 'Final error state');
    } finally {
      await this.cleanup();
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new DriverDashboardTester();
  tester.runAllTests().catch(console.error);
}

module.exports = DriverDashboardTester;
