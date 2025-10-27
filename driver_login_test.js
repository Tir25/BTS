/**
 * Focused Driver Login Test
 * Tests the driver login functionality specifically
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class DriverLoginTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = {
      timestamp: new Date().toISOString(),
      tests: [],
      errors: [],
      screenshots: []
    };
    this.screenshotDir = path.join(__dirname, 'login-test-screenshots');
    
    // Ensure screenshot directory exists
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  async initialize() {
    console.log('🚀 Initializing Driver Login Test...');
    
    this.browser = await puppeteer.launch({
      headless: false,
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

  async testDriverLoginPage() {
    console.log('\n🔐 Testing Driver Login Page...');
    
    try {
      // Navigate to driver login page
      await this.page.goto('http://localhost:5173/driver-login', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Take screenshot of login page
      await this.takeScreenshot('01_login_page', 'Driver login page loaded');
      
      // Wait for page to fully load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check for login form elements
      const emailInput = await this.page.$('input[name="email"]');
      const passwordInput = await this.page.$('input[name="password"]');
      const submitButton = await this.page.$('button[type="submit"]');
      
      // Take screenshot after checking elements
      await this.takeScreenshot('02_form_elements', 'Login form elements check');
      
      const formFound = emailInput && passwordInput && submitButton;
      
      this.testResults.tests.push({
        name: 'Driver Login Form',
        status: formFound ? 'passed' : 'failed',
        details: {
          emailInputFound: !!emailInput,
          passwordInputFound: !!passwordInput,
          submitButtonFound: !!submitButton,
          formComplete: formFound
        },
        timestamp: new Date().toISOString()
      });
      
      if (formFound) {
        console.log('✅ Login form found');
        
        // Test login functionality
        await this.testLoginFunctionality();
      } else {
        console.log('❌ Login form not found');
        
        // Check what elements are actually present
        const allInputs = await this.page.$$('input');
        const allButtons = await this.page.$$('button');
        const allForms = await this.page.$$('form');
        
        console.log(`📊 Found ${allInputs.length} inputs, ${allButtons.length} buttons, ${allForms.length} forms`);
        
        // Take screenshot of what's actually on the page
        await this.takeScreenshot('03_page_content', 'Actual page content');
      }
      
      return formFound;
    } catch (error) {
      console.error('❌ Driver login page test failed:', error.message);
      
      this.testResults.tests.push({
        name: 'Driver Login Page',
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      await this.takeScreenshot('01_login_error', 'Login page error');
      return false;
    }
  }

  async testLoginFunctionality() {
    console.log('\n🔑 Testing Login Functionality...');
    
    try {
      // Fill in login credentials
      await this.page.type('input[name="email"]', 'prathambhatt771@gmail.com');
      await this.page.type('input[name="password"]', '15072002');
      
      // Take screenshot after filling credentials
      await this.takeScreenshot('04_credentials_filled', 'Credentials filled');
      
      // Click login button
      await this.page.click('button[type="submit"]');
      
      // Wait for navigation or response
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check if login was successful
      const currentUrl = this.page.url();
      const isDashboard = currentUrl.includes('dashboard') || currentUrl.includes('interface');
      
      // Take screenshot after login attempt
      await this.takeScreenshot('05_login_result', 'Login attempt result');
      
      this.testResults.tests.push({
        name: 'Login Functionality',
        status: isDashboard ? 'passed' : 'failed',
        details: {
          currentUrl: currentUrl,
          isDashboard: isDashboard,
          loginSuccessful: isDashboard
        },
        timestamp: new Date().toISOString()
      });
      
      if (isDashboard) {
        console.log('✅ Login successful - redirected to dashboard');
        return true;
      } else {
        console.log('❌ Login failed - not redirected to dashboard');
        console.log(`Current URL: ${currentUrl}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Login functionality test failed:', error.message);
      
      this.testResults.tests.push({
        name: 'Login Functionality',
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      await this.takeScreenshot('05_login_error', 'Login functionality error');
      return false;
    }
  }

  async generateReport() {
    console.log('\n📊 Generating Test Report...');
    
    const reportPath = path.join(__dirname, 'driver_login_test_report.json');
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

  async runTest() {
    try {
      await this.initialize();
      
      console.log('\n🎯 Starting Driver Login Test...\n');
      
      await this.testDriverLoginPage();
      
      await this.generateReport();
      
      console.log('\n🎉 Test completed!');
      
    } catch (error) {
      console.error('💥 Test failed:', error);
      await this.takeScreenshot('error_final', 'Final error state');
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test
if (require.main === module) {
  const tester = new DriverLoginTester();
  tester.runTest().catch(console.error);
}

module.exports = DriverLoginTester;
