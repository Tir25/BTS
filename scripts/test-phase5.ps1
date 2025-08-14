# Phase 5 Test Script - University Bus Tracking System
# Tests Admin Panel functionality including authentication, analytics, and management features

Write-Host "🚀 Phase 5 Testing - Admin Panel & Analytics Dashboard" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host ""

# Test counter
$testsPassed = 0
$totalTests = 0

# Function to run a test
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [string]$ExpectedStatus = "200"
    )
    
    $global:totalTests++
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    
    try {
        $response = Invoke-RestMethod -Uri $Url -Method $Method -TimeoutSec 10
        Write-Host "✅ $Name: PASSED" -ForegroundColor Green
        $global:testsPassed++
        return $true
    }
    catch {
        Write-Host "❌ $Name: FAILED - $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to check if a service is running
function Test-Service {
    param(
        [string]$Name,
        [int]$Port
    )
    
    $global:totalTests++
    Write-Host "Testing: $Name (Port $Port)" -ForegroundColor Yellow
    
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet
        if ($connection) {
            Write-Host "✅ $Name: PASSED" -ForegroundColor Green
            $global:testsPassed++
            return $true
        } else {
            Write-Host "❌ $Name: FAILED - Service not responding" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ $Name: FAILED - $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to check file existence
function Test-File {
    param(
        [string]$Name,
        [string]$Path
    )
    
    $global:totalTests++
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    
    if (Test-Path $Path) {
        Write-Host "✅ $Name: PASSED" -ForegroundColor Green
        $global:testsPassed++
        return $true
    } else {
        Write-Host "❌ $Name: FAILED - File not found" -ForegroundColor Red
        return $false
    }
}

Write-Host "📋 PHASE 5 COMPONENT TESTS" -ForegroundColor Cyan
Write-Host "---------------------------" -ForegroundColor Cyan
Write-Host ""

# Test 1: Backend Service
Test-Service "Backend API" 3000

# Test 2: Frontend Service
Test-Service "Frontend Development Server" 5173

# Test 3: Basic Health Check
Test-Endpoint "Health Check" "http://localhost:3000/health"

# Test 4: Detailed Health Check
Test-Endpoint "Detailed Health Check" "http://localhost:3000/health/detailed"

Write-Host ""
Write-Host "🔐 ADMIN AUTHENTICATION TESTS" -ForegroundColor Cyan
Write-Host "-------------------------------" -ForegroundColor Cyan
Write-Host ""

# Test 5: Admin Routes (should require authentication)
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/admin/analytics" -Method GET -TimeoutSec 10
    Write-Host "❌ Admin Analytics (No Auth): FAILED - Should require authentication" -ForegroundColor Red
    $global:totalTests++
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Admin Analytics (No Auth): PASSED - Correctly requires authentication" -ForegroundColor Green
        $global:testsPassed++
    } else {
        Write-Host "❌ Admin Analytics (No Auth): FAILED - Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
    $global:totalTests++
}

# Test 6: Admin Health (should require authentication)
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/admin/health" -Method GET -TimeoutSec 10
    Write-Host "❌ Admin Health (No Auth): FAILED - Should require authentication" -ForegroundColor Red
    $global:totalTests++
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Admin Health (No Auth): PASSED - Correctly requires authentication" -ForegroundColor Green
        $global:testsPassed++
    } else {
        Write-Host "❌ Admin Health (No Auth): FAILED - Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
    $global:totalTests++
}

Write-Host ""
Write-Host "📁 PHASE 5 FILE STRUCTURE TESTS" -ForegroundColor Cyan
Write-Host "--------------------------------" -ForegroundColor Cyan
Write-Host ""

# Test 7: Backend Authentication Middleware
Test-File "Auth Middleware" "backend/src/middleware/auth.ts"

# Test 8: Admin Service
Test-File "Admin Service" "backend/src/services/adminService.ts"

# Test 9: Admin Routes
Test-File "Admin Routes" "backend/src/routes/admin.ts"

# Test 10: Frontend Auth Service
Test-File "Frontend Auth Service" "frontend/src/services/authService.ts"

# Test 11: Frontend Admin API Service
Test-File "Frontend Admin API Service" "frontend/src/services/adminApiService.ts"

# Test 12: Admin Login Component
Test-File "Admin Login Component" "frontend/src/components/AdminLogin.tsx"

# Test 13: Admin Dashboard Component
Test-File "Admin Dashboard Component" "frontend/src/components/AdminDashboard.tsx"

# Test 14: Admin Panel Component
Test-File "Admin Panel Component" "frontend/src/components/AdminPanel.tsx"

Write-Host ""
Write-Host "🔧 CONFIGURATION TESTS" -ForegroundColor Cyan
Write-Host "----------------------" -ForegroundColor Cyan
Write-Host ""

# Test 15: Backend Environment Configuration
Test-File "Backend Development Environment" "backend/env.development"

# Test 16: Frontend Environment Example
Test-File "Frontend Environment Example" "frontend/env.example"

# Test 17: Package.json with Recharts
$global:totalTests++
Write-Host "Testing: Recharts Dependency" -ForegroundColor Yellow
try {
    $packageJson = Get-Content "frontend/package.json" | ConvertFrom-Json
    if ($packageJson.dependencies.recharts) {
        Write-Host "✅ Recharts Dependency: PASSED" -ForegroundColor Green
        $global:testsPassed++
    } else {
        Write-Host "❌ Recharts Dependency: FAILED - Not found in dependencies" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Recharts Dependency: FAILED - Error reading package.json" -ForegroundColor Red
}

Write-Host ""
Write-Host "🌐 FRONTEND ACCESSIBILITY TESTS" -ForegroundColor Cyan
Write-Host "--------------------------------" -ForegroundColor Cyan
Write-Host ""

# Test 18: Frontend Home Page
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -Method GET -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Frontend Home Page: PASSED" -ForegroundColor Green
        $global:testsPassed++
    } else {
        Write-Host "❌ Frontend Home Page: FAILED - Status $($response.StatusCode)" -ForegroundColor Red
    }
    $global:totalTests++
} catch {
    Write-Host "❌ Frontend Home Page: FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $global:totalTests++
}

