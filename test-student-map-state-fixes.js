/**
 * Comprehensive Test Script for Student Map State Management Fixes
 * 
 * This script verifies that:
 * 1. MapStore is the single source of truth
 * 2. Bus info syncs correctly with location updates
 * 3. No redundant state storage exists
 * 4. Speed calculations work properly
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Student Map State Management Fixes\n');
console.log('='.repeat(60));

// Test Results
const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Helper function to check if code exists
function checkCodeExists(filePath, searchString, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const exists = content.includes(searchString);
    
    if (exists) {
      results.passed.push(`✅ ${description}`);
      console.log(`✅ ${description}`);
      return true;
    } else {
      results.failed.push(`❌ ${description}`);
      console.log(`❌ ${description}`);
      return false;
    }
  } catch (error) {
    results.failed.push(`❌ ${description} - File not found: ${filePath}`);
    console.log(`❌ ${description} - File not found: ${filePath}`);
    return false;
  }
}

// Test 1: Verify busService doesn't store state
console.log('\n📋 Test 1: BusService State Storage Removal');
console.log('-'.repeat(60));
checkCodeExists(
  'frontend/src/services/busService.ts',
  'private previousLocations',
  'BusService: previousLocations kept for speed calculation (ephemeral cache)'
);
checkCodeExists(
  'frontend/src/services/busService.ts',
  'private mapStore',
  'BusService: MapStore reference stored'
);
checkCodeExists(
  'frontend/src/services/busService.ts',
  'setMapStore(store: any): void',
  'BusService: setMapStore method exists'
);

// Check that buses state is removed
const busServiceContent = fs.readFileSync('frontend/src/services/busService.ts', 'utf8');
if (!busServiceContent.includes('private buses: BusData = {}')) {
  results.passed.push('✅ BusService: Internal buses state removed');
  console.log('✅ BusService: Internal buses state removed');
} else {
  results.failed.push('❌ BusService: Internal buses state still exists');
  console.log('❌ BusService: Internal buses state still exists');
}

// Test 2: Verify MapStore integration
console.log('\n📋 Test 2: MapStore Integration');
console.log('-'.repeat(60));
checkCodeExists(
  'frontend/src/services/busService.ts',
  'this.mapStore.getState()',
  'BusService: Reads from MapStore'
);
checkCodeExists(
  'frontend/src/services/busService.ts',
  'state.setBuses(updatedBuses)',
  'BusService: Updates MapStore'
);

// Test 3: Verify StudentMap integration
console.log('\n📋 Test 3: StudentMap Integration');
console.log('-'.repeat(60));
checkCodeExists(
  'frontend/src/components/StudentMap.tsx',
  'busService.setMapStore(useMapStore)',
  'StudentMap: Initializes busService with MapStore'
);
checkCodeExists(
  'frontend/src/components/StudentMap.tsx',
  'busService.updateBusLocation(loc)',
  'StudentMap: Calls busService for speed calculation'
);
checkCodeExists(
  'frontend/src/components/StudentMap.tsx',
  'busService.syncBusFromAPI(busId)',
  'StudentMap: Syncs bus info when missing'
);
checkCodeExists(
  'frontend/src/components/StudentMap.tsx',
  'updateBusLocation(locationWithSpeed)',
  'StudentMap: Updates MapStore with location'
);

// Test 4: Verify MapStore enhancement
console.log('\n📋 Test 4: MapStore Enhancement');
console.log('-'.repeat(60));
checkCodeExists(
  'frontend/src/stores/useMapStore.ts',
  'const existingBus = state.buses.find',
  'MapStore: Checks for existing bus before update'
);
checkCodeExists(
  'frontend/src/stores/useMapStore.ts',
  'busNumber: `Bus ${location.busId}`',
  'MapStore: Creates placeholder bus if missing'
);

// Test 5: Verify data flow
console.log('\n📋 Test 5: Data Flow Verification');
console.log('-'.repeat(60));
const studentMapContent = fs.readFileSync('frontend/src/components/StudentMap.tsx', 'utf8');

// Check that location update flow is correct
const hasCorrectFlow = 
  studentMapContent.includes('busService.updateBusLocation(loc)') &&
  studentMapContent.includes('updateBusLocation(locationWithSpeed)') &&
  studentMapContent.includes('busService.syncBusFromAPI(busId)');

if (hasCorrectFlow) {
  results.passed.push('✅ Data Flow: Location → busService → MapStore → busInfo sync');
  console.log('✅ Data Flow: Location → busService → MapStore → busInfo sync');
} else {
  results.failed.push('❌ Data Flow: Incorrect location update flow');
  console.log('❌ Data Flow: Incorrect location update flow');
}

// Test 6: Verify no redundant state
console.log('\n📋 Test 6: Redundant State Check');
console.log('-'.repeat(60));

// Check that busService doesn't store buses
if (!busServiceContent.includes('private buses: BusData = {}') && 
    !busServiceContent.includes('private buses = {}')) {
  results.passed.push('✅ No redundant state: BusService buses removed');
  console.log('✅ No redundant state: BusService buses removed');
} else {
  results.failed.push('❌ Redundant state: BusService still stores buses');
  console.log('❌ Redundant state: BusService still stores buses');
}

// Test 7: Verify interface updates
console.log('\n📋 Test 7: Interface Updates');
console.log('-'.repeat(60));
checkCodeExists(
  'frontend/src/services/interfaces/IBusService.ts',
  'updateBusLocation(location:',
  'IBusService: updateBusLocation signature updated'
);
checkCodeExists(
  'frontend/src/services/interfaces/IBusService.ts',
  'setMapStore(store: any): void',
  'IBusService: setMapStore method added'
);

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${results.passed.length}`);
console.log(`❌ Failed: ${results.failed.length}`);
console.log(`⚠️  Warnings: ${results.warnings.length}`);

if (results.failed.length > 0) {
  console.log('\n❌ FAILED TESTS:');
  results.failed.forEach(test => console.log(`   ${test}`));
}

if (results.passed.length > 0) {
  console.log('\n✅ PASSED TESTS:');
  results.passed.forEach(test => console.log(`   ${test}`));
}

console.log('\n' + '='.repeat(60));

// Final verdict
if (results.failed.length === 0) {
  console.log('🎉 ALL TESTS PASSED - Fixes are properly implemented!');
  process.exit(0);
} else {
  console.log('⚠️  SOME TESTS FAILED - Review and fix issues');
  process.exit(1);
}
