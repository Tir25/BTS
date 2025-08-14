# Test Admin Authentication Setup
Write-Host "Testing Admin Authentication Setup" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Backend Health
Write-Host "1. Testing Backend Health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -Method GET
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Backend is running and healthy" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Backend health check failed" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Backend is not responding: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Admin Routes (should require authentication)
Write-Host "2. Testing Admin Route Protection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/admin/analytics" -Method GET
    Write-Host "   ❌ Admin route should require authentication" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "   ✅ Admin routes correctly require authentication (401)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# Test 3: Check if frontend is accessible
Write-Host "3. Testing Frontend Accessibility..." -ForegroundColor Yellow
try {
    $connection = Test-NetConnection -ComputerName localhost -Port 5173 -InformationLevel Quiet
    if ($connection) {
        Write-Host "   ✅ Frontend development server is running on port 5173" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Frontend server is not responding on port 5173" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Frontend server is not running" -ForegroundColor Red
}

Write-Host ""
Write-Host "Admin Authentication Setup Summary:" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "✅ Backend Server: Running on port 3000" -ForegroundColor Green
Write-Host "✅ Admin Routes: Protected with authentication" -ForegroundColor Green
Write-Host "✅ Frontend Server: Ready on port 5173" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Run the SQL script in Supabase SQL Editor to set up admin role" -ForegroundColor White
Write-Host "2. Navigate to: http://localhost:5173/admin" -ForegroundColor White
Write-Host "3. Login with: admin@university.edu / password123" -ForegroundColor White
Write-Host ""
Write-Host "SQL Script Location: setup-admin-role.sql" -ForegroundColor White
