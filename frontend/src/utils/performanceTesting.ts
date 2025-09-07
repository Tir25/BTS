// frontend/src/utils/performanceTesting.ts

import { performanceMetrics } from '../config/performance';

export interface PerformanceTestResult {
  testName: string;
  duration: number;
  memoryUsage: number;
  success: boolean;
  error?: string;
  timestamp: number;
}

export interface PerformanceTestSuite {
  name: string;
  tests: PerformanceTestResult[];
  totalDuration: number;
  averageMemoryUsage: number;
  successRate: number;
}

class PerformanceTester {
  private tests: PerformanceTestSuite[] = [];
  private currentTest: PerformanceTestSuite | null = null;

  /**
   * Start a new test suite
   */
  startTestSuite(name: string): void {
    this.currentTest = {
      name,
      tests: [],
      totalDuration: 0,
      averageMemoryUsage: 0,
      successRate: 0,
    };
    console.log(`🧪 Starting performance test suite: ${name}`);
  }

  /**
   * End the current test suite
   */
  endTestSuite(): PerformanceTestSuite | null {
    if (!this.currentTest) return null;

    const suite = this.currentTest;
    
    // Calculate suite statistics
    suite.totalDuration = suite.tests.reduce((sum, test) => sum + test.duration, 0);
    suite.averageMemoryUsage = suite.tests.reduce((sum, test) => sum + test.memoryUsage, 0) / suite.tests.length;
    suite.successRate = (suite.tests.filter(test => test.success).length / suite.tests.length) * 100;

    this.tests.push(suite);
    this.currentTest = null;

    console.log(`✅ Test suite completed: ${suite.name}`);
    console.log(`📊 Results: ${suite.successRate.toFixed(1)}% success rate, ${suite.totalDuration.toFixed(2)}ms total`);
    
    return suite;
  }

  /**
   * Run a performance test
   */
  async runTest<T>(
    testName: string,
    testFunction: () => Promise<T> | T,
    expectedMaxDuration?: number
  ): Promise<PerformanceTestResult> {
    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    // let result: T;
    let success = true;
    let error: string | undefined;

    try {
      await testFunction();
      
      // Check if test exceeded expected duration
      if (expectedMaxDuration && (performance.now() - startTime) > expectedMaxDuration) {
        success = false;
        error = `Test exceeded expected duration of ${expectedMaxDuration}ms`;
      }
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : 'Unknown error';
    }

    const endTime = performance.now();
    const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    const testResult: PerformanceTestResult = {
      testName,
      duration: endTime - startTime,
      memoryUsage: endMemory - startMemory,
      success,
      error,
      timestamp: Date.now(),
    };

    // Record metrics
    performanceMetrics.recordMetric(`test.${testName}.duration`, testResult.duration);
    performanceMetrics.recordMetric(`test.${testName}.memory`, testResult.memoryUsage);

    // Add to current test suite
    if (this.currentTest) {
      this.currentTest.tests.push(testResult);
    }

    console.log(`🧪 Test: ${testName} - ${testResult.duration.toFixed(2)}ms - ${success ? '✅' : '❌'}`);
    
    return testResult;
  }

  /**
   * Test React component render performance
   */
  async testComponentRender(
    componentName: string,
    renderFunction: () => void,
    expectedMaxDuration: number = 16
  ): Promise<PerformanceTestResult> {
    return this.runTest(
      `component.${componentName}.render`,
      () => {
        renderFunction();
        return Promise.resolve();
      },
      expectedMaxDuration
    );
  }

  /**
   * Test API call performance
   */
  async testApiCall(
    apiName: string,
    apiCall: () => Promise<any>,
    expectedMaxDuration: number = 1000
  ): Promise<PerformanceTestResult> {
    return this.runTest(
      `api.${apiName}`,
      apiCall,
      expectedMaxDuration
    );
  }

  /**
   * Test WebSocket connection performance
   */
  async testWebSocketConnection(
    connectionFunction: () => Promise<void>,
    expectedMaxDuration: number = 5000
  ): Promise<PerformanceTestResult> {
    return this.runTest(
      'websocket.connection',
      connectionFunction,
      expectedMaxDuration
    );
  }

  /**
   * Test memory usage
   */
  async testMemoryUsage(
    testName: string,
    testFunction: () => Promise<void> | void,
    maxMemoryIncrease: number = 1024 * 1024 // 1MB
  ): Promise<PerformanceTestResult> {
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    const result = await this.runTest(
      `memory.${testName}`,
      async () => {
        await testFunction();
        
        const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
        const memoryIncrease = endMemory - startMemory;
        
        if (memoryIncrease > maxMemoryIncrease) {
          throw new Error(`Memory usage increased by ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB, exceeding limit of ${(maxMemoryIncrease / 1024 / 1024).toFixed(2)}MB`);
        }
      }
    );

    return result;
  }

