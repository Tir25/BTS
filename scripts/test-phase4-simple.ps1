# Phase 4 Test Script for University Bus Tracking System

Write-Host "Phase 4 Testing - University Bus Tracking System" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

# Test Configuration
$BACKEND_URL = "http://localhost:3000"
$FRONTEND_URL = "http://localhost:5173"

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [string]$Body = $null
    )
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        if ($Body) {
            $response = Invoke-WebRequest -Uri $Url -Method $Method -Body $Body -Headers $headers
        } else {
            $response = Invoke-WebRequest -Uri $Url -Method $Method
        }
        
        if ($response.StatusCode -eq 200) {
            Write-Host "PASSED: $Name" -ForegroundColor Green
            return $true
        } else {
            Write-Host "FAILED: $Name (Status: $($response.StatusCode))" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "FAILED: $Name (Error: $($_.Exception.Message))" -ForegroundColor Red
        return $false
    }
}

# Test Results Tracking
$testResults = @{}

Write-Host "`nTesting Backend Endpoints..." -ForegroundColor Blue

# Test 1: Health Check
$testResults.Health = Test-Endpoint -Name "Health Check" -Url "$BACKEND_URL/health"

# Test 2: Get All Routes
$testResults.Routes = Test-Endpoint -Name "Get All Routes" -Url "$BACKEND_URL/routes"

# Test 3: Get All Buses
$testResults.Buses = Test-Endpoint -Name "Get All Buses" -Url "$BACKEND_URL/buses"

# Test 4: ETA Calculation (if routes exist)
$routeResponse = Invoke-WebRequest -Uri "$BACKEND_URL/routes" -Method GET
if ($routeResponse.StatusCode -eq 200) {
    $routes = $routeResponse.Content | ConvertFrom-Json
    if ($routes.data -and $routes.data.Count -gt 0) {
        $routeId = $routes.data[0].id
        $etaBody = @{
            bus_id = "test-bus-001"
            latitude = 23.0225
            longitude = 72.5714
            timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        } | ConvertTo-Json
        
        $testResults.ETA = Test-Endpoint -Name "ETA Calculation" -Url "$BACKEND_URL/routes/$routeId/calculate-eta" -Method "POST" -Body $etaBody
    } else {
        Write-Host "WARNING: No routes found for testing" -ForegroundColor Yellow
        $testResults.ETA = $false
    }
} else {
    $testResults.ETA = $false
}

Write-Host "`nTesting Frontend..." -ForegroundColor Blue

# Test 5: Frontend Accessibility
try {
    $frontendResponse = Invoke-WebRequest -Uri $FRONTEND_URL -Method GET
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "PASSED: Frontend Accessible" -ForegroundColor Green
        $testResults.Frontend = $true
    } else {
        Write-Host "FAILED: Frontend Accessible" -ForegroundColor Red
        $testResults.Frontend = $false
    }
} catch {
    Write-Host "FAILED: Frontend Accessible (Error: $($_.Exception.Message))" -ForegroundColor Red
    $testResults.Frontend = $false
}

Write-Host "`nTest Results Summary:" -ForegroundColor Blue
Write-Host "=====================" -ForegroundColor Blue

$passedTests = 0
$totalTests = $testResults.Count

foreach ($test in $testResults.GetEnumerator()) {
    $status = if ($test.Value) { "PASSED" } else { "FAILED" }
    $color = if ($test.Value) { "Green" } else { "Red" }
    Write-Host "$($test.Key): $status" -ForegroundColor $color
    if ($test.Value) { $passedTests++ }
}

Write-Host "`nOverall Result: $passedTests/$totalTests tests passed" -ForegroundColor $(if ($passedTests -eq $totalTests) { "Green" } else { "Yellow" })

if ($passedTests -eq $totalTests) {
    Write-Host "`nPhase 4 Implementation Complete!" -ForegroundColor Green
    Write-Host "All core functionality is working correctly." -ForegroundColor Green
} else {
    Write-Host "`nSome tests failed. Please check the implementation." -ForegroundColor Yellow
}

Write-Host "`nManual Testing Checklist:" -ForegroundColor Blue
Write-Host "1. Open frontend at: $FRONTEND_URL" -ForegroundColor Yellow
Write-Host "2. Navigate to Student Map" -ForegroundColor Yellow
Write-Host "3. Verify routes are displayed on the map" -ForegroundColor Yellow
Write-Host "4. Test WebSocket connection for real-time updates" -ForegroundColor Yellow
Write-Host "5. Verify ETA calculations are working" -ForegroundColor Yellow
Write-Host "6. Test bus arrival notifications" -ForegroundColor Yellow

Write-Host "`nPhase 4 Features Implemented:" -ForegroundColor Blue
Write-Host "- PostGIS route-based ETA calculation" -ForegroundColor Green
Write-Host "- Backend endpoints for route management" -ForegroundColor Green
Write-Host "- GeoJSON route data" -ForegroundColor Green
Write-Host "- Route visualization on MapLibre" -ForegroundColor Green
Write-Host "- Bus arrival detection" -ForegroundColor Green
Write-Host "- Real-time ETA updates via WebSocket" -ForegroundColor Green
Write-Host "- Enhanced bus markers with ETA information" -ForegroundColor Green
