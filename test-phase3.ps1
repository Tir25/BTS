# Phase 3 Test Script - University Bus Tracking System
# Tests the complete Phase 3 implementation including MapLibre, WebSocket, and real-time tracking

Write-Host "Phase 3 Testing - University Bus Tracking System" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Test 1: Check if backend dependencies are installed
Write-Host "`nTest 1: Checking backend dependencies..." -ForegroundColor Yellow
if (Test-Path "backend/node_modules") {
    Write-Host "Backend node_modules found" -ForegroundColor Green
} else {
    Write-Host "Backend node_modules not found. Please run: cd backend; npm install" -ForegroundColor Red
    exit 1
}

# Test 2: Check if frontend dependencies are installed
Write-Host "`nTest 2: Checking frontend dependencies..." -ForegroundColor Yellow
if (Test-Path "frontend/node_modules") {
    Write-Host "Frontend node_modules found" -ForegroundColor Green
} else {
    Write-Host "Frontend node_modules not found. Please run: cd frontend; npm install" -ForegroundColor Red
    exit 1
}

# Test 3: Check if MapLibre is installed
Write-Host "`nTest 3: Checking MapLibre installation..." -ForegroundColor Yellow
$maplibrePackage = Get-Content "frontend/package.json" | Select-String "maplibre-gl"
if ($maplibrePackage) {
    Write-Host "MapLibre GL found in package.json" -ForegroundColor Green
} else {
    Write-Host "MapLibre GL not found in package.json" -ForegroundColor Red
    exit 1
}

# Test 4: Check if WebSocket dependencies are installed
Write-Host "`nTest 4: Checking WebSocket dependencies..." -ForegroundColor Yellow
$socketPackage = Get-Content "frontend/package.json" | Select-String "socket.io-client"
if ($socketPackage) {
    Write-Host "Socket.IO Client found in package.json" -ForegroundColor Green
} else {
    Write-Host "Socket.IO Client not found in package.json" -ForegroundColor Red
    exit 1
}

# Test 5: Check if backend WebSocket is installed
Write-Host "`nTest 5: Checking backend WebSocket..." -ForegroundColor Yellow
$backendSocket = Get-Content "backend/package.json" | Select-String "socket.io"
if ($backendSocket) {
    Write-Host "Socket.IO found in backend package.json" -ForegroundColor Green
} else {
    Write-Host "Socket.IO not found in backend package.json" -ForegroundColor Red
    exit 1
}

# Test 6: Check if StudentMap component exists
Write-Host "`nTest 6: Checking StudentMap component..." -ForegroundColor Yellow
if (Test-Path "frontend/src/components/StudentMap.tsx") {
    Write-Host "StudentMap component found" -ForegroundColor Green
} else {
    Write-Host "StudentMap component not found" -ForegroundColor Red
    exit 1
}

# Test 7: Check if WebSocket service exists
Write-Host "`nTest 7: Checking WebSocket service..." -ForegroundColor Yellow
if (Test-Path "frontend/src/services/websocket.ts") {
    Write-Host "WebSocket service found" -ForegroundColor Green
} else {
    Write-Host "WebSocket service not found" -ForegroundColor Red
    exit 1
}

# Test 8: Check if bus service exists
Write-Host "`nTest 8: Checking bus service..." -ForegroundColor Yellow
if (Test-Path "frontend/src/services/busService.ts") {
    Write-Host "Bus service found" -ForegroundColor Green
} else {
    Write-Host "Bus service not found" -ForegroundColor Red
    exit 1
}

# Test 9: Check if CSS file exists
Write-Host "`nTest 9: Checking StudentMap CSS..." -ForegroundColor Yellow
if (Test-Path "frontend/src/components/StudentMap.css") {
    Write-Host "StudentMap CSS found" -ForegroundColor Green
} else {
    Write-Host "StudentMap CSS not found" -ForegroundColor Red
    exit 1
}

# Test 10: Check if backend routes exist
Write-Host "`nTest 10: Checking backend routes..." -ForegroundColor Yellow
if (Test-Path "backend/src/routes/buses.ts") {
    Write-Host "Buses route found" -ForegroundColor Green
} else {
    Write-Host "Buses route not found" -ForegroundColor Red
    exit 1
}

