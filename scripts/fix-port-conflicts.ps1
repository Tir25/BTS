# Fix Port Conflicts Script for University Bus Tracking System
# This script kills any processes using ports 3000, 5173, and 5174

Write-Host "🔧 Fixing Port Conflicts..." -ForegroundColor Yellow

# Function to kill process by port
function Kill-ProcessByPort {
    param([int]$Port)
    
    try {
        $portString = ":$Port "
        $processes = netstat -ano | findstr $portString
        if ($processes) {
            Write-Host "Found processes using port $Port:" -ForegroundColor Red
            $processes | ForEach-Object {
                $parts = $_ -split '\s+'
                $processId = $parts[-1]
                if ($processId -and $processId -ne "0") {
                    Write-Host "Killing process $processId using port $Port" -ForegroundColor Yellow
                    taskkill /f /pid $processId 2>$null
                }
            }
        } else {
            Write-Host "No processes found using port $Port" -ForegroundColor Green
        }
    } catch {
        Write-Host "Error checking port $Port`: $_" -ForegroundColor Red
    }
}

# Kill processes on common ports
Kill-ProcessByPort 3000  # Backend API
Kill-ProcessByPort 5173  # Frontend (Primary)
Kill-ProcessByPort 5174  # Frontend (Backup)

# Kill any remaining Node.js processes
Write-Host "`n🧹 Cleaning up Node.js processes..." -ForegroundColor Yellow
tasklist | findstr "node.exe" | ForEach-Object {
    $parts = $_ -split '\s+'
    $processId = $parts[1]
    if ($processId -and $processId -ne "0") {
        Write-Host "Killing Node.js process $processId" -ForegroundColor Yellow
        taskkill /f /pid $processId 2>$null
    }
}

Write-Host "`n✅ Port conflicts resolved!" -ForegroundColor Green
Write-Host "You can now start the development servers:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
