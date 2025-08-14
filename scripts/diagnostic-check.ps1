# Comprehensive Diagnostic Check - University Bus Tracking System
# Checks for TypeScript errors, syntax issues, and configuration problems

Write-Host "🔍 Comprehensive Diagnostic Check - University Bus Tracking System" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# Test 1: Backend TypeScript Compilation
Write-Host "`n📦 Test 1: Backend TypeScript Compilation..." -ForegroundColor Yellow
try {
    $backendResult = & cd backend; npx tsc --noEmit 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Backend TypeScript compilation successful" -ForegroundColor Green
    } else {
        Write-Host "❌ Backend TypeScript compilation failed:" -ForegroundColor Red
        Write-Host $backendResult -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error running backend TypeScript check: $_" -ForegroundColor Red
}

# Test 2: Frontend TypeScript Compilation
Write-Host "`n📦 Test 2: Frontend TypeScript Compilation..." -ForegroundColor Yellow
try {
    $frontendResult = & cd frontend; npx tsc --noEmit 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Frontend TypeScript compilation successful" -ForegroundColor Green
    } else {
        Write-Host "❌ Frontend TypeScript compilation failed:" -ForegroundColor Red
        Write-Host $frontendResult -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error running frontend TypeScript check: $_" -ForegroundColor Red
}

# Test 3: Check for syntax errors in key files
Write-Host "`n🔍 Test 3: Syntax Check for Key Files..." -ForegroundColor Yellow