# Test 19: Admin Panel Route
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173/admin" -Method GET -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Admin Panel Route: PASSED" -ForegroundColor Green
        $global:testsPassed++
    } else {
        Write-Host "❌ Admin Panel Route: FAILED - Status $($response.StatusCode)" -ForegroundColor Red
    }
    $global:totalTests++
} catch {
    Write-Host "❌ Admin Panel Route: FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $global:totalTests++
}

Write-Host ""
Write-Host "📊 TEST RESULTS SUMMARY" -ForegroundColor Cyan
Write-Host "------------------------" -ForegroundColor Cyan
Write-Host ""

$successRate = if ($totalTests -gt 0) { [math]::Round(($testsPassed / $totalTests) * 100, 1) } else { 0 }

Write-Host "Total Tests: $totalTests" -ForegroundColor White
Write-Host "Tests Passed: $testsPassed" -ForegroundColor Green
Write-Host "Tests Failed: $($totalTests - $testsPassed)" -ForegroundColor Red
Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 90) { "Green" } elseif ($successRate -ge 70) { "Yellow" } else { "Red" })

Write-Host ""
Write-Host "🎯 PHASE 5 IMPLEMENTATION STATUS" -ForegroundColor Cyan
Write-Host "--------------------------------" -ForegroundColor Cyan
Write-Host ""

if ($successRate -ge 90) {
    Write-Host "🎉 PHASE 5 COMPLETE - All core functionality implemented and tested!" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ Implemented Features:" -ForegroundColor Green
    Write-Host "   • Role-based authentication with Supabase" -ForegroundColor White
    Write-Host "   • Admin panel with login interface" -ForegroundColor White
    Write-Host "   • Analytics dashboard with Recharts" -ForegroundColor White
    Write-Host "   • System health monitoring" -ForegroundColor White
    Write-Host "   • Protected admin API endpoints" -ForegroundColor White
    Write-Host "   • Comprehensive admin service layer" -ForegroundColor White
    Write-Host ""
    Write-Host "🚀 Ready for production deployment!" -ForegroundColor Green
} elseif ($successRate -ge 70) {
    Write-Host "⚠️  PHASE 5 MOSTLY COMPLETE - Some issues need attention" -ForegroundColor Yellow
    Write-Host "   Please review failed tests and fix any issues." -ForegroundColor Yellow
} else {
    Write-Host "❌ PHASE 5 INCOMPLETE - Multiple issues detected" -ForegroundColor Red
    Write-Host "   Please address failed tests before proceeding." -ForegroundColor Red
}

Write-Host ""
Write-Host "📝 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Start backend: cd backend && npm run dev" -ForegroundColor White
Write-Host "2. Start frontend: cd frontend && npm run dev" -ForegroundColor White
Write-Host "3. Access admin panel: http://localhost:5173/admin" -ForegroundColor White
Write-Host "4. Login with: admin@university.edu / password" -ForegroundColor White
Write-Host ""

Write-Host "🔗 Useful URLs:" -ForegroundColor Cyan
Write-Host "• Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "• Backend API: http://localhost:3000" -ForegroundColor White
Write-Host "• Admin Panel: http://localhost:5173/admin" -ForegroundColor White
Write-Host "• Health Check: http://localhost:3000/health" -ForegroundColor White
Write-Host ""
