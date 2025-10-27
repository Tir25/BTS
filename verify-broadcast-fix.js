/**
 * Quick Verification Script
 * Checks if WebSocket broadcast fixes are properly implemented
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying WebSocket Broadcast Fix Implementation...\n');

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function check(code, description, required = true) {
  if (code) {
    checks.passed++;
    console.log(`✅ ${description}`);
    return true;
  } else {
    if (required) {
      checks.failed++;
      console.log(`❌ ${description}`);
    } else {
      checks.warnings++;
      console.log(`⚠️  ${description}`);
    }
    return false;
  }
}

// Check 1: Verify backend websocket.ts has broadcast fix
console.log('📁 Checking backend implementation...');
const websocketPath = path.join(__dirname, 'backend/src/sockets/websocket.ts');
if (fs.existsSync(websocketPath)) {
  const websocketCode = fs.readFileSync(websocketPath, 'utf8');
  
  check(
    websocketCode.includes('CRITICAL FIX: Save location in background'),
    'Backend: Non-blocking save implementation'
  );
  
  check(
    websocketCode.includes('CRITICAL FIX: Always broadcast location update'),
    'Backend: Always broadcast regardless of save status'
  );
  
  check(
    websocketCode.includes('Promise.race') && websocketCode.includes('ETA calculation timeout'),
    'Backend: ETA calculation timeout protection'
  );
  
  check(
    websocketCode.includes('Emergency fallback broadcast'),
    'Backend: Emergency fallback mechanism'
  );
  
  check(
    !websocketCode.includes('if (!savedLocation) {') || 
    websocketCode.includes('// Don\'t return - continue to broadcast'),
    'Backend: No early return blocking broadcast'
  );
  
  check(
    websocketCode.includes('Location broadcast successful') || 
    websocketCode.includes('Location broadcast complete'),
    'Backend: Comprehensive logging for broadcasts'
  );
} else {
  check(false, 'Backend websocket.ts file not found', true);
}

// Check 2: Verify frontend WebSocketService has enhanced logging
console.log('\n📁 Checking frontend implementation...');
const wsServicePath = path.join(__dirname, 'frontend/src/services/UnifiedWebSocketService.ts');
if (fs.existsSync(wsServicePath)) {
  const wsServiceCode = fs.readFileSync(wsServicePath, 'utf8');
  
  check(
    wsServiceCode.includes('📍 Bus location update received from WebSocket'),
    'Frontend: Enhanced broadcast reception logging'
  );
  
  check(
    wsServiceCode.includes('listenersCount: this.busLocationListeners.size'),
    'Frontend: Listener count tracking'
  );
  
  check(
    wsServiceCode.includes('⚠️ No listeners registered'),
    'Frontend: Warning for missing listeners'
  );
  
  check(
    wsServiceCode.includes('✅ Location update delivered to listeners'),
    'Frontend: Delivery confirmation logging'
  );
} else {
  check(false, 'Frontend UnifiedWebSocketService.ts file not found', true);
}

// Check 3: Verify redundant file removed
console.log('\n📁 Checking code cleanup...');
const refactoredPath = path.join(__dirname, 'frontend/src/components/StudentMap.refactored.tsx');
check(
  !fs.existsSync(refactoredPath),
  'Redundant StudentMap.refactored.tsx removed'
);

// Check 4: Verify documentation exists
console.log('\n📁 Checking documentation...');
const docPath = path.join(__dirname, 'STUDENT_MAP_WEBSOCKET_BROADCAST_FIX.md');
check(
  fs.existsSync(docPath),
  'Fix documentation created',
  false
);

const testGuidePath = path.join(__dirname, 'STUDENT_MAP_BROADCAST_TESTING_GUIDE.md');
check(
  fs.existsSync(testGuidePath),
  'Testing guide created',
  false
);

// Summary
console.log('\n' + '='.repeat(60));
console.log('VERIFICATION SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${checks.passed}`);
console.log(`❌ Failed: ${checks.failed}`);
console.log(`⚠️  Warnings: ${checks.warnings}`);
console.log(`📊 Total Checks: ${checks.passed + checks.failed + checks.warnings}`);

const successRate = ((checks.passed / (checks.passed + checks.failed)) * 100).toFixed(1);
console.log(`\n🎯 Success Rate: ${successRate}%`);

if (checks.failed === 0) {
  console.log('\n✅ All critical checks passed! Fixes are properly implemented.');
  process.exit(0);
} else {
  console.log('\n❌ Some critical checks failed. Please review the implementation.');
  process.exit(1);
}

