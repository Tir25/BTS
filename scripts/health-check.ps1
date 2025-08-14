# Comprehensive Health Check Script for University Bus Tracking System
# This script checks all components and provides a detailed health report

Write-Host "🏥 UNIVERSITY BUS TRACKING SYSTEM - HEALTH CHECK" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if a port is in use
function Test-Port {
    param([int]$Port, [string]$Service)
    
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
        if ($connection) {
            Write-Host "✅ $Service (Port $Port): RUNNING" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ $Service (Port $Port): NOT RUNNING" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ $Service (Port $Port): ERROR - $_" -ForegroundColor Red
        return $false
    }
}

# Function to check if a file exists
function Test-File {
    param([string]$Path, [string]$Description)
    
    if (Test-Path $Path) {
        Write-Host "✅ $Description: EXISTS" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ $Description: MISSING" -ForegroundColor Red
        return $false
    }
}

# Function to check if a directory exists
function Test-Directory {
    param([string]$Path, [string]$Description)
    
    if (Test-Path $Path -PathType Container) {
        Write-Host "✅ $Description: EXISTS" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ $Description: MISSING" -ForegroundColor Red
        return $false
    }
}

# Check project structure
Write-Host "📁 PROJECT STRUCTURE CHECK" -ForegroundColor Yellow
Write-Host "---------------------------" -ForegroundColor Yellow

$structureChecks = @(
    @{ Path = "backend"; Type = "Directory"; Description = "Backend Directory" },
    @{ Path = "frontend"; Type = "Directory"; Description = "Frontend Directory" },
    @{ Path = "backend/package.json"; Type = "File"; Description = "Backend Package.json" },
    @{ Path = "frontend/package.json"; Type = "File"; Description = "Frontend Package.json" },
    @{ Path = "backend/src"; Type = "Directory"; Description = "Backend Source" },
    @{ Path = "frontend/src"; Type = "Directory"; Description = "Frontend Source" },
    @{ Path = "backend/env.development"; Type = "File"; Description = "Backend Development Env" },
    @{ Path = "backend/env.production"; Type = "File"; Description = "Backend Production Env" },
    @{ Path = "frontend/.env"; Type = "File"; Description = "Frontend Environment File" }
)

$structureScore = 0
foreach ($check in $structureChecks) {
    if ($check.Type -eq "Directory") {
        if (Test-Directory $check.Path $check.Description) { $structureScore++ }
    } else {
        if (Test-File $check.Path $check.Description) { $structureScore++ }
    }
}

Write-Host ""

# Check service status
Write-Host "🔧 SERVICE STATUS CHECK" -ForegroundColor Yellow
Write-Host "------------------------" -ForegroundColor Yellow

$serviceScore = 0
if (Test-Port 3000 "Backend API") { $serviceScore++ }
if (Test-Port 5173 "Frontend (Primary)") { $serviceScore++ }
if (Test-Port 5174 "Frontend (Backup)") { $serviceScore++ }

Write-Host ""

# Check dependencies
Write-Host "📦 DEPENDENCIES CHECK" -ForegroundColor Yellow
Write-Host "---------------------" -ForegroundColor Yellow

$dependencyScore = 0

# Check if Node.js is installed
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
        $dependencyScore++
    } else {
        Write-Host "❌ Node.js: NOT INSTALLED" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Node.js: NOT INSTALLED" -ForegroundColor Red
}

# Check if npm is installed
try {
    $npmVersion = npm --version 2>$null
    if ($npmVersion) {
        Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
        $dependencyScore++
    } else {
        Write-Host "❌ npm: NOT INSTALLED" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ npm: NOT INSTALLED" -ForegroundColor Red
}

Write-Host ""

# Calculate overall health score
$totalChecks = $structureChecks.Count + 3 + 2  # structure + services + dependencies
$totalScore = $structureScore + $serviceScore + $dependencyScore
$healthPercentage = [math]::Round(($totalScore / $totalChecks) * 100, 1)

# Generate health report
Write-Host "📊 HEALTH REPORT SUMMARY" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Structure Score: $structureScore/$($structureChecks.Count)" -ForegroundColor White
Write-Host "Service Score: $serviceScore/3" -ForegroundColor White
Write-Host "Dependency Score: $dependencyScore/2" -ForegroundColor White
Write-Host ""

if ($healthPercentage -ge 90) {
    Write-Host "🏆 OVERALL HEALTH: EXCELLENT ($healthPercentage%)" -ForegroundColor Green
} elseif ($healthPercentage -ge 75) {
    Write-Host "✅ OVERALL HEALTH: GOOD ($healthPercentage%)" -ForegroundColor Yellow
} elseif ($healthPercentage -ge 50) {
    Write-Host "⚠️ OVERALL HEALTH: FAIR ($healthPercentage%)" -ForegroundColor Red
} else {
    Write-Host "❌ OVERALL HEALTH: POOR ($healthPercentage%)" -ForegroundColor Red
}

Write-Host ""

# Recommendations
Write-Host "💡 RECOMMENDATIONS" -ForegroundColor Yellow
Write-Host "------------------" -ForegroundColor Yellow

if ($serviceScore -lt 3) {
    Write-Host "• Start the development servers: npm run dev" -ForegroundColor White
}

if (-not (Test-Path "frontend/.env")) {
    Write-Host "• Create frontend environment file: copy frontend/env.example frontend/.env" -ForegroundColor White
}

if ($dependencyScore -lt 2) {
    Write-Host "• Install Node.js and npm from https://nodejs.org/" -ForegroundColor White
}

Write-Host ""
Write-Host "🔧 Quick Fix Commands:" -ForegroundColor Cyan
Write-Host "• Fix port conflicts: .\fix-port-conflicts.ps1" -ForegroundColor White
Write-Host "• Start development: npm run dev" -ForegroundColor White
Write-Host "• Check backend health: curl http://localhost:3000/health" -ForegroundColor White
