# Bus Tracking System Startup Script
# This script starts both backend and frontend with proper error handling

Write-Host "🚀 Starting Bus Tracking System..." -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check if we're in the right directory
if (-not (Test-Path "backend") -or -not (Test-Path "frontend")) {
    Write-Host "❌ Error: Please run this script from the project root directory" -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

# Check if environment files exist
if (-not (Test-Path "backend/env.local")) {
    Write-Host "⚠️ Warning: backend/env.local not found" -ForegroundColor Yellow
    Write-Host "Creating from env.development..." -ForegroundColor Yellow
    Copy-Item "backend/env.development" "backend/env.local"
}

if (-not (Test-Path "frontend/env.local")) {
    Write-Host "⚠️ Warning: frontend/env.local not found" -ForegroundColor Yellow
    Write-Host "Creating from env.example..." -ForegroundColor Yellow
    Copy-Item "frontend/env.example" "frontend/env.local"
}

# Install dependencies if needed
Write-Host "📦 Checking dependencies..." -ForegroundColor Cyan

if (-not (Test-Path "backend/node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location backend
    npm install
    Set-Location ..
}

if (-not (Test-Path "frontend/node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Set-Location frontend
    npm install
    Set-Location ..
}

# Build backend
Write-Host "🔨 Building backend..." -ForegroundColor Cyan
Set-Location backend
try {
    npm run build
    Write-Host "✅ Backend built successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend build failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..

# Start backend in background
Write-Host "🚀 Starting backend server..." -ForegroundColor Cyan
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\backend
    npm run dev
}

# Wait a moment for backend to start
Start-Sleep -Seconds 5

# Check if backend is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend is running on http://localhost:3000" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Backend may not be fully started yet" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Backend may still be starting up..." -ForegroundColor Yellow
}

# Start frontend
Write-Host "🚀 Starting frontend..." -ForegroundColor Cyan
Set-Location frontend
try {
    npm run dev
} catch {
    Write-Host "❌ Frontend failed to start" -ForegroundColor Red
    Set-Location ..
    Stop-Job $backendJob
    Remove-Job $backendJob
    exit 1
}

# Cleanup on exit
$null = Register-EngineEvent PowerShell.Exiting -Action {
    Write-Host "`n🛑 Shutting down..." -ForegroundColor Yellow
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
}

Write-Host "`n🎉 System started successfully!" -ForegroundColor Green
Write-Host "📱 Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "🔧 Backend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "📊 Health Check: http://localhost:3000/health" -ForegroundColor Cyan
Write-Host "`nPress Ctrl+C to stop the system" -ForegroundColor Yellow
