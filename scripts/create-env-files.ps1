# Create Environment Files Script for University Bus Tracking System
# This script creates .env files for both frontend and backend

Write-Host "Creating Environment Files..." -ForegroundColor Yellow

# Check if we're in the right directory
if (-not (Test-Path "backend")) {
    Write-Host "ERROR: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Create backend .env file
$backendEnvContent = @"
# Backend Environment Variables
NODE_ENV=development
PORT=3000
WEBSOCKET_PORT=3001

# Database Configuration
DATABASE_URL=your_database_url_here

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# CORS Configuration
CORS_ORIGIN=http://localhost:5173,http://localhost:5174,http://localhost:5175

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
ENABLE_DEBUG_LOGS=true

# Database Pool Configuration
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_CONNECTION_TIMEOUT=10000
DB_RETRY_DELAY=5000
DB_MAX_RETRIES=5
"@

$backendEnvPath = "backend\.env"
$backendEnvContent | Out-File -FilePath $backendEnvPath -Encoding UTF8
Write-Host "Created backend\.env" -ForegroundColor Green

# Create frontend .env file
$frontendEnvContent = @"
# Frontend Environment Variables
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_BACKEND_URL=http://localhost:3000
VITE_API_URL=http://localhost:3000
"@

$frontendEnvPath = "frontend\.env"
$frontendEnvContent | Out-File -FilePath $frontendEnvPath -Encoding UTF8
Write-Host "Created frontend\.env" -ForegroundColor Green

Write-Host "`nEnvironment files created successfully!" -ForegroundColor Green
Write-Host "Please update the values in both .env files with your actual configuration." -ForegroundColor Yellow
