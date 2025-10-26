# Quick Server Monitoring Script
Write-Host "🔍 MONITORING SERVER STATUS" -ForegroundColor Green
Write-Host "=" * 50

# Check server processes
Write-Host "📊 Node.js Processes:" -ForegroundColor Yellow
$nodeProcesses = Get-Process | Where-Object {$_.ProcessName -eq "node"}
Write-Host "   Total processes: $($nodeProcesses.Count)"

$totalMemory = 0
foreach ($process in $nodeProcesses) {
    $memoryMB = [math]::Round($process.WorkingSet / 1MB, 2)
    $totalMemory += $memoryMB
    Write-Host "   PID: $($process.Id) | Memory: ${memoryMB}MB | CPU: $([math]::Round($process.CPU, 2))%"
}

Write-Host "   Total Memory Usage: $([math]::Round($totalMemory, 2))MB" -ForegroundColor Cyan

# Check ports
Write-Host "`n🌐 Port Status:" -ForegroundColor Yellow
$port3000 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
$port5173 = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue

if ($port3000) {
    Write-Host "   ✅ Backend (Port 3000): LISTENING (PID: $($port3000.OwningProcess))" -ForegroundColor Green
} else {
    Write-Host "   ❌ Backend (Port 3000): NOT LISTENING" -ForegroundColor Red
}

if ($port5173) {
    Write-Host "   ✅ Frontend (Port 5173): LISTENING (PID: $($port5173.OwningProcess))" -ForegroundColor Green
} else {
    Write-Host "   ❌ Frontend (Port 5173): NOT LISTENING" -ForegroundColor Red
}

# Test server endpoints
Write-Host "`n🔍 Server Health Tests:" -ForegroundColor Yellow

# Test backend
try {
    $backendResponse = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 5 -UseBasicParsing
    Write-Host "   ✅ Backend Health: $($backendResponse.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Backend Health: $($_.Exception.Message)" -ForegroundColor Red
}

# Test frontend
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 5 -UseBasicParsing
    Write-Host "   ✅ Frontend: $($frontendResponse.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Frontend: $($_.Exception.Message)" -ForegroundColor Red
}

# Test backend root
try {
    $backendRootResponse = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing
    Write-Host "   ✅ Backend Root: $($backendRootResponse.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Backend Root: $($_.Exception.Message)" -ForegroundColor Red
}

# System resources
Write-Host "`n💻 System Resources:" -ForegroundColor Yellow
$memory = Get-WmiObject -Class Win32_OperatingSystem
$totalGB = [math]::Round($memory.TotalVisibleMemorySize/1MB,2)
$freeGB = [math]::Round($memory.FreePhysicalMemory/1MB,2)
$usedGB = [math]::Round(($memory.TotalVisibleMemorySize-$memory.FreePhysicalMemory)/1MB,2)
$usagePercent = [math]::Round((($memory.TotalVisibleMemorySize-$memory.FreePhysicalMemory)/$memory.TotalVisibleMemorySize)*100,2)

Write-Host "   Memory: $usedGB GB / $totalGB GB ($usagePercent%)"
if ($usagePercent -gt 85) {
    Write-Host "   ⚠️ HIGH MEMORY USAGE!" -ForegroundColor Red
} elseif ($usagePercent -gt 70) {
    Write-Host "   ⚠️ Moderate memory usage" -ForegroundColor Yellow
} else {
    Write-Host "   ✅ Memory usage normal" -ForegroundColor Green
}

Write-Host "`n📋 SUMMARY:" -ForegroundColor Cyan
Write-Host "   Node processes: $($nodeProcesses.Count)"
Write-Host "   Total memory: $([math]::Round($totalMemory, 2))MB"
Write-Host "   System memory: $usagePercent%"
Write-Host "   Backend port: $(if($port3000){'✅'}else{'❌'})"
Write-Host "   Frontend port: $(if($port5173){'✅'}else{'❌'})"
