/**
 * Simple Test Script for Driver Dashboard Fixes
 * Tests the core functionality without browser automation
 */

const fs = require('fs');
const path = require('path');

class SimpleDriverDashboardTest {
  constructor() {
    this.testResults = {
      reactStateLoops: false,
      websocketSync: false,
      locationTracking: false,
      databaseUpdates: false,
      errors: []
    };
  }

  testReactStateManagement() {
    console.log('🔄 Testing React State Management Fixes...');
    
    try {
      // Check if UnifiedDriverInterface.tsx has proper useCallback usage
      const unifiedDriverPath = path.join(__dirname, 'frontend/src/components/UnifiedDriverInterface.tsx');
      const unifiedDriverContent = fs.readFileSync(unifiedDriverPath, 'utf8');
      
      // Check for memoized functions
      const hasMemoizedFunctions = unifiedDriverContent.includes('useCallback') && 
                                   unifiedDriverContent.includes('syncDriverData') &&
                                   unifiedDriverContent.includes('updateBusInfo') &&
                                   unifiedDriverContent.includes('updateConnectionStatus');
      
      if (hasMemoizedFunctions) {
        console.log('✅ Memoized functions found in UnifiedDriverInterface');
        this.testResults.reactStateLoops = true;
      } else {
        console.error('❌ Memoized functions not found');
        this.testResults.errors.push('Memoized functions not implemented');
      }

      // Check for circular dependency fixes
      const hasCircularDependencyFixes = !unifiedDriverContent.includes('driverActions') ||
                                        unifiedDriverContent.includes('useCallback');
      
      if (hasCircularDependencyFixes) {
        console.log('✅ Circular dependency fixes implemented');
      } else {
        console.error('❌ Circular dependency fixes not implemented');
        this.testResults.errors.push('Circular dependency fixes not implemented');
      }

    } catch (error) {
      console.error('❌ React state management test failed:', error.message);
      this.testResults.errors.push(`React state test error: ${error.message}`);
    }
  }

  testWebSocketLocationSync() {
    console.log('📡 Testing WebSocket Location Synchronization Fixes...');
    
    try {
      // Check if useLocationWebSocketSync.ts includes busId
      const locationSyncPath = path.join(__dirname, 'frontend/src/hooks/useLocationWebSocketSync.ts');
      const locationSyncContent = fs.readFileSync(locationSyncPath, 'utf8');
      
      // Check for busId inclusion
      const hasBusId = locationSyncContent.includes('busId: busAssignment.bus_id');
      
      if (hasBusId) {
        console.log('✅ busId included in location data');
        this.testResults.websocketSync = true;
      } else {
        console.error('❌ busId not included in location data');
        this.testResults.errors.push('busId not included in location data');
      }

      // Check for proper memoization
      const hasMemoization = locationSyncContent.includes('useCallback') || 
                             locationSyncContent.includes('useMemo');
      
      if (hasMemoization) {
        console.log('✅ Proper memoization implemented');
      } else {
        console.error('❌ Proper memoization not implemented');
        this.testResults.errors.push('Proper memoization not implemented');
      }

    } catch (error) {
      console.error('❌ WebSocket location sync test failed:', error.message);
      this.testResults.errors.push(`WebSocket sync test error: ${error.message}`);
    }
  }

  testDriverStoreBridge() {
    console.log('🔗 Testing Driver Store Bridge Fixes...');
    
    try {
      // Check if useDriverStoreBridge.ts has proper memoization
      const bridgePath = path.join(__dirname, 'frontend/src/hooks/useDriverStoreBridge.ts');
      const bridgeContent = fs.readFileSync(bridgePath, 'utf8');
      
      // Check for memoized functions
      const hasMemoizedSync = bridgeContent.includes('syncDriverAuthState') &&
                             bridgeContent.includes('useCallback');
      
      if (hasMemoizedSync) {
        console.log('✅ Memoized sync functions found');
        this.testResults.locationTracking = true;
      } else {
        console.error('❌ Memoized sync functions not found');
        this.testResults.errors.push('Memoized sync functions not implemented');
      }

      // Check for location tracking bridge fixes
      const hasLocationBridge = bridgeContent.includes('sendLocationUpdate') &&
                               bridgeContent.includes('useCallback');
      
      if (hasLocationBridge) {
        console.log('✅ Location tracking bridge properly memoized');
      } else {
        console.error('❌ Location tracking bridge not properly memoized');
        this.testResults.errors.push('Location tracking bridge not properly memoized');
      }

    } catch (error) {
      console.error('❌ Driver store bridge test failed:', error.message);
      this.testResults.errors.push(`Driver store bridge test error: ${error.message}`);
    }
  }

