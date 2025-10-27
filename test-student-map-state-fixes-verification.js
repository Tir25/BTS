/**
 * Student Map State Management Fixes - Verification Test
 * 
 * This test verifies that:
 * 1. MapStore is the single source of truth
 * 2. BusService integrates properly with MapStore
 * 3. Bus info syncs with location updates
 * 4. No redundant state storage exists
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Student Map State Management Fixes...\n');

// Test results
const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Helper to add test result
function addResult(test, passed, message) {
  if (passed) {
    results.passed.push({ test, message });
    console.log(`✅ ${test}: ${message}`);
  } else {
    results.failed.push({ test, message });
    console.log(`❌ ${test}: ${message}`);
  }
}

// Helper to add warning
function addWarning(test, message) {
  results.warnings.push({ test, message });
  console.log(`⚠️  ${test}: ${message}`);
}

// Test 1: Verify busService.ts has no internal state storage
console.log('\n📋 Test 1: Checking busService.ts for redundant state...');
try {
  const busServicePath = path.join(__dirname, 'frontend/src/services/busService.ts');
  const busServiceCode = fs.readFileSync(busServicePath, 'utf8');
  
  // Check that internal buses state is removed
  const hasInternalBuses = /private buses:\s*BusData\s*=\s*\{\}/.test(busServiceCode);
  addResult('BusService internal state removed', !hasInternalBuses, 
    hasInternalBuses ? 'Internal buses state still exists' : 'Internal buses state removed correctly');
  
  // Check that MapStore integration exists
  const hasMapStoreIntegration = /setMapStore/.test(busServiceCode) && /mapStore/.test(busServiceCode);
  addResult('MapStore integration exists', hasMapStoreIntegration,
    hasMapStoreIntegration ? 'MapStore integration found' : 'MapStore integration missing');
  
  // Check that updateBusLocation returns location (not void)
  const returnsLocation = /updateBusLocation\(location: BusLocation\):\s*BusLocation/.test(busServiceCode);
  addResult('updateBusLocation returns location', returnsLocation,
    returnsLocation ? 'Returns location with speed' : 'Still returns void');
  
} catch (error) {
  addResult('BusService file check', false, `Error: ${error.message}`);
}

// Test 2: Verify StudentMap.tsx initializes busService with MapStore
console.log('\n📋 Test 2: Checking StudentMap.tsx integration...');
try {
  const studentMapPath = path.join(__dirname, 'frontend/src/components/StudentMap.tsx');
  const studentMapCode = fs.readFileSync(studentMapPath, 'utf8');
  
  // Check that busService.setMapStore is called
  const hasInit = /busService\.setMapStore\(useMapStore\)/.test(studentMapCode);
  addResult('BusService initialized with MapStore', hasInit,
    hasInit ? 'MapStore reference set correctly' : 'Missing MapStore initialization');
  
  // Check that busService.updateBusLocation is called for speed calculation
  const hasSpeedCalc = /busService\.updateBusLocation\(/.test(studentMapCode);
  addResult('Speed calculation integrated', hasSpeedCalc,
    hasSpeedCalc ? 'Speed calculation via busService found' : 'Speed calculation missing');
  
  // Check that bus info sync happens
  const hasBusInfoSync = /busService\.syncBusFromAPI\(busId\)/.test(studentMapCode);
  addResult('Bus info sync on location update', hasBusInfoSync,
    hasBusInfoSync ? 'Auto-sync bus info implemented' : 'Auto-sync missing');
  
} catch (error) {
  addResult('StudentMap file check', false, `Error: ${error.message}`);
}

// Test 3: Verify MapStore handles missing buses correctly
console.log('\n📋 Test 3: Checking MapStore updateBusLocation...');
try {
  const mapStorePath = path.join(__dirname, 'frontend/src/stores/useMapStore.ts');
  const mapStoreCode = fs.readFileSync(mapStorePath, 'utf8');
  
  // Check that updateBusLocation creates placeholder if bus missing
  const createsPlaceholder = /existingBus.*find.*busId/.test(mapStoreCode) && 
                             /Placeholder/.test(mapStoreCode);
  addResult('MapStore creates placeholder buses', createsPlaceholder,
    createsPlaceholder ? 'Handles missing buses correctly' : 'Missing placeholder logic');
  
} catch (error) {
  addResult('MapStore file check', false, `Error: ${error.message}`);
}

// Test 4: Verify interface matches implementation
console.log('\n📋 Test 4: Checking interface compatibility...');
try {
  const interfacePath = path.join(__dirname, 'frontend/src/services/interfaces/IBusService.ts');
  const interfaceCode = fs.readFileSync(interfacePath, 'utf8');
  
  // Check that interface has correct return types
  const hasCorrectReturnType = /updateBusLocation.*BusLocation.*BusLocation/.test(interfaceCode);
  addResult('Interface return types correct', hasCorrectReturnType,
    hasCorrectReturnType ? 'Return types match implementation' : 'Return types mismatch');
  
  // Check that setMapStore is in interface
  const hasSetMapStore = /setMapStore/.test(interfaceCode);
  addResult('setMapStore in interface', hasSetMapStore,
    hasSetMapStore ? 'Interface includes setMapStore' : 'setMapStore missing from interface');
  
} catch (error) {
  addResult('Interface file check', false, `Error: ${error.message}`);
}

// Test 5: Check for any remaining redundant state
console.log('\n📋 Test 5: Checking for redundant state storage...');
try {
  const busServicePath = path.join(__dirname, 'frontend/src/services/busService.ts');
  const busServiceCode = fs.readFileSync(busServicePath, 'utf8');
  
  // Count occurrences of state storage patterns
  const busesPattern = /this\.buses\[/g;
  const busesMatches = (busServiceCode.match(busesPattern) || []).length;
  
  // Should only have references for reading from MapStore, not storing
  // Previous locations cache is OK (for speed calculation)
  const hasStateStorage = busesMatches > 0 && /this\.buses\s*=/.test(busServiceCode);
  addResult('No redundant state storage', !hasStateStorage,
    hasStateStorage ? `Found ${busesMatches} references to internal buses state` : 'No redundant state storage');
  
} catch (error) {
  addResult('Redundant state check', false, `Error: ${error.message}`);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${results.passed.length}`);
console.log(`❌ Failed: ${results.failed.length}`);
console.log(`⚠️  Warnings: ${results.warnings.length}`);

if (results.failed.length > 0) {
  console.log('\n❌ FAILED TESTS:');
  results.failed.forEach(({ test, message }) => {
    console.log(`  - ${test}: ${message}`);
  });
}

if (results.warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:');
  results.warnings.forEach(({ test, message }) => {
    console.log(`  - ${test}: ${message}`);
  });
}

if (results.passed.length > 0) {
  console.log('\n✅ PASSED TESTS:');
  results.passed.forEach(({ test, message }) => {
    console.log(`  - ${test}: ${message}`);
  });
}

// Final result
const allPassed = results.failed.length === 0;
console.log('\n' + '='.repeat(60));
if (allPassed) {
  console.log('✅ ALL TESTS PASSED - Changes verified successfully!');
  console.log('='.repeat(60));
  process.exit(0);
} else {
  console.log('❌ SOME TESTS FAILED - Please review the issues above');
  console.log('='.repeat(60));
  process.exit(1);
}

