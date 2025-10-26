# Production Deployment Script for University Bus Tracking System
# Industry-grade deployment with health checks, rollback capability, and monitoring

param(
    [string]$Environment = "production",
    [switch]$SkipTests = $false,
    [switch]$ForceDeploy = $false,
    [string]$BackupDir = "backups"
)

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Write-Host $logEntry
    Add-Content -Path "deployment.log" -Value $logEntry
}

function Test-Prerequisites {
    Write-Log "🔍 Checking deployment prerequisites..."
    
    # Check Node.js version
    $nodeVersion = node --version
    if ($LASTEXITCODE -ne 0) {
        Write-Log "❌ Node.js not found" "ERROR"
        return $false
    }
    Write-Log "✅ Node.js version: $nodeVersion"
    
    # Check npm version
    $npmVersion = npm --version
    Write-Log "✅ npm version: $npmVersion"
    
    # Check if required files exist
    $requiredFiles = @("package.json", "backend/package.json", "frontend/package.json")
    foreach ($file in $requiredFiles) {
        if (-not (Test-Path $file)) {
            Write-Log "❌ Required file missing: $file" "ERROR"
            return $false
        }
    }
    
    Write-Log "✅ All prerequisites met"
    return $true
}

function Backup-CurrentDeployment {
    Write-Log "💾 Creating backup of current deployment..."
    
    $backupName = "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    $backupPath = Join-Path $BackupDir $backupName
    
    if (-not (Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force
    }
    
    # Backup current build
    if (Test-Path "backend/dist") {
        Copy-Item "backend/dist" -Destination "$backupPath/backend_dist" -Recurse -Force
    }
    
    if (Test-Path "frontend/dist") {
        Copy-Item "frontend/dist" -Destination "$backupPath/frontend_dist" -Recurse -Force
    }
    
    Write-Log "✅ Backup created: $backupPath"
    return $backupPath
}

function Install-Dependencies {
    Write-Log "📦 Installing dependencies..."
    
    # Install root dependencies
    Write-Log "Installing root dependencies..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Log "❌ Failed to install root dependencies" "ERROR"
        return $false
    }
    
    # Install backend dependencies
    Write-Log "Installing backend dependencies..."
    Set-Location backend
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Log "❌ Failed to install backend dependencies" "ERROR"
        Set-Location ..
        return $false
    }
    Set-Location ..
    
    # Install frontend dependencies
    Write-Log "Installing frontend dependencies..."
    Set-Location frontend
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Log "❌ Failed to install frontend dependencies" "ERROR"
        Set-Location ..
        return $false
    }
    Set-Location ..
    
    Write-Log "✅ All dependencies installed successfully"
    return $true
}

function Run-Tests {
    if ($SkipTests) {
        Write-Log "⏭️ Skipping tests as requested"
        return $true
    }
    
    Write-Log "🧪 Running test suite..."
    
    # Run backend tests
    Write-Log "Running backend tests..."
    Set-Location backend
    npm test
    if ($LASTEXITCODE -ne 0) {
        Write-Log "❌ Backend tests failed" "ERROR"
        Set-Location ..
        return $false
    }
    Set-Location ..
    
    # Run frontend tests
    Write-Log "Running frontend tests..."
    Set-Location frontend
    npm test
    if ($LASTEXITCODE -ne 0) {
        Write-Log "❌ Frontend tests failed" "ERROR"
        Set-Location ..
        return $false
    }
    Set-Location ..
    
    Write-Log "✅ All tests passed"
    return $true
}

function Build-Application {
    Write-Log "🔨 Building application..."
    
    # Build backend
    Write-Log "Building backend..."
    Set-Location backend
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Log "❌ Backend build failed" "ERROR"
        Set-Location ..
        return $false
    }
    Set-Location ..
    
    # Build frontend
    Write-Log "Building frontend..."
    Set-Location frontend
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Log "❌ Frontend build failed" "ERROR"
        Set-Location ..
        return $false
    }
    Set-Location ..
    
    Write-Log "✅ Application built successfully"
    return $true
}

function Deploy-Application {
    Write-Log "🚀 Deploying application..."
    
    # Stop existing processes
    Write-Log "Stopping existing processes..."
    Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue
    
    # Start application
    Write-Log "Starting application..."
    Start-Process powershell -ArgumentList "-Command", "cd '$PWD'; npm run dev" -WindowStyle Minimized
    
    # Wait for startup
    Start-Sleep -Seconds 10
    
    Write-Log "✅ Application deployed"
    return $true
}

