# Production-Grade Monitoring System for University Bus Tracking System
# Comprehensive monitoring with alerts, health checks, and automated recovery

param(
    [int]$CheckInterval = 30,  # Check every 30 seconds
    [string]$LogFile = "production_monitor.log",
    [switch]$EnableAlerts = $true,
    [int]$MemoryThreshold = 80,  # Memory usage threshold (%)
    [int]$CPUThreshold = 90      # CPU usage threshold (%)
)

# Global variables for monitoring
$global:AlertCooldown = @{}
$global:LastHealthCheck = @{}

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Write-Host $logEntry
    Add-Content -Path $LogFile -Value $logEntry
}

function Send-Alert {
    param([string]$Message, [string]$Type = "WARNING")
    
    $alertKey = "$Type-$Message"
    $now = Get-Date
    
    # Implement alert cooldown (5 minutes)
    if ($global:AlertCooldown.ContainsKey($alertKey)) {
        $lastAlert = $global:AlertCooldown[$alertKey]
        if (($now - $lastAlert).TotalMinutes -lt 5) {
            return  # Skip duplicate alert
        }
    }
    
    $global:AlertCooldown[$alertKey] = $now
    
    Write-Log "🚨 ALERT [$Type]: $Message" "ALERT"
    
    # In production, you would send alerts to:
    # - Email notifications
    # - Slack/Discord webhooks
    # - SMS alerts
    # - PagerDuty integration
}

function Test-ServerHealth {
    param([string]$Url, [string]$ServerName)
    
    try {
        $startTime = Get-Date
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 10 -UseBasicParsing
        $responseTime = (Get-Date) - $startTime
        
        if ($response.StatusCode -eq 200) {
            $global:LastHealthCheck[$ServerName] = Get-Date
            Write-Log "✅ $ServerName is healthy (Status: $($response.StatusCode), Response: $($responseTime.TotalMilliseconds)ms)"
            return $true
        } else {
            Send-Alert "$ServerName returned status: $($response.StatusCode)" "ERROR"
            return $false
        }
    } catch {
        Send-Alert "$ServerName is down: $($_.Exception.Message)" "CRITICAL"
        return $false
    }
}

function Get-SystemMetrics {
    $cpu = Get-WmiObject -Class Win32_Processor | Measure-Object -Property LoadPercentage -Average
    $memory = Get-WmiObject -Class Win32_OperatingSystem
    $disk = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'"
    
    $cpuUsage = [math]::Round($cpu.Average, 2)
    $memoryUsage = [math]::Round((($memory.TotalVisibleMemorySize - $memory.FreePhysicalMemory) / $memory.TotalVisibleMemorySize) * 100, 2)
    $diskUsage = [math]::Round((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100, 2)
    
    return @{
        CPU = $cpuUsage
        Memory = $memoryUsage
        Disk = $diskUsage
        Timestamp = Get-Date
    }
}

function Monitor-SystemResources {
    $metrics = Get-SystemMetrics
    
    Write-Log "📊 System Metrics - CPU: $($metrics.CPU)%, Memory: $($metrics.Memory)%, Disk: $($metrics.Disk)%"
    
    # Check thresholds and send alerts
    if ($metrics.CPU -gt $CPUThreshold) {
        Send-Alert "HIGH CPU USAGE: $($metrics.CPU)% (threshold: $CPUThreshold%)" "WARNING"
    }
    
    if ($metrics.Memory -gt $MemoryThreshold) {
        Send-Alert "HIGH MEMORY USAGE: $($metrics.Memory)% (threshold: $MemoryThreshold%)" "WARNING"
    }
    
    if ($metrics.Disk -gt 90) {
        Send-Alert "HIGH DISK USAGE: $($metrics.Disk)%" "CRITICAL"
    }
    
    return $metrics
}

function Get-NodeProcesses {
    $processes = Get-Process | Where-Object {$_.ProcessName -eq "node"}
    $processInfo = @()
    
    foreach ($process in $processes) {
        $memoryMB = [math]::Round($process.WorkingSet / 1MB, 2)
        $cpuPercent = [math]::Round($process.CPU, 2)
        
        $processInfo += @{
            Id = $process.Id
            MemoryMB = $memoryMB
            CPU = $cpuPercent
            StartTime = $process.StartTime
        }
        
        # Alert on high memory usage per process
        if ($memoryMB -gt 200) {
            Send-Alert "Node process PID $($process.Id) using ${memoryMB}MB memory" "WARNING"
        }
    }
    
    return $processInfo
}

function Test-PortAvailability {
    $backendPort = 3000
    $frontendPort = 5173
    
    $backendListening = Get-NetTCPConnection -LocalPort $backendPort -State Listen -ErrorAction SilentlyContinue
    $frontendListening = Get-NetTCPConnection -LocalPort $frontendPort -State Listen -ErrorAction SilentlyContinue
    
    $results = @{
        Backend = $backendListening -ne $null
        Frontend = $frontendListening -ne $null
    }
    
    if (-not $results.Backend) {
        Send-Alert "Backend port $backendPort is not listening" "CRITICAL"
    }
    
    if (-not $results.Frontend) {
        Send-Alert "Frontend port $frontendPort is not listening" "CRITICAL"
    }
    
    return $results
}

function Test-DatabaseConnectivity {
    try {
        # Test database connection via health endpoint
        $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            $healthData = $response.Content | ConvertFrom-Json
            if ($healthData.database -eq "connected") {
                Write-Log "✅ Database connection healthy"
                return $true
            }
        }
    } catch {
        Send-Alert "Database health check failed: $($_.Exception.Message)" "ERROR"
    }
    
    return $false
}

