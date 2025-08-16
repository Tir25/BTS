# Cross-Laptop Testing Setup Script
Write-Host "🚀 Starting University Bus Tracking System for Cross-Laptop Testing..." -ForegroundColor Green

# Get the current IP address
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*"} | Select-Object -First 1).IPAddress
Write-Host "📍 Your laptop IP address: $ipAddress" -ForegroundColor Yellow

Write-Host "`n📋 Instructions for Cross-Laptop Testing:" -ForegroundColor Cyan
Write-Host "1. Backend Server (this laptop): http://$ipAddress`:3000" -ForegroundColor White
Write-Host "2. Frontend (this laptop): http://$ipAddress`:5173" -ForegroundColor White
Write-Host "3. On second laptop, open: http://$ipAddress`:5173" -ForegroundColor White
Write-Host "4. Use Driver Interface on this laptop" -ForegroundColor White
Write-Host "5. View Student Map on second laptop" -ForegroundColor White

Write-Host "`n🔧 Starting Backend Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; npm run dev"

Write-Host "⏳ Waiting 5 seconds for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "🎨 Starting Frontend Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; npm run dev"

Write-Host "`n✅ Both servers are starting..." -ForegroundColor Green
Write-Host "📱 Driver Interface: http://$ipAddress`:5173" -ForegroundColor Cyan
Write-Host "📊 Student Map: http://$ipAddress`:5173 (on second laptop)" -ForegroundColor Cyan
Write-Host "🔌 WebSocket: ws://$ipAddress`:3000" -ForegroundColor Cyan

Write-Host "`n🎯 Testing Steps:" -ForegroundColor Yellow
Write-Host "1. Open Driver Interface on this laptop" -ForegroundColor White
Write-Host "2. Login as a driver" -ForegroundColor White
Write-Host "3. Start location tracking" -ForegroundColor White
Write-Host "4. Open Student Map on second laptop" -ForegroundColor White
Write-Host "5. Verify live location updates" -ForegroundColor White
