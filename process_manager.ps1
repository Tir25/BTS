# Production-Grade Process Management for University Bus Tracking System
# This script manages Node.js processes efficiently and prevents memory leaks

param(
    [string]$Action = "cleanup",  # cleanup, monitor, restart
    [int]$MaxMemoryMB = 512,       # Maximum memory per process
    [int]$MaxProcesses = 4         # Maximum concurrent Node processes
)

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Write-Host $logEntry
    Add-Content -Path "process_manager.log" -Value $logEntry
}

function Get-NodeProcesses {
    return Get-Process | Where-Object {$_.ProcessName -eq "node"} | Sort-Object StartTime
}

function Get-ProcessMemoryUsage {
    param([int]$ProcessId)
    $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if ($process) {
        return [math]::Round($process.WorkingSet / 1MB, 2)
    }
    return 0
}

function Stop-RedundantProcesses {
    Write-Log "🔍 Analyzing Node.js processes..."
    
    $allProcesses = Get-NodeProcesses
    $activeProcesses = @()
    $redundantProcesses = @()
    
    # Identify processes by port usage
    $port3000Process = $null
    $port5173Process = $null
    
    foreach ($process in $allProcesses) {
        try {
            $connections = Get-NetTCPConnection -OwningProcess $process.Id -ErrorAction SilentlyContinue
            $hasPort3000 = $connections | Where-Object {$_.LocalPort -eq 3000 -and $_.State -eq "Listen"}
            $hasPort5173 = $connections | Where-Object {$_.LocalPort -eq 5173 -and $_.State -eq "Listen"}
            
            if ($hasPort3000) {
                $port3000Process = $process
                $activeProcesses += $process
            } elseif ($hasPort5173) {
                $port5173Process = $process
                $activeProcesses += $process
            } else {
                $redundantProcesses += $process
            }
        } catch {
            # Process might have ended, add to redundant list
            $redundantProcesses += $process
        }
    }
    
    Write-Log "📊 Process Analysis:"
    Write-Log "   Active processes: $($activeProcesses.Count)"
    Write-Log "   Redundant processes: $($redundantProcesses.Count)"
    
    # Stop redundant processes
    foreach ($process in $redundantProcesses) {
        try {
            $memoryMB = Get-ProcessMemoryUsage -ProcessId $process.Id
            Write-Log "🗑️ Stopping redundant process PID: $($process.Id) (Memory: ${memoryMB}MB)"
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        } catch {
            Write-Log "⚠️ Failed to stop process PID: $($process.Id)" "WARN"
        }
    }
    
    return $activeProcesses
}

function Monitor-ProcessHealth {
    param([array]$Processes)
    
    Write-Log "🔍 Monitoring process health..."
    
    foreach ($process in $Processes) {
        try {
            $memoryMB = Get-ProcessMemoryUsage -ProcessId $process.Id
            $cpuPercent = [math]::Round($process.CPU, 2)
            
            Write-Log "   PID: $($process.Id) | Memory: ${memoryMB}MB | CPU: ${cpuPercent}%"
            
            # Alert if memory usage is too high
            if ($memoryMB -gt $MaxMemoryMB) {
                Write-Log "🚨 HIGH MEMORY USAGE: PID $($process.Id) using ${memoryMB}MB (limit: ${MaxMemoryMB}MB)" "WARN"
            }
        } catch {
            Write-Log "⚠️ Process PID: $($process.Id) no longer exists" "WARN"
        }
    }
}

function Restart-Servers {
    Write-Log "🔄 Restarting servers..."
    
    # Stop all Node processes
    $allProcesses = Get-NodeProcesses
    foreach ($process in $allProcesses) {
        try {
            Write-Log "🛑 Stopping process PID: $($process.Id)"
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        } catch {
            Write-Log "⚠️ Failed to stop process PID: $($process.Id)" "WARN"
        }
    }
    
    # Wait for processes to stop
    Start-Sleep -Seconds 3
    
    # Start servers
    Write-Log "🚀 Starting servers..."
    Start-Process powershell -ArgumentList "-Command", "cd '$PWD'; npm run dev" -WindowStyle Minimized
}

function Set-ProcessLimits {
    Write-Log "⚙️ Setting process limits..."
    
    # Set Node.js memory limits via environment variables
    $env:NODE_OPTIONS = "--max-old-space-size=512"
    
    Write-Log "✅ Node.js memory limit set to 512MB"
}

# Main execution
Write-Log "🚀 Starting Process Manager for University Bus Tracking System"

switch ($Action.ToLower()) {
    "cleanup" {
        Write-Log "🧹 Cleaning up redundant processes..."
        $activeProcesses = Stop-RedundantProcesses
        Monitor-ProcessHealth -Processes $activeProcesses
        Write-Log "✅ Cleanup completed"
    }
    
    "monitor" {
        $processes = Get-NodeProcesses
        Monitor-ProcessHealth -Processes $processes
    }
    
    "restart" {
        Restart-Servers
    }
    
    "optimize" {
        Set-ProcessLimits
        $activeProcesses = Stop-RedundantProcesses
        Monitor-ProcessHealth -Processes $activeProcesses
    }
    
    default {
        Write-Log "❌ Unknown action: $Action" "ERROR"
        Write-Log "Available actions: cleanup, monitor, restart, optimize"
    }
}

Write-Log "✅ Process Manager completed"