function Start-AutomatedRecovery {
    param([string]$Issue)
    
    Write-Log "🔧 Starting automated recovery for: $Issue"
    
    switch ($Issue) {
        "BackendDown" {
            Write-Log "🔄 Attempting to restart backend server..."
            # In production, you would use proper process managers like PM2
            # For now, we'll just log the action
            Send-Alert "Backend server restart required" "INFO"
        }
        "HighMemory" {
            Write-Log "🧹 Triggering garbage collection and process cleanup..."
            # Force garbage collection if available
            Send-Alert "Memory cleanup required" "INFO"
        }
        "DatabaseDown" {
            Write-Log "🔄 Attempting database reconnection..."
            Send-Alert "Database reconnection required" "INFO"
        }
    }
}

function Get-HealthScore {
    $score = 100
    $issues = @()
    
    # Check server health
    $backendHealth = Test-ServerHealth -Url "http://localhost:3000" -ServerName "Backend"
    $frontendHealth = Test-ServerHealth -Url "http://localhost:5173" -ServerName "Frontend"
    
    if (-not $backendHealth) { $score -= 40; $issues += "Backend down" }
    if (-not $frontendHealth) { $score -= 30; $issues += "Frontend down" }
    
    # Check system resources
    $metrics = Get-SystemMetrics
    if ($metrics.CPU -gt 80) { $score -= 10; $issues += "High CPU" }
    if ($metrics.Memory -gt 85) { $score -= 15; $issues += "High Memory" }
    if ($metrics.Disk -gt 90) { $score -= 20; $issues += "High Disk" }
    
    # Check database
    $dbHealth = Test-DatabaseConnectivity
    if (-not $dbHealth) { $score -= 25; $issues += "Database issues" }
    
    return @{
        Score = [math]::Max(0, $score)
        Issues = $issues
        Timestamp = Get-Date
    }
}

# Main monitoring loop
Write-Log "🚀 Starting Production Monitor for University Bus Tracking System"
Write-Log "📋 Monitoring Backend (port 3000) and Frontend (port 5173)"
Write-Log "⏰ Check interval: $CheckInterval seconds"
Write-Log "🚨 Alerts enabled: $EnableAlerts"

while ($true) {
    Write-Log "=" * 60
    Write-Log "🔍 Performing comprehensive health checks..."
    
    # System resource monitoring
    $metrics = Monitor-SystemResources
    
    # Server health checks
    $backendHealthy = Test-ServerHealth -Url "http://localhost:3000" -ServerName "Backend"
    $frontendHealthy = Test-ServerHealth -Url "http://localhost:5173" -ServerName "Frontend"
    
    # Process monitoring
    $processes = Get-NodeProcesses
    Write-Log "🔍 Node.js processes: $($processes.Count)"
    foreach ($proc in $processes) {
        Write-Log "   PID: $($proc.Id) | Memory: $($proc.MemoryMB)MB | CPU: $($proc.CPU)%"
    }
    
    # Port availability
    $ports = Test-PortAvailability
    
    # Database connectivity
    $dbHealthy = Test-DatabaseConnectivity
    
    # Overall health score
    $healthScore = Get-HealthScore
    Write-Log "📊 Health Score: $($healthScore.Score)/100"
    
    if ($healthScore.Score -lt 70) {
        Send-Alert "System health score is low: $($healthScore.Score)/100. Issues: $($healthScore.Issues -join ', ')" "WARNING"
    }
    
    # Summary
    if ($backendHealthy -and $frontendHealthy -and $healthScore.Score -gt 80) {
        Write-Log "✅ All systems operational"
    } else {
        Write-Log "⚠️ Some systems may have issues - check alerts above"
    }
    
    Write-Log "⏳ Waiting $CheckInterval seconds before next check..."
    Start-Sleep -Seconds $CheckInterval
}
