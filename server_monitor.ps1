# Server Monitoring Script for University Bus Tracking System
# This script monitors both backend and frontend servers for issues

param(
    [int]$CheckInterval = 30,  # Check every 30 seconds
    [string]$LogFile = "server_monitor.log"
)

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $Message"
    Write-Host $logEntry
    Add-Content -Path $LogFile -Value $logEntry
}

function Test-ServerHealth {
    param([string]$Url, [string]$ServerName)
    
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 10 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Log "✅ $ServerName is healthy (Status: $($response.StatusCode))"
            return $true
        } else {
            Write-Log "⚠️ $ServerName returned status: $($response.StatusCode)"
            return $false
        }
    } catch {
        Write-Log "❌ $ServerName is down: $($_.Exception.Message)"
        return $false
    }
}

function Get-SystemResources {
    $cpu = Get-WmiObject -Class Win32_Processor | Measure-Object -Property LoadPercentage -Average
    $memory = Get-WmiObject -Class Win32_OperatingSystem
    $disk = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'"
    
    $cpuUsage = [math]::Round($cpu.Average, 2)
    $memoryUsage = [math]::Round((($memory.TotalVisibleMemorySize - $memory.FreePhysicalMemory) / $memory.TotalVisibleMemorySize) * 100, 2)
    $diskUsage = [math]::Round((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100, 2)
    
    Write-Log "📊 System Resources - CPU: $cpuUsage%, Memory: $memoryUsage%, Disk: $diskUsage%"
    
    # Alert if resources are high
    if ($cpuUsage -gt 80) { Write-Log "🚨 HIGH CPU USAGE: $cpuUsage%" }
    if ($memoryUsage -gt 85) { Write-Log "🚨 HIGH MEMORY USAGE: $memoryUsage%" }
    if ($diskUsage -gt 90) { Write-Log "🚨 HIGH DISK USAGE: $diskUsage%" }
}

function Get-NodeProcesses {
    $nodeProcesses = Get-Process | Where-Object {$_.ProcessName -eq "node"}
    Write-Log "🔍 Found $($nodeProcesses.Count) Node.js processes"
    
    foreach ($process in $nodeProcesses) {
        $memoryMB = [math]::Round($process.WorkingSet / 1MB, 2)
        Write-Log "   PID: $($process.Id), Memory: ${memoryMB}MB, CPU: $($process.CPU)"
    }
}

function Test-PortAvailability {
    $backendPort = 3000
    $frontendPort = 5173
    
    $backendListening = Get-NetTCPConnection -LocalPort $backendPort -State Listen -ErrorAction SilentlyContinue
    $frontendListening = Get-NetTCPConnection -LocalPort $frontendPort -State Listen -ErrorAction SilentlyContinue
    
    if ($backendListening) {
        Write-Log "✅ Backend port $backendPort is listening"
    } else {
        Write-Log "❌ Backend port $backendPort is not listening"
    }
    
    if ($frontendListening) {
        Write-Log "✅ Frontend port $frontendPort is listening"
    } else {
        Write-Log "❌ Frontend port $frontendPort is not listening"
    }
}

# Main monitoring loop
Write-Log "🚀 Starting server monitoring for University Bus Tracking System"
Write-Log "📋 Monitoring Backend (port 3000) and Frontend (port 5173)"
Write-Log "⏰ Check interval: $CheckInterval seconds"

while ($true) {
    Write-Log "=" * 50
    Write-Log "🔍 Performing health checks..."
    
    # Test server endpoints
    $backendHealthy = Test-ServerHealth -Url "http://localhost:3000" -ServerName "Backend"
    $frontendHealthy = Test-ServerHealth -Url "http://localhost:5173" -ServerName "Frontend"
    
    # Check system resources
    Get-SystemResources
    
    # Check Node.js processes
    Get-NodeProcesses
    
    # Check port availability
    Test-PortAvailability
    
    # Summary
    if ($backendHealthy -and $frontendHealthy) {
        Write-Log "✅ All systems operational"
    } else {
        Write-Log "⚠️ Some systems may have issues - check logs above"
    }
    
    Write-Log "⏳ Waiting $CheckInterval seconds before next check..."
    Start-Sleep -Seconds $CheckInterval
}
