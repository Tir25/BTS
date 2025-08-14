# Phase 2 Test Script for University Bus Tracking System
# Run this script to test the Phase 2 implementation

Write-Host "🧪 Testing Phase 2: Real-time Location Tracking" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green

# Test 1: Check if backend is running
Write-Host "`n🔍 Test 1: Checking backend server..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method GET -TimeoutSec 5
    Write-Host "✅ Backend is running and responding" -ForegroundColor Green
    Write-Host "   Status: $($response.status)" -ForegroundColor Gray
    Write-Host "   Database: $($response.database)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Backend is not running or not accessible" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host "   Please start the backend server first: cd backend && npm run dev" -ForegroundColor Yellow
}

# Test 2: Check if frontend is running
Write-Host "`n🔍 Test 2: Checking frontend server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -Method GET -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Frontend is running and accessible" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Frontend responded with status: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Frontend is not running or not accessible" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host "   Please start the frontend server first: cd frontend && npm run dev" -ForegroundColor Yellow
}

# Test 3: Test WebSocket connection
Write-Host "`n🔍 Test 3: Testing WebSocket connection..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/health/detailed" -Method GET -TimeoutSec 5
    if ($response.websocket) {
        Write-Host "✅ WebSocket server is configured" -ForegroundColor Green
    } else {
        Write-Host "⚠️ WebSocket server status unknown" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Could not check WebSocket status" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
}

# Test 4: Check environment files
Write-Host "`n🔍 Test 4: Checking environment files..." -ForegroundColor Yellow
if (Test-Path "backend\.env") {
    Write-Host "✅ Backend .env file exists" -ForegroundColor Green
} else {
    Write-Host "❌ Backend .env file is missing" -ForegroundColor Red
    Write-Host "   Run the setup script: .\setup-phase2.ps1" -ForegroundColor Yellow
}

if (Test-Path "frontend\.env") {
    Write-Host "✅ Frontend .env file exists" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend .env file is missing" -ForegroundColor Red
    Write-Host "   Run the setup script: .\setup-phase2.ps1" -ForegroundColor Yellow
}

# Test 5: Check if dist folder exists
Write-Host "`n🔍 Test 5: Checking backend build..." -ForegroundColor Yellow
if (Test-Path "backend\dist\server.js") {
    Write-Host "✅ Backend is built and ready" -ForegroundColor Green
} else {
    Write-Host "❌ Backend is not built" -ForegroundColor Red
    Write-Host "   Run: cd backend && npm run build" -ForegroundColor Yellow
}

Write-Host "`n📋 Test Summary:" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan
Write-Host "If all tests pass, you can:" -ForegroundColor White
Write-Host "1. Open http://localhost:5173 in your browser" -ForegroundColor Gray
Write-Host "2. Navigate to /driver to test the driver interface" -ForegroundColor Gray
Write-Host "3. Test the WebSocket connection with the test script:" -ForegroundColor Gray
Write-Host "   cd backend && node test-websocket.js" -ForegroundColor Gray

Write-Host "`n🎉 Testing complete!" -ForegroundColor Green
