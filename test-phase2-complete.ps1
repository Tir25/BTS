# Phase 2 Complete Test Script
Write-Host "🧪 Phase 2 Complete Testing" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# Test 1: Backend Health
Write-Host "`n1️⃣ Testing Backend Health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend is healthy" -ForegroundColor Green
    } else {
        Write-Host "❌ Backend health check failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Backend is not running or not accessible" -ForegroundColor Red
}

# Test 2: Frontend Accessibility
Write-Host "`n2️⃣ Testing Frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Frontend is accessible" -ForegroundColor Green
    } else {
        Write-Host "❌ Frontend accessibility failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Frontend is not running or not accessible" -ForegroundColor Red
}

# Test 3: Environment Variables
Write-Host "`n3️⃣ Checking Environment Variables..." -ForegroundColor Yellow

if (Test-Path "backend\.env") {
    Write-Host "✅ Backend .env file exists" -ForegroundColor Green
} else {
    Write-Host "❌ Backend .env file missing" -ForegroundColor Red
}

if (Test-Path "frontend\.env") {
    Write-Host "✅ Frontend .env file exists" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend .env file missing" -ForegroundColor Red
}

Write-Host "`n🎉 Phase 2 Testing Complete!" -ForegroundColor Green
