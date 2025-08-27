#!/usr/bin/env ts-node

/**
 * Route Integration Test Script
 * 
 * This script tests the integration between all backend routes
 * to ensure they work properly together.
 * 
 * Usage: npm run test-routes
 */

import { environment } from '../backend/src/config/environment';

interface TestResult {
  testName: string;
  success: boolean;
  error?: string;
  duration: number;
  details?: any;
}

interface RouteTestReport {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
  results: TestResult[];
}

class RouteIntegrationTester {
  private apiUrl: string;
  private results: TestResult[] = [];

  constructor() {
    this.apiUrl = environment.api.baseUrl;
    console.log('🔧 Testing route integration with backend at:', this.apiUrl);
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

  // Test health endpoints
  private async testHealthEndpoints(): Promise<any> {
    const response = await fetch(`${this.apiUrl}/health`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${data.error || 'Unknown error'}`);
    }

    const detailedResponse = await fetch(`${this.apiUrl}/health/detailed`);
    const detailedData = await detailedResponse.json();
    
    if (!detailedResponse.ok) {
      throw new Error(`Detailed health check failed: ${detailedData.error || 'Unknown error'}`);
    }

    return {
      health: data,
      detailed: detailedData,
    };
  }

  // Test root endpoint
  private async testRootEndpoint(): Promise<any> {
    const response = await fetch(`${this.apiUrl}/`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Root endpoint failed: ${data.error || 'Unknown error'}`);
    }

    return data;
  }

  // Test buses endpoints (public)
  private async testBusesEndpoints(): Promise<any> {
    const response = await fetch(`${this.apiUrl}/buses`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Buses endpoint failed: ${data.error || 'Unknown error'}`);
    }

    return data;
  }

  // Test routes endpoints (public)
  private async testRoutesEndpoints(): Promise<any> {
    const response = await fetch(`${this.apiUrl}/routes`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Routes endpoint failed: ${data.error || 'Unknown error'}`);
    }

    return data;
  }

  // Test admin endpoints (should require authentication)
  private async testAdminEndpoints(): Promise<any> {
    const response = await fetch(`${this.apiUrl}/admin/analytics`);
    
    // Should return 401 (unauthorized) since no token provided
    if (response.status !== 401) {
      throw new Error(`Admin endpoint should require authentication, got status: ${response.status}`);
    }

    const data = await response.json();
    if (data.code !== 'MISSING_TOKEN') {
      throw new Error(`Expected MISSING_TOKEN error code, got: ${data.code}`);
    }

    return { status: 'correctly_requires_auth', code: data.code };
  }

  // Test locations endpoints (should require authentication)
  private async testLocationsEndpoints(): Promise<any> {
    const response = await fetch(`${this.apiUrl}/locations/current`);
    
    // Should return 401 (unauthorized) since no token provided
    if (response.status !== 401) {
      throw new Error(`Locations endpoint should require authentication, got status: ${response.status}`);
    }

    const data = await response.json();
    if (data.code !== 'MISSING_TOKEN') {
      throw new Error(`Expected MISSING_TOKEN error code, got: ${data.code}`);
    }

    return { status: 'correctly_requires_auth', code: data.code };
  }

  // Test storage endpoints (should require authentication)
  private async testStorageEndpoints(): Promise<any> {
    const response = await fetch(`${this.apiUrl}/storage/upload/bus-image`, {
      method: 'POST',
    });
    
    // Should return 401 (unauthorized) since no token provided
    if (response.status !== 401) {
      throw new Error(`Storage endpoint should require authentication, got status: ${response.status}`);
    }

    const data = await response.json();
    if (data.code !== 'MISSING_TOKEN') {
      throw new Error(`Expected MISSING_TOKEN error code, got: ${data.code}`);
    }

    return { status: 'correctly_requires_auth', code: data.code };
  }

  // Test 404 handling
  private async test404Handling(): Promise<any> {
    const response = await fetch(`${this.apiUrl}/nonexistent-endpoint`);
    
    if (response.status !== 404) {
      throw new Error(`Expected 404 status, got: ${response.status}`);
    }

    const data = await response.json();
    if (data.error !== 'Route not found') {
      throw new Error(`Expected 'Route not found' error, got: ${data.error}`);
    }

    return { status: 'correctly_handles_404', error: data.error };
  }

  // Test CORS headers
  private async testCORSHeaders(): Promise<any> {
    const response = await fetch(`${this.apiUrl}/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });

    const corsHeaders = {
      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
    };

    if (!corsHeaders['access-control-allow-origin']) {
      throw new Error('CORS headers not properly set');
    }

    return corsHeaders;
  }

  // Test response format consistency
  private async testResponseFormat(): Promise<any> {
    const endpoints = ['/health', '/buses', '/routes'];
    const formats = [];

    for (const endpoint of endpoints) {
      const response = await fetch(`${this.apiUrl}${endpoint}`);
      const data = await response.json();
      
      if (response.ok) {
        // Check for consistent response format
        if (!data.hasOwnProperty('success') || !data.hasOwnProperty('timestamp')) {
          throw new Error(`Inconsistent response format for ${endpoint}: missing success or timestamp`);
        }
        
        formats.push({
          endpoint,
          hasSuccess: data.hasOwnProperty('success'),
          hasTimestamp: data.hasOwnProperty('timestamp'),
          hasData: data.hasOwnProperty('data'),
        });
      }
    }

    return formats;
  }

  // Run all route integration tests
  async runAllTests(): Promise<RouteTestReport> {
    console.log('🚀 Starting Route Integration Tests...\n');
    
    const startTime = Date.now();

    // Basic connectivity and health tests
    await this.runTest('Health Endpoints', () => this.testHealthEndpoints());
    await this.runTest('Root Endpoint', () => this.testRootEndpoint());
    
    // Public endpoint tests
    await this.runTest('Buses Endpoints (Public)', () => this.testBusesEndpoints());
    await this.runTest('Routes Endpoints (Public)', () => this.testRoutesEndpoints());
    
    // Authentication tests
    await this.runTest('Admin Endpoints (Auth Required)', () => this.testAdminEndpoints());
    await this.runTest('Locations Endpoints (Auth Required)', () => this.testLocationsEndpoints());
    await this.runTest('Storage Endpoints (Auth Required)', () => this.testStorageEndpoints());
    
    // Error handling tests
    await this.runTest('404 Error Handling', () => this.test404Handling());
    
    // CORS and format tests
    await this.runTest('CORS Headers', () => this.testCORSHeaders());
    await this.runTest('Response Format Consistency', () => this.testResponseFormat());

    const totalDuration = Date.now() - startTime;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = this.results.filter(r => !r.success).length;

    const report: RouteTestReport = {
      totalTests: this.results.length,
      passedTests,
      failedTests,
      totalDuration,
      results: this.results,
    };

    this.printReport(report);
    return report;
  }

  private printReport(report: RouteTestReport): void {
    console.log('\n📊 Route Integration Test Report');
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
      console.log('🎉 All route integration tests passed!');
    } else {
      console.log('💥 Some route integration tests failed. Please check the errors above.');
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new RouteIntegrationTester();
  tester.runAllTests()
    .then(report => {
      process.exit(report.failedTests === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Route test runner failed:', error);
      process.exit(1);
    });
}

export { RouteIntegrationTester, RouteTestReport };
