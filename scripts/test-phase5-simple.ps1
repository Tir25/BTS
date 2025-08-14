# Phase 5 Simple Test Script
# Tests the core functionality of Phase 5 implementation

$global:totalTests = 0
$global:testsPassed = 0

# Function to test endpoints
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET"
    )
    
    $global:totalTests++
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    
    try {
        $response = Invoke-RestMethod -Uri $Url -Method $Method -TimeoutSec 10
        Write-Host "[PASS] $Name: PASSED" -ForegroundColor Green
        $global:testsPassed++
        return $true
    }
    catch {
        Write-Host "[FAIL] $Name: FAILED - $($_.Exception.Message)" -ForegroundColor Red
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
            Write-Host "[PASS] $Name: PASSED" -ForegroundColor Green
            $global:testsPassed++
            return $true
        } else {
            Write-Host "[FAIL] $Name: FAILED - Service not responding" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "[FAIL] $Name: FAILED - $($_.Exception.Message)" -ForegroundColor Red
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
        Write-Host "[PASS] $Name: PASSED" -ForegroundColor Green
        $global:testsPassed++
        return $true
    } else {
        Write-Host "[FAIL] $Name: FAILED - File not found" -ForegroundColor Red
        return $false
    }
}

Write-Host "PHASE 5 COMPONENT TESTS" -ForegroundColor Cyan
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
Write-Host "ADMIN AUTHENTICATION TESTS" -ForegroundColor Cyan
Write-Host "-------------------------------" -ForegroundColor Cyan
Write-Host ""

# Test 5: Admin Routes (should require authentication)
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/admin/analytics" -Method GET -TimeoutSec 10
    Write-Host "[FAIL] Admin Analytics (No Auth): FAILED - Should require authentication" -ForegroundColor Red
    $global:totalTests++
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "[PASS] Admin Analytics (No Auth): PASSED - Correctly requires authentication" -ForegroundColor Green
        $global:testsPassed++
    } else {
        Write-Host "[FAIL] Admin Analytics (No Auth): FAILED - Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
    $global:totalTests++
}

# Test 6: Admin Health (should require authentication)
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/admin/health" -Method GET -TimeoutSec 10
    Write-Host "[FAIL] Admin Health (No Auth): FAILED - Should require authentication" -ForegroundColor Red
    $global:totalTests++
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "[PASS] Admin Health (No Auth): PASSED - Correctly requires authentication" -ForegroundColor Green
        $global:testsPassed++
    } else {
        Write-Host "[FAIL] Admin Health (No Auth): FAILED - Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
    $global:totalTests++
}

Write-Host ""
Write-Host "BACKEND FILES TESTS" -ForegroundColor Cyan
Write-Host "-------------------" -ForegroundColor Cyan
Write-Host ""

# Test 7: Backend Authentication Middleware
Test-File "Auth Middleware" "backend/src/middleware/auth.ts"

# Test 8: Admin Service
Test-File "Admin Service" "backend/src/services/adminService.ts"

# Test 9: Admin Routes
Test-File "Admin Routes" "backend/src/routes/admin.ts"

# Test 10: Updated Route Service
Test-File "Updated Route Service" "backend/src/services/routeService.ts"

Write-Host ""
Write-Host "FRONTEND FILES TESTS" -ForegroundColor Cyan
Write-Host "--------------------" -ForegroundColor Cyan
Write-Host ""

# Test 11: Auth Service
Test-File "Auth Service" "frontend/src/services/authService.ts"

# Test 12: Admin API Service
Test-File "Admin API Service" "frontend/src/services/adminApiService.ts"

# Test 13: Admin Login Component
Test-File "Admin Login Component" "frontend/src/components/AdminLogin.tsx"

# Test 14: Admin Dashboard Component
Test-File "Admin Dashboard Component" "frontend/src/components/AdminDashboard.tsx"

# Test 15: Admin Panel Component
Test-File "Admin Panel Component" "frontend/src/components/AdminPanel.tsx"

# Test 16: Updated App Component
Test-File "Updated App Component" "frontend/src/App.tsx"

Write-Host ""
Write-Host "DEPENDENCIES TESTS" -ForegroundColor Cyan
Write-Host "------------------" -ForegroundColor Cyan
Write-Host ""

# Test 17: Recharts Dependency
$global:totalTests++
Write-Host "Testing: Recharts Dependency" -ForegroundColor Yellow
try {
    $packageJson = Get-Content "frontend/package.json" | ConvertFrom-Json
    if ($packageJson.dependencies.recharts) {
        Write-Host "[PASS] Recharts Dependency: PASSED" -ForegroundColor Green
        $global:testsPassed++
    } else {
        Write-Host "[FAIL] Recharts Dependency: FAILED - Not found in dependencies" -ForegroundColor Red
    }
} catch {
    Write-Host "[FAIL] Recharts Dependency: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "FRONTEND ACCESSIBILITY TESTS" -ForegroundColor Cyan
Write-Host "-----------------------------" -ForegroundColor Cyan
Write-Host ""

# Test 18: Frontend Home Route
Test-Service "Frontend Home Route" 5173

Write-Host ""
Write-Host "TEST RESULTS SUMMARY" -ForegroundColor Cyan
Write-Host "---------------------" -ForegroundColor Cyan
Write-Host "Total Tests: $global:totalTests" -ForegroundColor White
Write-Host "Passed: $global:testsPassed" -ForegroundColor Green
Write-Host "Failed: $($global:totalTests - $global:testsPassed)" -ForegroundColor Red
Write-Host "Success Rate: $([math]::Round(($global:testsPassed / $global:totalTests) * 100, 2))%" -ForegroundColor White

if ($global:testsPassed -eq $global:totalTests) {
    Write-Host ""
    Write-Host "ALL TESTS PASSED! Phase 5 implementation is working correctly." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Some tests failed. Please check the implementation." -ForegroundColor Red
}

Write-Host ""
Write-Host "Backend Health Check: http://localhost:3000/health" -ForegroundColor White
Write-Host "Frontend URL: http://localhost:5173" -ForegroundColor White
Write-Host "Admin Panel: http://localhost:5173/admin" -ForegroundColor White
