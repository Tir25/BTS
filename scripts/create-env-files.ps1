# Create Environment Files Script
# This script creates the .env files properly without truncation

Write-Host "Creating environment files..." -ForegroundColor Green

# Backend .env
$backendEnv = @"
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=https://gthwmwfwvhyriygpcdlr.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzE0NTUsImV4cCI6MjA3MDU0NzQ1NX0.gY0ghDtKZ9b8XlgE7XtbQsT3efXYOBizGQKPJABGvAI
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDk3MTQ1NSwiZXhwIjoyMDcwNTQ3NDU1fQ.LuwfYUuGMRQh3Gbc7NQuRCqZxLsS5CrQOd1eMjiWj2o
CORS_ORIGIN=http://localhost:5173
"@

$backendEnv | Out-File -FilePath "backend\.env" -Encoding UTF8 -NoNewline
Write-Host "✅ Created backend\.env" -ForegroundColor Green

# Frontend .env
$frontendEnv = @"
VITE_API_URL=http://localhost:3000
VITE_BACKEND_URL=http://localhost:3000
VITE_SUPABASE_URL=https://gthwmwfwvhyriygpcdlr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzE0NTUsImV4cCI6MjA3MDU0NzQ1NX0.gY0ghDtKZ9b8XlgE7XtbQsT3efXYOBizGQKPJABGvAI
VITE_MAPLIBRE_TOKEN=
"@

$frontendEnv | Out-File -FilePath "frontend\.env" -Encoding UTF8 -NoNewline
Write-Host "✅ Created frontend\.env" -ForegroundColor Green

Write-Host "`nEnvironment files created successfully!" -ForegroundColor Green
Write-Host "You can now start the servers:" -ForegroundColor Yellow
Write-Host "1. Backend: cd backend && npm run dev" -ForegroundColor Cyan
Write-Host "2. Frontend: cd frontend && npm run dev" -ForegroundColor Cyan
