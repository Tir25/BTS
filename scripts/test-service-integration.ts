#!/usr/bin/env ts-node

/**
 * Service Integration Test Script
 * 
 * This script tests the integration between frontend and backend services
 * to ensure they work together properly.
 * 
 * Usage: npm run test-integration
 */

import { environment } from '../frontend/src/config/environment';

interface TestResult {
  testName: string;
  success: boolean;
  error?: string;
  duration: number;
  details?: any;
}

interface IntegrationTestReport {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
  results: TestResult[];
}

class ServiceIntegrationTester {
  private baseUrl: string;
  private results: TestResult[] = [];

  constructor() {
    this.baseUrl = environment.api.url;
    console.log('🔧 Testing integration with backend at:', this.baseUrl);
  }

  private async runTest(
    testName: string,
    testFunction: () => Promise<any>
  ): Promise<void> {
    const startTime = Date.now();
    console.log(`\n🧪 Running test: ${testName}`);

    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      this.results.push({
        testName,
        success: true,
        duration,
        details: result,
      });
      
      console.log(`✅ ${testName} - PASSED (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.push({
        testName,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });
      
      console.log(`❌ ${testName} - FAILED (${duration}ms): ${error}`);
    }
  }

  // Test backend health endpoint
  private async testBackendHealth(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error('Health check returned failure status');
    }
    
    return data;
  }

  // Test bus API endpoints
  private async testBusEndpoints(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/buses`);
    if (!response.ok) {
      throw new Error(`Bus endpoint failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error('Bus endpoint returned failure status');
    }
    
    return {
      busCount: data.data?.length || 0,
      hasData: Array.isArray(data.data),
    };
  }

  // Test route API endpoints
  private async testRouteEndpoints(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/routes`);
    if (!response.ok) {
      throw new Error(`Route endpoint failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error('Route endpoint returned failure status');
    }
    
    return {
      routeCount: data.data?.length || 0,
      hasData: Array.isArray(data.data),
    };
  }

  // Test location API endpoints
  private async testLocationEndpoints(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/locations/current`);
    if (!response.ok) {
      throw new Error(`Location endpoint failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error('Location endpoint returned failure status');
    }
    
    return {
      locationCount: data.data?.length || 0,
      hasData: Array.isArray(data.data),
    };
  }

  // Test admin API endpoints (without auth for basic connectivity)
  private async testAdminEndpoints(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/admin/health`);
    // Admin endpoints require auth, so we expect 401
    if (response.status === 401) {
      return { status: 'Unauthorized (expected for admin endpoints)' };
    }
    
    if (!response.ok) {
      throw new Error(`Admin endpoint failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  }

  // Test storage API endpoints
  private async testStorageEndpoints(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/storage/info/bus/test`);
    // Storage endpoints require auth, so we expect 401
    if (response.status === 401) {
      return { status: 'Unauthorized (expected for storage endpoints)' };
    }
    
    if (!response.ok) {
      throw new Error(`Storage endpoint failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  }

  // Test CORS configuration
  private async testCORS(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
      'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
    };
    
    return corsHeaders;
  }

  // Test WebSocket connectivity
  private async testWebSocket(): Promise<any> {
    return new Promise((resolve, reject) => {
      const wsUrl = environment.websocket.url;
      const ws = new WebSocket(wsUrl);
      
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, 5000);
      
      ws.onopen = () => {
        clearTimeout(timeout);
        ws.close();
        resolve({ status: 'Connected successfully' });
      };
      
      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket connection failed: ${error}`));
      };
    });
  }

  // Run all integration tests
  async runAllTests(): Promise<IntegrationTestReport> {
    console.log('🚀 Starting Service Integration Tests...\n');
    
    const startTime = Date.now();

    // Backend connectivity tests
    await this.runTest('Backend Health Check', () => this.testBackendHealth());
    await this.runTest('CORS Configuration', () => this.testCORS());
    
    // API endpoint tests
    await this.runTest('Bus API Endpoints', () => this.testBusEndpoints());
    await this.runTest('Route API Endpoints', () => this.testRouteEndpoints());
    await this.runTest('Location API Endpoints', () => this.testLocationEndpoints());
    await this.runTest('Admin API Endpoints', () => this.testAdminEndpoints());
    await this.runTest('Storage API Endpoints', () => this.testStorageEndpoints());
    
    // WebSocket test
    try {
      await this.runTest('WebSocket Connectivity', () => this.testWebSocket());
    } catch (error) {
      console.log('⚠️ WebSocket test skipped (Node.js environment)');
    }

    const totalDuration = Date.now() - startTime;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = this.results.filter(r => !r.success).length;

    const report: IntegrationTestReport = {
      totalTests: this.results.length,
      passedTests,
      failedTests,
      totalDuration,
      results: this.results,
    };

    this.printReport(report);
    return report;
  }

  private printReport(report: IntegrationTestReport): void {
    console.log('\n📊 Integration Test Report');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`✅ Passed: ${report.passedTests}`);
    console.log(`❌ Failed: ${report.failedTests}`);
    console.log(`⏱️ Total Duration: ${report.totalDuration}ms`);
    
    if (report.failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      report.results
        .filter(r => !r.success)
        .forEach(result => {
          console.log(`  - ${result.testName}: ${result.error}`);
        });
    }
    
    console.log('\n' + '='.repeat(50));
    
    if (report.failedTests === 0) {
      console.log('🎉 All integration tests passed!');
    } else {
      console.log('💥 Some integration tests failed. Please check the errors above.');
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new ServiceIntegrationTester();
  tester.runAllTests()
    .then(report => {
      process.exit(report.failedTests === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    });
}

export { ServiceIntegrationTester, IntegrationTestReport };