# Check StudentMap.tsx
if (Test-Path "frontend/src/components/StudentMap.tsx") {
    try {
        $content = Get-Content "frontend/src/components/StudentMap.tsx" -Raw
        if ($content -match '^\s*</div>\s*$') {
            Write-Host "⚠️  Potential extra closing div tag in StudentMap.tsx" -ForegroundColor Yellow
        } else {
            Write-Host "✅ StudentMap.tsx syntax looks good" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ Error reading StudentMap.tsx: $_" -ForegroundColor Red
    }
}

# Check buses.ts
if (Test-Path "backend/src/routes/buses.ts") {
    try {
        $content = Get-Content "backend/src/routes/buses.ts" -Raw
        if ($content -match 'return res\.json') {
            Write-Host "✅ buses.ts return statements look good" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Potential missing return statements in buses.ts" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Error reading buses.ts: $_" -ForegroundColor Red
    }
}

# Test 4: Check for missing dependencies
Write-Host "`n📦 Test 4: Dependency Check..." -ForegroundColor Yellow

# Check backend dependencies
$backendDeps = @("express", "socket.io", "pg", "@supabase/supabase-js")
foreach ($dep in $backendDeps) {
    $packageJson = Get-Content "backend/package.json" -Raw
    if ($packageJson -match $dep) {
        Write-Host "✅ $dep found in backend" -ForegroundColor Green
    } else {
        Write-Host "❌ $dep missing from backend" -ForegroundColor Red
    }
}

# Check frontend dependencies
$frontendDeps = @("react", "maplibre-gl", "socket.io-client")
foreach ($dep in $frontendDeps) {
    $packageJson = Get-Content "frontend/package.json" -Raw
    if ($packageJson -match $dep) {
        Write-Host "✅ $dep found in frontend" -ForegroundColor Green
    } else {
        Write-Host "❌ $dep missing from frontend" -ForegroundColor Red
    }
}

# Test 5: Check for configuration issues
Write-Host "`n⚙️ Test 5: Configuration Check..." -ForegroundColor Yellow

# Check TypeScript configs
if (Test-Path "backend/tsconfig.json") {
    Write-Host "✅ Backend tsconfig.json exists" -ForegroundColor Green
} else {
    Write-Host "❌ Backend tsconfig.json missing" -ForegroundColor Red
}

if (Test-Path "frontend/tsconfig.json") {
    Write-Host "✅ Frontend tsconfig.json exists" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend tsconfig.json missing" -ForegroundColor Red
}

# Check environment files
if (Test-Path "backend/.env") {
    Write-Host "✅ Backend .env exists" -ForegroundColor Green
} else {
    Write-Host "⚠️  Backend .env missing (may be expected)" -ForegroundColor Yellow
}

if (Test-Path "frontend/.env") {
    Write-Host "✅ Frontend .env exists" -ForegroundColor Green
} else {
    Write-Host "⚠️  Frontend .env missing (may be expected)" -ForegroundColor Yellow
}

# Test 6: Check for import/export issues
Write-Host "`n📤 Test 6: Import/Export Check..." -ForegroundColor Yellow

# Check if all components are properly exported
$components = @("StudentMap", "DriverInterface")
foreach ($comp in $components) {
    $filePath = "frontend/src/components/$comp.tsx"
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw
        if ($content -match "export default $comp") {
            Write-Host "✅ $comp properly exported" -ForegroundColor Green
        } else {
            Write-Host "❌ $comp export issue" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ $comp.tsx missing" -ForegroundColor Red
    }
}

# Test 7: Check for CSS import issues
Write-Host "`n🎨 Test 7: CSS Import Check..." -ForegroundColor Yellow

$cssContent = Get-Content "frontend/src/index.css" -Raw
if ($cssContent -match "maplibre-gl/dist/maplibre-gl.css") {
    Write-Host "✅ MapLibre CSS import found" -ForegroundColor Green
} else {
    Write-Host "❌ MapLibre CSS import missing" -ForegroundColor Red
}

if (Test-Path "frontend/src/components/StudentMap.css") {
    Write-Host "✅ StudentMap.css exists" -ForegroundColor Green
} else {
    Write-Host "❌ StudentMap.css missing" -ForegroundColor Red
}

# Test 8: Check for WebSocket configuration
Write-Host "`n🔌 Test 8: WebSocket Configuration Check..." -ForegroundColor Yellow

if (Test-Path "backend/src/sockets/websocket.ts") {
    Write-Host "✅ WebSocket server file exists" -ForegroundColor Green
} else {
    Write-Host "❌ WebSocket server file missing" -ForegroundColor Red
}

if (Test-Path "frontend/src/services/websocket.ts") {
    Write-Host "✅ WebSocket client service exists" -ForegroundColor Green
} else {
    Write-Host "❌ WebSocket client service missing" -ForegroundColor Red
}

# Test 9: Check for API service configuration
Write-Host "`n🌐 Test 9: API Service Check..." -ForegroundColor Yellow

if (Test-Path "frontend/src/services/api.ts") {
    $apiContent = Get-Content "frontend/src/services/api.ts" -Raw
    if ($apiContent -match "getAllBuses" -and $apiContent -match "getBusInfo") {
        Write-Host "✅ API service has bus endpoints" -ForegroundColor Green
    } else {
        Write-Host "❌ API service missing bus endpoints" -ForegroundColor Red
    }
} else {
    Write-Host "❌ API service file missing" -ForegroundColor Red
}

# Test 10: Check for bus service
Write-Host "`n🚌 Test 10: Bus Service Check..." -ForegroundColor Yellow

if (Test-Path "frontend/src/services/busService.ts") {
    Write-Host "✅ Bus service exists" -ForegroundColor Green
} else {
    Write-Host "❌ Bus service missing" -ForegroundColor Red
}

Write-Host "`n🎉 Diagnostic Check Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

Write-Host "`n📋 Summary:" -ForegroundColor Cyan
Write-Host "If all tests passed, your project should be ready to run." -ForegroundColor White
Write-Host "If any tests failed, please address the issues before proceeding." -ForegroundColor White

Write-Host "`n🚀 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Start backend: cd backend; npm run dev" -ForegroundColor White
Write-Host "2. Start frontend: cd frontend; npm run dev" -ForegroundColor White
Write-Host "3. Test the application in your browser" -ForegroundColor White
