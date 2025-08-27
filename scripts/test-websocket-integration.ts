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
    console.log('🔌 Testing WebSocket integration with backend at:', this.websocketUrl);
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

  // Test WebSocket connection
  private async testWebSocketConnection(): Promise<any> {
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
        console.log('✅ WebSocket connected successfully');
        socket.disconnect();
        resolve({ connected: true, socketId: socket.id });
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
        console.log('✅ Student connected successfully:', data);
        socket.disconnect();
        resolve(data);
      });

      socket.on('connect_error', (error: any) => {
        clearTimeout(timeout);
        socket.disconnect();
        reject(new Error(`Student connection failed: ${error.message}`));
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
        console.log('✅ Driver authentication correctly failed:', data);
        socket.disconnect();
        resolve({ status: 'correctly_failed', error: data });
      });

      socket.on('connect_error', (error: any) => {
        clearTimeout(timeout);
        socket.disconnect();
        reject(new Error(`Driver authentication test failed: ${error.message}`));
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
        console.log('✅ Ping/pong working correctly');
        socket.disconnect();
        resolve({ status: 'ping_pong_working' });
      });

      socket.on('connect_error', (error: any) => {
        clearTimeout(timeout);
        socket.disconnect();
        reject(new Error(`Ping/pong test failed: ${error.message}`));
      });
    });
  }

  // Test event emission and reception
  private async testEventEmission(): Promise<any> {
    return new Promise((resolve, reject) => {
      const { io } = require('socket.io-client');
      
      const socket1 = io(this.websocketUrl, {
        timeout: 10000,
        transports: ['websocket', 'polling'],
      });

      const socket2 = io(this.websocketUrl, {
        timeout: 10000,
        transports: ['websocket', 'polling'],
      });

      const timeout = setTimeout(() => {
        socket1.disconnect();
        socket2.disconnect();
        reject(new Error('Event emission timeout'));
      }, 10000);

      let eventsReceived = 0;

      socket1.on('connect', () => {
        socket2.on('connect', () => {
          // Test custom event
          socket1.emit('test:event', { message: 'Hello from socket1' });
        });
      });

      socket2.on('test:event', (data: any) => {
        eventsReceived++;
        if (eventsReceived === 1) {
          clearTimeout(timeout);
          console.log('✅ Event emission working correctly:', data);
          socket1.disconnect();
          socket2.disconnect();
          resolve({ status: 'event_emission_working', data });
        }
      });

      socket1.on('connect_error', (error: any) => {
        clearTimeout(timeout);
        socket1.disconnect();
        socket2.disconnect();
        reject(new Error(`Event emission test failed: ${error.message}`));
      });
    });
  }

  // Run all WebSocket integration tests
  async runAllTests(): Promise<WebSocketTestReport> {
    console.log('🚀 Starting WebSocket Integration Tests...\n');
    
    const startTime = Date.now();

    // Basic connectivity tests
    await this.runTest('WebSocket Connection', () => this.testWebSocketConnection());
    await this.runTest('Student Connection', () => this.testStudentConnection());
    await this.runTest('Driver Authentication (Invalid Token)', () => this.testDriverAuthentication());
    await this.runTest('Ping/Pong Functionality', () => this.testPingPong());
    await this.runTest('Event Emission', () => this.testEventEmission());

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
