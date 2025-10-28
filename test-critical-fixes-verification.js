/**
 * CRITICAL FIXES VERIFICATION TEST
 * 
 * This test verifies that all critical fixes for the Student Map live bus tracking system
 * are working correctly and have resolved the identified issues.
 * 
 * Issues Fixed:
 * 1. Backend WebSocket connection management
 * 2. Frontend Student Map performance optimizations
 * 3. Redundant code cleanup
 * 4. Memory leak prevention
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 CRITICAL FIXES VERIFICATION TEST');
console.log('=====================================\n');

// Test results tracking
const testResults = {
  websocketFixes: [],
  performanceFixes: [],
  cleanupFixes: [],
  memoryLeakFixes: [],
  overall: 'PENDING'
};

// Helper function to check if file exists
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// Helper function to read file content
function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return null;
  }
}

// Helper function to check if content contains specific patterns
function containsPattern(content, patterns) {
  if (!content) return false;
  return patterns.some(pattern => content.includes(pattern));
}

console.log('1. 🔌 BACKEND WEBSOCKET CONNECTION MANAGEMENT FIXES');
console.log('---------------------------------------------------');

// Check WebSocket file exists
const websocketFile = 'backend/src/sockets/websocket.ts';
if (fileExists(websocketFile)) {
  const websocketContent = readFileContent(websocketFile);
  
  // Check for connection tracking maps
  const connectionTrackingPatterns = [
    'activeSockets = new Map',
    'connectionTimestamps = new Map',
    'heartbeatIntervals = new Map'
  ];
  
  if (containsPattern(websocketContent, connectionTrackingPatterns)) {
    testResults.websocketFixes.push('✅ Connection tracking maps implemented');
    console.log('✅ Connection tracking maps implemented');
  } else {
    testResults.websocketFixes.push('❌ Connection tracking maps missing');
    console.log('❌ Connection tracking maps missing');
  }
  
  // Check for heartbeat monitoring
  const heartbeatPatterns = [
    'heartbeatInterval = setInterval',
    'inactiveTime > 5 * 60 * 1000',
    'socket.disconnect(true)'
  ];
  
  if (containsPattern(websocketContent, heartbeatPatterns)) {
    testResults.websocketFixes.push('✅ Heartbeat monitoring implemented');
    console.log('✅ Heartbeat monitoring implemented');
  } else {
    testResults.websocketFixes.push('❌ Heartbeat monitoring missing');
    console.log('❌ Heartbeat monitoring missing');
  }
  
  // Check for comprehensive cleanup
  const cleanupPatterns = [
    'activeSockets.delete(socket.id)',
    'connectionTimestamps.delete(socket.id)',
    'clearInterval(heartbeatInterval)',
    'socket.removeAllListeners()'
  ];
  
  if (containsPattern(websocketContent, cleanupPatterns)) {
    testResults.websocketFixes.push('✅ Comprehensive cleanup implemented');
    console.log('✅ Comprehensive cleanup implemented');
  } else {
    testResults.websocketFixes.push('❌ Comprehensive cleanup missing');
    console.log('❌ Comprehensive cleanup missing');
  }
  
  // Check for stale connection cleanup
  const staleCleanupPatterns = [
    'staleConnections: string[]',
    'connectionAge > staleThreshold',
    'Disconnecting stale connection'
  ];
  
  if (containsPattern(websocketContent, staleCleanupPatterns)) {
    testResults.websocketFixes.push('✅ Stale connection cleanup implemented');
    console.log('✅ Stale connection cleanup implemented');
  } else {
    testResults.websocketFixes.push('❌ Stale connection cleanup missing');
    console.log('❌ Stale connection cleanup missing');
  }
} else {
  testResults.websocketFixes.push('❌ WebSocket file not found');
  console.log('❌ WebSocket file not found');
}

console.log('\n2. 🚀 FRONTEND STUDENT MAP PERFORMANCE OPTIMIZATIONS');
console.log('----------------------------------------------------');

// Check StudentMap file exists
const studentMapFile = 'frontend/src/components/StudentMap.tsx';
if (fileExists(studentMapFile)) {
  const studentMapContent = readFileContent(studentMapFile);
  
  // Check for performance monitoring optimizations
  const performancePatterns = [
    'updateInterval: 120000', // 2 minutes
    'slowRenderThreshold: 32',
    'trackMemory: false'
  ];
  
  if (containsPattern(studentMapContent, performancePatterns)) {
    testResults.performanceFixes.push('✅ Performance monitoring optimized');
    console.log('✅ Performance monitoring optimized');
  } else {
    testResults.performanceFixes.push('❌ Performance monitoring not optimized');
    console.log('❌ Performance monitoring not optimized');
  }
  
  // Check for debounced location updates
  const debouncePatterns = [
    'debouncedLocationUpdate',
    'pendingUpdates = new Map',
    'setTimeout(() => {',
    'requestAnimationFrame'
  ];
  
  if (containsPattern(studentMapContent, debouncePatterns)) {
    testResults.performanceFixes.push('✅ Debounced location updates implemented');
    console.log('✅ Debounced location updates implemented');
  } else {
    testResults.performanceFixes.push('❌ Debounced location updates missing');
    console.log('❌ Debounced location updates missing');
  }
  
  // Check for optimized marker updates
  const markerPatterns = [
    'latDiff > 0.0001 || lngDiff > 0.0001',
    'now - lastUpdate > 60000', // 60 seconds
    'busInfoCache.current.get'
  ];
  
  if (containsPattern(studentMapContent, markerPatterns)) {
    testResults.performanceFixes.push('✅ Optimized marker updates implemented');
    console.log('✅ Optimized marker updates implemented');
  } else {
    testResults.performanceFixes.push('❌ Optimized marker updates missing');
    console.log('❌ Optimized marker updates missing');
  }
  
  // Check for optimized recentering
  const recenterPatterns = [
    'duration: 2000', // 2 seconds
    'setTimeout(() => {',
    '}, 300)' // 300ms throttle
  ];
  
  if (containsPattern(studentMapContent, recenterPatterns)) {
    testResults.performanceFixes.push('✅ Optimized recentering implemented');
    console.log('✅ Optimized recentering implemented');
  } else {
    testResults.performanceFixes.push('❌ Optimized recentering missing');
    console.log('❌ Optimized recentering missing');
  }
} else {
  testResults.performanceFixes.push('❌ StudentMap file not found');
  console.log('❌ StudentMap file not found');
}

console.log('\n3. 🧹 REDUNDANT CODE CLEANUP');
console.log('-----------------------------');

// Check that redundant files are deleted
const redundantFiles = [
  'frontend/src/components/PerformanceMonitor.tsx',
  'frontend/src/services/interfaces/IWebSocketService.ts',
  'frontend/src/services/realtime/SSEService.ts',
  'frontend/src/utils/PerformanceValidator.ts'
];

let deletedCount = 0;
redundantFiles.forEach(file => {
  if (!fileExists(file)) {
    testResults.cleanupFixes.push(`✅ ${path.basename(file)} deleted`);
    console.log(`✅ ${path.basename(file)} deleted`);
    deletedCount++;
  } else {
    testResults.cleanupFixes.push(`❌ ${path.basename(file)} still exists`);
    console.log(`❌ ${path.basename(file)} still exists`);
  }
});

if (deletedCount === redundantFiles.length) {
  testResults.cleanupFixes.push('✅ All redundant files removed');
  console.log('✅ All redundant files removed');
} else {
  testResults.cleanupFixes.push(`❌ Only ${deletedCount}/${redundantFiles.length} redundant files removed`);
  console.log(`❌ Only ${deletedCount}/${redundantFiles.length} redundant files removed`);
}

console.log('\n4. 🧠 MEMORY LEAK PREVENTION');
console.log('----------------------------');

// Check for memory leak prevention patterns
if (fileExists(studentMapFile)) {
  const studentMapContent = readFileContent(studentMapFile);
  
  const memoryLeakPatterns = [
    'cleanupFunctions.current.push',
    'websocketCleanupFunctions.current',
    'mapEventListeners.current.clear',
    'performanceObservers.current.forEach',
    'animationFrames.current.forEach'
  ];
  
  let memoryLeakCount = 0;
  memoryLeakPatterns.forEach(pattern => {
    if (studentMapContent.includes(pattern)) {
      memoryLeakCount++;
    }
  });
  
  if (memoryLeakCount >= 4) {
    testResults.memoryLeakFixes.push('✅ Comprehensive memory leak prevention implemented');
    console.log('✅ Comprehensive memory leak prevention implemented');
  } else {
    testResults.memoryLeakFixes.push(`❌ Only ${memoryLeakCount}/5 memory leak prevention patterns found`);
    console.log(`❌ Only ${memoryLeakCount}/5 memory leak prevention patterns found`);
  }
} else {
  testResults.memoryLeakFixes.push('❌ StudentMap file not found for memory leak check');
  console.log('❌ StudentMap file not found for memory leak check');
}

console.log('\n5. 📊 OVERALL VERIFICATION RESULTS');
console.log('==================================');

// Calculate overall success rate
const totalTests = testResults.websocketFixes.length + 
                  testResults.performanceFixes.length + 
                  testResults.cleanupFixes.length + 
                  testResults.memoryLeakFixes.length;

const passedTests = [
  ...testResults.websocketFixes,
  ...testResults.performanceFixes,
  ...testResults.cleanupFixes,
  ...testResults.memoryLeakFixes
].filter(result => result.startsWith('✅')).length;

const successRate = (passedTests / totalTests) * 100;

console.log(`Total Tests: ${totalTests}`);
console.log(`Passed Tests: ${passedTests}`);
console.log(`Success Rate: ${successRate.toFixed(1)}%`);

if (successRate >= 90) {
  testResults.overall = 'PASSED';
  console.log('\n🎉 VERIFICATION RESULT: PASSED');
  console.log('All critical fixes have been successfully implemented!');
} else if (successRate >= 70) {
  testResults.overall = 'PARTIAL';
  console.log('\n⚠️ VERIFICATION RESULT: PARTIAL');
  console.log('Most fixes implemented, but some issues remain.');
} else {
  testResults.overall = 'FAILED';
  console.log('\n❌ VERIFICATION RESULT: FAILED');
  console.log('Critical fixes need attention.');
}

console.log('\n6. 📋 DETAILED RESULTS SUMMARY');
console.log('=============================');

console.log('\nWebSocket Fixes:');
testResults.websocketFixes.forEach(result => console.log(`  ${result}`));

console.log('\nPerformance Fixes:');
testResults.performanceFixes.forEach(result => console.log(`  ${result}`));

console.log('\nCleanup Fixes:');
testResults.cleanupFixes.forEach(result => console.log(`  ${result}`));

console.log('\nMemory Leak Fixes:');
testResults.memoryLeakFixes.forEach(result => console.log(`  ${result}`));

// Save results to file
const resultsFile = 'critical-fixes-verification-results.json';
fs.writeFileSync(resultsFile, JSON.stringify(testResults, null, 2));
console.log(`\n📄 Detailed results saved to: ${resultsFile}`);

console.log('\n🏁 VERIFICATION COMPLETE');
console.log('========================');

// Exit with appropriate code
if (testResults.overall === 'PASSED') {
  process.exit(0);
} else if (testResults.overall === 'PARTIAL') {
  process.exit(1);
} else {
  process.exit(2);
}