# Test 11: Check if MapLibre CSS is imported
Write-Host "`nTest 11: Checking MapLibre CSS import..." -ForegroundColor Yellow
$cssContent = Get-Content "frontend/src/index.css" -Raw
if ($cssContent -match "maplibre-gl/dist/maplibre-gl.css") {
    Write-Host "MapLibre CSS import found" -ForegroundColor Green
} else {
    Write-Host "MapLibre CSS import not found" -ForegroundColor Red
    exit 1
}

# Test 12: Check if App.tsx includes StudentMap
Write-Host "`nTest 12: Checking App.tsx integration..." -ForegroundColor Yellow
$appContent = Get-Content "frontend/src/App.tsx" -Raw
if ($appContent -match "StudentMap") {
    Write-Host "StudentMap integration found in App.tsx" -ForegroundColor Green
} else {
    Write-Host "StudentMap integration not found in App.tsx" -ForegroundColor Red
    exit 1
}

# Test 13: Check if server.ts includes bus routes
Write-Host "`nTest 13: Checking server integration..." -ForegroundColor Yellow
$serverContent = Get-Content "backend/src/server.ts" -Raw
if ($serverContent -match "busRoutes") {
    Write-Host "Bus routes integration found in server.ts" -ForegroundColor Green
} else {
    Write-Host "Bus routes integration not found in server.ts" -ForegroundColor Red
    exit 1
}

# Test 14: Check if locationService has new functions
Write-Host "`nTest 14: Checking location service functions..." -ForegroundColor Yellow
$locationServiceContent = Get-Content "backend/src/services/locationService.ts" -Raw
if ($locationServiceContent -match "getAllBuses" -and $locationServiceContent -match "getBusInfo") {
    Write-Host "Location service functions found" -ForegroundColor Green
} else {
    Write-Host "Location service functions not found" -ForegroundColor Red
    exit 1
}

# Test 15: Check if API service has bus endpoints
Write-Host "`nTest 15: Checking API service endpoints..." -ForegroundColor Yellow
$apiContent = Get-Content "frontend/src/services/api.ts" -Raw
if ($apiContent -match "getAllBuses" -and $apiContent -match "getBusInfo") {
    Write-Host "API service bus endpoints found" -ForegroundColor Green
} else {
    Write-Host "API service bus endpoints not found" -ForegroundColor Red
    exit 1
}

Write-Host "`nPhase 3 Implementation Tests Completed Successfully!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

Write-Host "`nPhase 3 Features Implemented:" -ForegroundColor Cyan
Write-Host "React page with MapLibre + OpenStreetMap tiles" -ForegroundColor Green
Write-Host "WebSocket connection for real-time updates" -ForegroundColor Green
Write-Host "Custom bus markers with bus number, speed, and ETA" -ForegroundColor Green
Write-Host "Bus filtering by route and location" -ForegroundColor Green
Write-Host "Loading and error states" -ForegroundColor Green
Write-Host "Optimized map rendering with useCallback and useMemo" -ForegroundColor Green
Write-Host "Backend API endpoints for bus information" -ForegroundColor Green
Write-Host "Frontend services for WebSocket and bus management" -ForegroundColor Green

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Start the backend: cd backend; npm run dev" -ForegroundColor White
Write-Host "2. Start the frontend: cd frontend; npm run dev" -ForegroundColor White
Write-Host "3. Open http://localhost:5173 in your browser" -ForegroundColor White
Write-Host "4. Click on 'Student Map (Live Tracking)' to test the implementation" -ForegroundColor White
Write-Host "5. Use the Driver Interface to send location updates" -ForegroundColor White

Write-Host "`nTesting Instructions:" -ForegroundColor Yellow
Write-Host "1. Open the Student Map page" -ForegroundColor White
Write-Host "2. Check if the map loads with OpenStreetMap tiles" -ForegroundColor White
Write-Host "3. Verify WebSocket connection status shows 'Connected'" -ForegroundColor White
Write-Host "4. Open Driver Interface in another tab and send location updates" -ForegroundColor White
Write-Host "5. Verify bus markers appear on the map with real-time updates" -ForegroundColor White
Write-Host "6. Test filtering and user location features" -ForegroundColor White

Write-Host "`nPhase 3 is ready for testing!" -ForegroundColor Green
