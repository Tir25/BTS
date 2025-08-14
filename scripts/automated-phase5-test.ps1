# Automated Phase 5 Test
Write-Host "Automated Phase 5 Testing..." -ForegroundColor Green

Write-Host "`n1. Checking System Health..." -ForegroundColor Cyan

# Check if backend is running
try {
    $backendResponse = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method GET -TimeoutSec 5
    Write-Host "   Backend Server: RUNNING" -ForegroundColor Green
    Write-Host "   Response: $($backendResponse.message)" -ForegroundColor White
} catch {
    Write-Host "   Backend Server: NOT RUNNING" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Check if frontend is running
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:5174" -Method GET -TimeoutSec 5
    Write-Host "   Frontend Server: RUNNING" -ForegroundColor Green
    Write-Host "   Status Code: $($frontendResponse.StatusCode)" -ForegroundColor White
} catch {
    Write-Host "   Frontend Server: NOT RUNNING" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2. Checking Admin API Endpoints..." -ForegroundColor Cyan

# Check admin analytics endpoint (should return 401 without auth)
try {
    $analyticsResponse = Invoke-RestMethod -Uri "http://localhost:3000/admin/analytics" -Method GET -TimeoutSec 5
    Write-Host "   Admin Analytics: ACCESSIBLE (should require auth)" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "   Admin Analytics: PROTECTED (401 Unauthorized)" -ForegroundColor Green
    } else {
        Write-Host "   Admin Analytics: ERROR - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Check admin health endpoint
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:3000/admin/health" -Method GET -TimeoutSec 5
    Write-Host "   Admin Health: ACCESSIBLE (should require auth)" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "   Admin Health: PROTECTED (401 Unauthorized)" -ForegroundColor Green
    } else {
        Write-Host "   Admin Health: ERROR - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n3. Checking Database Connection..." -ForegroundColor Cyan

# Check if we can query the database
try {
    $dbResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/buses" -Method GET -TimeoutSec 5
    Write-Host "   Database Connection: WORKING" -ForegroundColor Green
    Write-Host "   Buses Count: $($dbResponse.length)" -ForegroundColor White
} catch {
    Write-Host "   Database Connection: ERROR" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n4. Manual Testing Required:" -ForegroundColor Yellow
Write-Host "========================" -ForegroundColor Yellow
Write-Host "Please manually test the following:" -ForegroundColor White
Write-Host "1. Go to: http://localhost:5174/admin" -ForegroundColor Cyan
Write-Host "2. Login with: admin@university.edu / password123" -ForegroundColor Cyan
Write-Host "3. Test all features using the testing guide" -ForegroundColor Cyan

Write-Host "`n5. Testing Guide Location:" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host "Detailed testing guide: PHASE5_TESTING_GUIDE.md" -ForegroundColor White

Write-Host "`n6. Next Steps:" -ForegroundColor Cyan
Write-Host "=============" -ForegroundColor Cyan
Write-Host "1. Complete manual testing using the guide" -ForegroundColor White
Write-Host "2. Report any issues found" -ForegroundColor White
Write-Host "3. Move to Phase 6 once all tests pass" -ForegroundColor White

Write-Host "`nPhase 5 Testing Status: READY FOR MANUAL TESTING" -ForegroundColor Green
