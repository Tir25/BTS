# Phase 2 Setup Script for University Bus Tracking System
# Run this script to set up the development environment

Write-Host "🚀 Setting up Phase 2: Real-time Location Tracking" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

# Step 1: Create .env files
Write-Host "`n📝 Creating environment files..." -ForegroundColor Yellow

# Backend .env
$backendEnv = @"
# Development Environment Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Database Configuration - Supabase PostgreSQL
DATABASE_URL=postgresql://postgres.gthwmwfwvhyriygpcdlr:Tirth%20Raval27@aws-0-ap-south-1.pooler.supabase.com:6543/postgres

# Supabase Configuration
SUPABASE_URL=https://gthwmwfwvhyriygpcdlr.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzE0NTUsImV4cCI6MjA3MDU0NzQ1NX0.gY0ghDtKZ9b8XlgE7XtbQsT3efXYOBizGQKPJABGvAI
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDk3MTQ1NSwiZXhwIjoyMDcwNTQ3NDU1fQ.LuwfYUuGMRQh3Gbc7NQuRCqZxLsS5CrQOd1eMjiWj2o

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Rate Limiting (Development - More lenient)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Logging (Development - Verbose)
LOG_LEVEL=debug
ENABLE_DEBUG_LOGS=true

# Database Pool Configuration (Development)
DB_POOL_MAX=10
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_CONNECTION_TIMEOUT=10000
DB_RETRY_DELAY=5000
DB_MAX_RETRIES=5
"@

$backendEnv | Out-File -FilePath "backend\.env" -Encoding UTF8
Write-Host "✅ Created backend\.env" -ForegroundColor Green

# Frontend .env
$frontendEnv = @"
# API Configuration
VITE_API_URL=http://localhost:3000
VITE_BACKEND_URL=http://localhost:3000

# Supabase Configuration
VITE_SUPABASE_URL=https://gthwmwfwvhyriygpcdlr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzE0NTUsImV4cCI6MjA3MDU0NzQ1NX0.gY0ghDtKZ9b8XlgE7XtbQsT3efXYOBizGQKPJABGvAI

# Map Configuration
VITE_MAPLIBRE_TOKEN=
"@

$frontendEnv | Out-File -FilePath "frontend\.env" -Encoding UTF8
Write-Host "✅ Created frontend\.env" -ForegroundColor Green

# Step 2: Install dependencies
Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow

# Backend dependencies
Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
Set-Location "backend"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
    exit 1
}

# Frontend dependencies
Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
Set-Location "..\frontend"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
    exit 1
}

Set-Location ".."

# Step 3: Build backend
Write-Host "`n🔨 Building backend..." -ForegroundColor Yellow
Set-Location "backend"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build backend" -ForegroundColor Red
    exit 1
}
Set-Location ".."

Write-Host "`n✅ Setup completed successfully!" -ForegroundColor Green
Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Run the database initialization script in Supabase SQL Editor:" -ForegroundColor White
Write-Host "   - Copy the contents of 'backend\scripts\init-database-supabase.sql'" -ForegroundColor Gray
Write-Host "   - Paste it in your Supabase SQL Editor and run it" -ForegroundColor Gray
Write-Host "`n2. Start the backend server:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host "`n3. Start the frontend server (in a new terminal):" -ForegroundColor White
Write-Host "   cd frontend" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host "`n4. Test the application:" -ForegroundColor White
Write-Host "   - Open http://localhost:5173" -ForegroundColor Gray
Write-Host "   - Navigate to /driver to test the driver interface" -ForegroundColor Gray

Write-Host "`n🎉 Phase 2 setup is complete!" -ForegroundColor Green
