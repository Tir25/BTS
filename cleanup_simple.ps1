# Simple Process Cleanup Script
Write-Host "🧹 Cleaning up redundant Node.js processes..."

# Get all Node processes
$nodeProcesses = Get-Process | Where-Object {$_.ProcessName -eq "node"}

Write-Host "📊 Found $($nodeProcesses.Count) Node.js processes"

# Identify active processes by port
$activeProcesses = @()
$redundantProcesses = @()

foreach ($process in $nodeProcesses) {
    try {
        $connections = Get-NetTCPConnection -OwningProcess $process.Id -ErrorAction SilentlyContinue
        $hasPort3000 = $connections | Where-Object {$_.LocalPort -eq 3000 -and $_.State -eq "Listen"}
        $hasPort5173 = $connections | Where-Object {$_.LocalPort -eq 5173 -and $_.State -eq "Listen"}
        
        if ($hasPort3000 -or $hasPort5173) {
            $activeProcesses += $process
            if ($hasPort3000) {
                Write-Host "✅ Active process PID: $($process.Id) (Port: 3000)"
            } else {
                Write-Host "✅ Active process PID: $($process.Id) (Port: 5173)"
            }
        } else {
            $redundantProcesses += $process
        }
    } catch {
        $redundantProcesses += $process
    }
}

Write-Host "📊 Process Summary:"
Write-Host "   Active processes: $($activeProcesses.Count)"
Write-Host "   Redundant processes: $($redundantProcesses.Count)"

# Stop redundant processes
foreach ($process in $redundantProcesses) {
    try {
        $memoryMB = [math]::Round($process.WorkingSet / 1MB, 2)
        Write-Host "🗑️ Stopping redundant process PID: $($process.Id) (Memory: ${memoryMB}MB)"
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    } catch {
        Write-Host "⚠️ Failed to stop process PID: $($process.Id)"
    }
}

Write-Host "✅ Cleanup completed"
Write-Host "📊 Remaining active processes: $($activeProcesses.Count)"
