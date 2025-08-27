#!/usr/bin/env ts-node

/**
 * WebSocket Integration Test Script
 * 
 * This script tests the WebSocket integration between frontend and backend
 * to ensure all events work properly.
 * 
 * Usage: npm run test-websocket
 */

import { environment } from '../frontend/src/config/environment';

interface TestResult {
  testName: string;
  success: boolean;
  error?: string;
  duration: number;
  details?: any;
}

interface WebSocketTestReport {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
  results: TestResult[];
}

class WebSocketIntegrationTester {
  private websocketUrl: string;
  private results: TestResult[] = [];

  constructor() {
    this.websocketUrl = environment.api.websocketUrl;
    console.log('🔧 Testing WebSocket integration with backend at:', this.websocketUrl);
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

  // Test basic WebSocket connection
  private async testBasicConnection(): Promise<any> {
    return new Promise((resolve, reject) => {
      const { io } = require('socket.io-client');
      const socket = io(this.websocketUrl, {
        timeout: 10000,
        transports: ['websocket', 'polling'],
      });

      const timeout = setTimeout(() => {
        socket.disconnect();
        reject(new Error('Connection timeout'));
      }, 10000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        socket.disconnect();
        resolve({ status: 'Connected successfully' });
      });

      socket.on('connect_error', (error: any) => {
        clearTimeout(timeout);
        socket.disconnect();
        reject(new Error(`Connection failed: ${error.message}`));
      });
    });
  }

  // Test student connection
  private async testStudentConnection(): Promise<any> {
    return new Promise((resolve, reject) => {
      const { io } = require('socket.io-client');
      const socket = io(this.websocketUrl, {
        timeout: 10000,
        transports: ['websocket', 'polling'],
      });

      const timeout = setTimeout(() => {
        socket.disconnect();
        reject(new Error('Student connection timeout'));
      }, 10000);

      socket.on('connect', () => {
        socket.emit('student:connect');
      });

      socket.on('student:connected', (data: any) => {
        clearTimeout(timeout);
        socket.disconnect();
        resolve({ status: 'Student connected', data });
      });

      socket.on('connect_error', (error: any) => {
        clearTimeout(timeout);
        socket.disconnect();
        reject(new Error(`Student connection failed: ${error.message}`));
      });
    });
  }

  // Test ping/pong functionality
  private async testPingPong(): Promise<any> {
    return new Promise((resolve, reject) => {
      const { io } = require('socket.io-client');
      const socket = io(this.websocketUrl, {
        timeout: 10000,
        transports: ['websocket', 'polling'],
      });

      const timeout = setTimeout(() => {
        socket.disconnect();
        reject(new Error('Ping/pong timeout'));
      }, 10000);

      socket.on('connect', () => {
        socket.emit('ping');
      });

      socket.on('pong', () => {
        clearTimeout(timeout);
        socket.disconnect();
        resolve({ status: 'Ping/pong working' });
      });

      socket.on('connect_error', (error: any) => {
        clearTimeout(timeout);
        socket.disconnect();
        reject(new Error(`Ping/pong failed: ${error.message}`));
      });
    });
  }

  // Test driver authentication (without valid token)
  private async testDriverAuthentication(): Promise<any> {
    return new Promise((resolve, reject) => {
      const { io } = require('socket.io-client');
      const socket = io(this.websocketUrl, {
        timeout: 10000,
        transports: ['websocket', 'polling'],
      });

      const timeout = setTimeout(() => {
        socket.disconnect();
        reject(new Error('Driver authentication timeout'));
      }, 10000);

      socket.on('connect', () => {
        socket.emit('driver:authenticate', { token: 'invalid_token' });
      });

      socket.on('driver:authentication_failed', (data: any) => {
        clearTimeout(timeout);
        socket.disconnect();
        resolve({ status: 'Driver authentication failed as expected', data });
      });

      socket.on('connect_error', (error: any) => {
        clearTimeout(timeout);
        socket.disconnect();
        reject(new Error(`Driver authentication test failed: ${error.message}`));
      });
    });
  }

  // Test event listener setup
  private async testEventListeners(): Promise<any> {
    return new Promise((resolve, reject) => {
      const { io } = require('socket.io-client');
      const socket = io(this.websocketUrl, {
        timeout: 10000,
        transports: ['websocket', 'polling'],
      });

      const timeout = setTimeout(() => {
        socket.disconnect();
        reject(new Error('Event listener test timeout'));
      }, 10000);

      const events = [
        'bus:locationUpdate',
        'driver:connected',
        'driver:disconnected',
        'student:connected',
        'bus:arriving',
      ];

      let eventCount = 0;

      socket.on('connect', () => {
        // Set up all event listeners
        events.forEach(event => {
          socket.on(event, (data: any) => {
            console.log(`📡 Received ${event}:`, data);
            eventCount++;
          });
        });

        // Emit student connect to trigger student:connected
        socket.emit('student:connect');
      });

      socket.on('student:connected', () => {
        clearTimeout(timeout);
        socket.disconnect();
        resolve({ 
          status: 'Event listeners working', 
          eventsSetUp: events.length,
          eventsReceived: eventCount 
        });
      });

      socket.on('connect_error', (error: any) => {
        clearTimeout(timeout);
        socket.disconnect();
        reject(new Error(`Event listener test failed: ${error.message}`));
      });
    });
  }

  // Run all WebSocket integration tests
  async runAllTests(): Promise<WebSocketTestReport> {
    console.log('🚀 Starting WebSocket Integration Tests...\n');
    
    const startTime = Date.now();

    // Basic connectivity tests
    await this.runTest('Basic WebSocket Connection', () => this.testBasicConnection());
    await this.runTest('Student Connection', () => this.testStudentConnection());
    await this.runTest('Ping/Pong Functionality', () => this.testPingPong());
    await this.runTest('Driver Authentication (Invalid Token)', () => this.testDriverAuthentication());
    await this.runTest('Event Listener Setup', () => this.testEventListeners());

    const totalDuration = Date.now() - startTime;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = this.results.filter(r => !r.success).length;

    const report: WebSocketTestReport = {
      totalTests: this.results.length,
      passedTests,
      failedTests,
      totalDuration,
      results: this.results,
    };

    this.printReport(report);
    return report;
  }

  private printReport(report: WebSocketTestReport): void {
    console.log('\n📊 WebSocket Integration Test Report');
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
      console.log('🎉 All WebSocket integration tests passed!');
    } else {
      console.log('💥 Some WebSocket integration tests failed. Please check the errors above.');
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new WebSocketIntegrationTester();
  tester.runAllTests()
    .then(report => {
      process.exit(report.failedTests === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ WebSocket test runner failed:', error);
      process.exit(1);
    });
}

export { WebSocketIntegrationTester, WebSocketTestReport };