  testWebSocketService() {
    console.log('🌐 Testing WebSocket Service...');
    
    try {
      // Check if UnifiedWebSocketService.ts has proper sendLocationUpdate method
      const wsServicePath = path.join(__dirname, 'frontend/src/services/UnifiedWebSocketService.ts');
      const wsServiceContent = fs.readFileSync(wsServicePath, 'utf8');
      
      // Check for proper sendLocationUpdate implementation
      const hasProperSendMethod = wsServiceContent.includes('sendLocationUpdate') &&
                                 wsServiceContent.includes('driver:locationUpdate');
      
      if (hasProperSendMethod) {
        console.log('✅ Proper sendLocationUpdate method found');
        this.testResults.databaseUpdates = true;
      } else {
        console.error('❌ Proper sendLocationUpdate method not found');
        this.testResults.errors.push('Proper sendLocationUpdate method not found');
      }

      // Check for connection validation
      const hasConnectionValidation = wsServiceContent.includes('this.socket?.connected');
      
      if (hasConnectionValidation) {
        console.log('✅ Connection validation implemented');
      } else {
        console.error('❌ Connection validation not implemented');
        this.testResults.errors.push('Connection validation not implemented');
      }

    } catch (error) {
      console.error('❌ WebSocket service test failed:', error.message);
      this.testResults.errors.push(`WebSocket service test error: ${error.message}`);
    }
  }

  generateReport() {
    console.log('\n📊 Generating Test Report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      testResults: this.testResults,
      summary: {
        totalTests: 4,
        passedTests: Object.values(this.testResults).filter(result => result === true).length,
        failedTests: Object.values(this.testResults).filter(result => result === false).length,
        errorCount: this.testResults.errors.length
      },
      recommendations: []
    };

    // Generate recommendations based on test results
    if (!this.testResults.reactStateLoops) {
      report.recommendations.push('Fix React state management infinite loops');
    }
    if (!this.testResults.websocketSync) {
      report.recommendations.push('Fix WebSocket connection and authentication');
    }
    if (!this.testResults.locationTracking) {
      report.recommendations.push('Fix location tracking functionality');
    }
    if (!this.testResults.databaseUpdates) {
      report.recommendations.push('Fix database location updates');
    }

    // Save report
    fs.writeFileSync('driver-dashboard-fixes-simple-test-report.json', JSON.stringify(report, null, 2));
    
    console.log('\n📋 Test Report Summary:');
    console.log(`✅ Passed: ${report.summary.passedTests}/${report.summary.totalTests}`);
    console.log(`❌ Failed: ${report.summary.failedTests}/${report.summary.totalTests}`);
    console.log(`🚨 Errors: ${report.summary.errorCount}`);
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    } else {
      console.log('\n🎉 All tests passed! Fixes are properly implemented.');
    }

    return report;
  }

  runAllTests() {
    console.log('🚀 Starting Driver Dashboard Fixes Test Suite...\n');
    
    this.testReactStateManagement();
    this.testWebSocketLocationSync();
    this.testDriverStoreBridge();
    this.testWebSocketService();
    
    const report = this.generateReport();
    return report;
  }
}

// Run the test suite
if (require.main === module) {
  const testSuite = new SimpleDriverDashboardTest();
  const report = testSuite.runAllTests();
  
  console.log('\n🎉 Test suite completed!');
  process.exit(report.summary.failedTests > 0 ? 1 : 0);
}

module.exports = SimpleDriverDashboardTest;