function Test-Deployment {
    Write-Log "🔍 Testing deployment..."
    
    $maxRetries = 5
    $retryCount = 0
    
    while ($retryCount -lt $maxRetries) {
        try {
            # Test backend
            $backendResponse = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 10 -UseBasicParsing
            if ($backendResponse.StatusCode -eq 200) {
                Write-Log "✅ Backend health check passed"
            } else {
                throw "Backend returned status: $($backendResponse.StatusCode)"
            }
            
            # Test frontend
            $frontendResponse = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 10 -UseBasicParsing
            if ($frontendResponse.StatusCode -eq 200) {
                Write-Log "✅ Frontend health check passed"
            } else {
                throw "Frontend returned status: $($frontendResponse.StatusCode)"
            }
            
            Write-Log "✅ Deployment tests passed"
            return $true
            
        } catch {
            $retryCount++
            Write-Log "⚠️ Deployment test failed (attempt $retryCount/$maxRetries): $($_.Exception.Message)" "WARN"
            
            if ($retryCount -lt $maxRetries) {
                Start-Sleep -Seconds 5
            }
        }
    }
    
    Write-Log "❌ Deployment tests failed after $maxRetries attempts" "ERROR"
    return $false
}

function Start-Monitoring {
    Write-Log "📊 Starting production monitoring..."
    
    # Start the production monitor in background
    Start-Process powershell -ArgumentList "-File", "production_monitor.ps1" -WindowStyle Minimized
    
    Write-Log "✅ Production monitoring started"
}

function Rollback-Deployment {
    param([string]$BackupPath)
    
    Write-Log "🔄 Rolling back deployment..."
    
    if (-not (Test-Path $BackupPath)) {
        Write-Log "❌ Backup not found: $BackupPath" "ERROR"
        return $false
    }
    
    # Stop current processes
    Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue
    
    # Restore from backup
    if (Test-Path "$BackupPath/backend_dist") {
        Remove-Item "backend/dist" -Recurse -Force -ErrorAction SilentlyContinue
        Copy-Item "$BackupPath/backend_dist" -Destination "backend/dist" -Recurse -Force
    }
    
    if (Test-Path "$BackupPath/frontend_dist") {
        Remove-Item "frontend/dist" -Recurse -Force -ErrorAction SilentlyContinue
        Copy-Item "$BackupPath/frontend_dist" -Destination "frontend/dist" -Recurse -Force
    }
    
    Write-Log "✅ Rollback completed"
    return $true
}

# Main deployment process
Write-Log "🚀 Starting Production Deployment for University Bus Tracking System"
Write-Log "Environment: $Environment"

try {
    # Step 1: Check prerequisites
    if (-not (Test-Prerequisites)) {
        Write-Log "❌ Prerequisites check failed" "ERROR"
        exit 1
    }
    
    # Step 2: Create backup
    $backupPath = Backup-CurrentDeployment
    
    # Step 3: Install dependencies
    if (-not (Install-Dependencies)) {
        Write-Log "❌ Dependency installation failed" "ERROR"
        exit 1
    }
    
    # Step 4: Run tests
    if (-not (Run-Tests)) {
        Write-Log "❌ Tests failed" "ERROR"
        if (-not $ForceDeploy) {
            Write-Log "Deployment aborted. Use -ForceDeploy to skip tests." "ERROR"
            exit 1
        }
    }
    
    # Step 5: Build application
    if (-not (Build-Application)) {
        Write-Log "❌ Build failed" "ERROR"
        exit 1
    }
    
    # Step 6: Deploy application
    if (-not (Deploy-Application)) {
        Write-Log "❌ Deployment failed" "ERROR"
        exit 1
    }
    
    # Step 7: Test deployment
    if (-not (Test-Deployment)) {
        Write-Log "❌ Deployment tests failed" "ERROR"
        Write-Log "🔄 Attempting rollback..."
        Rollback-Deployment -BackupPath $backupPath
        exit 1
    }
    
    # Step 8: Start monitoring
    Start-Monitoring
    
    Write-Log "✅ Production deployment completed successfully!"
    Write-Log "📊 Application is running and monitored"
    Write-Log "🔗 Backend: http://localhost:3000"
    Write-Log "🔗 Frontend: http://localhost:5173"
    
} catch {
    Write-Log "❌ Deployment failed with error: $($_.Exception.Message)" "ERROR"
    Write-Log "🔄 Attempting rollback..."
    if ($backupPath) {
        Rollback-Deployment -BackupPath $backupPath
    }
    exit 1
}
