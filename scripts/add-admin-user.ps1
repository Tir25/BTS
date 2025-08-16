# Add Admin User Script for Bus Tracking System
# This script adds siddharthmali.211@gmail.com as an admin user

Write-Host "🚀 Adding Admin User to Bus Tracking System" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "backend")) {
    Write-Host "❌ Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Check if backend environment file exists
if (-not (Test-Path "backend/.env")) {
    Write-Host "❌ Error: backend/.env file not found" -ForegroundColor Red
    Write-Host "Please ensure your environment variables are configured" -ForegroundColor Yellow
    exit 1
}

# Navigate to backend directory
Set-Location backend

Write-Host "📁 Working directory: $(Get-Location)" -ForegroundColor Cyan

# Check if Node.js script exists
if (-not (Test-Path "scripts/add-admin-user.js")) {
    Write-Host "❌ Error: scripts/add-admin-user.js not found" -ForegroundColor Red
    exit 1
}

Write-Host "🔄 Running admin user addition script..." -ForegroundColor Yellow

# Run the Node.js script
node scripts/add-admin-user.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Admin user setup completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Login Details:" -ForegroundColor Cyan
    Write-Host "   Email: siddharthmali.211@gmail.com" -ForegroundColor White
    Write-Host "   Password: Siddharth57" -ForegroundColor White
    Write-Host ""
    Write-Host "🌐 You can now access the admin panel at:" -ForegroundColor Cyan
    Write-Host "   http://localhost:5173/admin" -ForegroundColor White
} else {
    Write-Host "❌ Admin user setup failed" -ForegroundColor Red
    exit 1
}

# Return to original directory
Set-Location ..

Write-Host ""
Write-Host "🎉 Script execution completed!" -ForegroundColor Green