  /**
   * Test bundle size
   */
  async testBundleSize(
    bundleName: string,
    getBundleSize: () => Promise<number> | number,
    maxSizeKB: number
  ): Promise<PerformanceTestResult> {
    return this.runTest(
      `bundle.${bundleName}.size`,
      async () => {
        const size = await getBundleSize();
        const sizeKB = size / 1024;
        
        if (sizeKB > maxSizeKB) {
          throw new Error(`Bundle size ${sizeKB.toFixed(2)}KB exceeds limit of ${maxSizeKB}KB`);
        }
        
        return sizeKB;
      }
    );
  }

  /**
   * Get all test results
   */
  getAllResults(): PerformanceTestSuite[] {
    return [...this.tests];
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalTests: number;
    successfulTests: number;
    failedTests: number;
    averageDuration: number;
    totalDuration: number;
    averageMemoryUsage: number;
  } {
    const allTests = this.tests.flatMap(suite => suite.tests);
    const successfulTests = allTests.filter(test => test.success);
    const failedTests = allTests.filter(test => !test.success);
    
    return {
      totalTests: allTests.length,
      successfulTests: successfulTests.length,
      failedTests: failedTests.length,
      averageDuration: allTests.reduce((sum, test) => sum + test.duration, 0) / allTests.length,
      totalDuration: allTests.reduce((sum, test) => sum + test.duration, 0),
      averageMemoryUsage: allTests.reduce((sum, test) => sum + test.memoryUsage, 0) / allTests.length,
    };
  }

  /**
   * Export test results as JSON
   */
  exportResults(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: this.getPerformanceSummary(),
      testSuites: this.tests,
    }, null, 2);
  }

  /**
   * Clear all test results
   */
  clearResults(): void {
    this.tests = [];
    this.currentTest = null;
    performanceMetrics.clearMetrics();
  }
}

// Create singleton instance
export const performanceTester = new PerformanceTester();

// Utility functions for common performance tests
export const performanceTestUtils = {
  /**
   * Test component mount performance
   */
  async testComponentMount(
    componentName: string,
    mountFunction: () => void,
    expectedMaxDuration: number = 50
  ): Promise<PerformanceTestResult> {
    return performanceTester.testComponentRender(
      `${componentName}.mount`,
      mountFunction,
      expectedMaxDuration
    );
  },

  /**
   * Test component update performance
   */
  async testComponentUpdate(
    componentName: string,
    updateFunction: () => void,
    expectedMaxDuration: number = 16
  ): Promise<PerformanceTestResult> {
    return performanceTester.testComponentRender(
      `${componentName}.update`,
      updateFunction,
      expectedMaxDuration
    );
  },

  /**
   * Test list rendering performance
   */
  async testListRendering(
    listName: string,
    itemCount: number,
    renderFunction: () => void,
    expectedMaxDuration?: number
  ): Promise<PerformanceTestResult> {
    const defaultMaxDuration = Math.max(16, itemCount * 0.1); // 0.1ms per item minimum
    return performanceTester.testComponentRender(
      `list.${listName}.${itemCount}items`,
      renderFunction,
      expectedMaxDuration || defaultMaxDuration
    );
  },

  /**
   * Test image loading performance
   */
  async testImageLoading(
    imageUrl: string,
    expectedMaxDuration: number = 2000
  ): Promise<PerformanceTestResult> {
    return performanceTester.runTest(
      `image.loading.${imageUrl.split('/').pop()}`,
      () => {
        return new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Image failed to load'));
          img.src = imageUrl;
        });
      },
      expectedMaxDuration
    );
  },

  /**
   * Test localStorage performance
   */
  async testLocalStorage(
    operation: 'get' | 'set' | 'remove',
    key: string,
    value?: string,
    expectedMaxDuration: number = 1
  ): Promise<PerformanceTestResult> {
    return performanceTester.runTest(
      `localStorage.${operation}.${key}`,
      () => {
        switch (operation) {
          case 'get':
            return localStorage.getItem(key);
          case 'set':
            localStorage.setItem(key, value || '');
            return;
          case 'remove':
            localStorage.removeItem(key);
            return;
        }
      },
      expectedMaxDuration
    );
  },
};

// Development-only performance testing
if (process.env.NODE_ENV === 'development') {
  // Expose performance tester to global scope for debugging
  (window as any).performanceTester = performanceTester;
  (window as any).performanceTestUtils = performanceTestUtils;
  (window as any).performanceMetrics = performanceMetrics;
}

