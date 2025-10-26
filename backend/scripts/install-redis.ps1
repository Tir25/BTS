# Redis Installation Script for Windows
# This script provides multiple options to install Redis on Windows

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("docker", "memurai", "chocolatey", "manual")]
    [string]$Method = "docker"
)

Write-Host "🔴 Redis Installation Script for Windows" -ForegroundColor Red
Write-Host "=========================================" -ForegroundColor Red

function Install-Redis-Docker {
    Write-Host "🐳 Installing Redis using Docker..." -ForegroundColor Blue
    
    # Check if Docker is installed
    try {
        docker --version | Out-Null
        Write-Host "✅ Docker is already installed" -ForegroundColor Green
    } catch {
        Write-Host "❌ Docker is not installed. Please install Docker Desktop first:" -ForegroundColor Red
        Write-Host "   https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
        return $false
    }
    
    # Pull Redis image
    Write-Host "📥 Pulling Redis image..." -ForegroundColor Blue
    docker pull redis:7-alpine
    
    # Run Redis container
    Write-Host "🚀 Starting Redis container..." -ForegroundColor Blue
    docker run -d --name redis-server -p 6379:6379 redis:7-alpine
    
    # Test connection
    Write-Host "🧪 Testing Redis connection..." -ForegroundColor Blue
    Start-Sleep -Seconds 2
    $result = docker exec redis-server redis-cli ping
    if ($result -eq "PONG") {
        Write-Host "✅ Redis is running successfully!" -ForegroundColor Green
        Write-Host "🔗 Redis is available at: redis://localhost:6379" -ForegroundColor Cyan
        return $true
    } else {
        Write-Host "❌ Redis connection test failed" -ForegroundColor Red
        return $false
    }
}

function Install-Redis-Memurai {
    Write-Host "🪟 Installing Redis using Memurai (Windows native)..." -ForegroundColor Blue
    
    Write-Host "📥 Please download Memurai from: https://www.memurai.com/" -ForegroundColor Yellow
    Write-Host "📥 Choose the free developer edition" -ForegroundColor Yellow
    Write-Host "📥 After installation, Memurai will run as a Windows service" -ForegroundColor Yellow
    
    # Check if Memurai is already installed
    try {
        $memuraiService = Get-Service -Name "Memurai*" -ErrorAction SilentlyContinue
        if ($memuraiService) {
            Write-Host "✅ Memurai service found: $($memuraiService.Name)" -ForegroundColor Green
            if ($memuraiService.Status -eq "Running") {
                Write-Host "✅ Memurai is already running!" -ForegroundColor Green
                return $true
            } else {
                Write-Host "🔄 Starting Memurai service..." -ForegroundColor Blue
                Start-Service $memuraiService.Name
                return $true
            }
        }
    } catch {
        Write-Host "ℹ️ Memurai not found. Please install it manually." -ForegroundColor Yellow
    }
    
    return $false
}

function Install-Redis-Chocolatey {
    Write-Host "🍫 Installing Redis using Chocolatey..." -ForegroundColor Blue
    
    # Check if Chocolatey is installed
    try {
        choco --version | Out-Null
        Write-Host "✅ Chocolatey is already installed" -ForegroundColor Green
    } catch {
        Write-Host "❌ Chocolatey is not installed. Installing Chocolatey..." -ForegroundColor Red
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    }
    
    # Install Redis
    Write-Host "📥 Installing Redis..." -ForegroundColor Blue
    choco install redis-64 -y
    
    # Start Redis
    Write-Host "🚀 Starting Redis..." -ForegroundColor Blue
    redis-server --daemonize yes
    
    # Test connection
    Write-Host "🧪 Testing Redis connection..." -ForegroundColor Blue
    Start-Sleep -Seconds 2
    try {
        $result = redis-cli ping
        if ($result -eq "PONG") {
            Write-Host "✅ Redis is running successfully!" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "❌ Redis connection test failed" -ForegroundColor Red
        return $false
    }
}

function Install-Redis-Manual {
    Write-Host "📋 Manual Redis Installation Instructions:" -ForegroundColor Blue
    Write-Host ""
    Write-Host "1. Download Redis for Windows from:" -ForegroundColor Yellow
    Write-Host "   https://github.com/microsoftarchive/redis/releases" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. Extract the downloaded file to C:\Redis" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "3. Open Command Prompt as Administrator" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "4. Navigate to Redis directory:" -ForegroundColor Yellow
    Write-Host "   cd C:\Redis" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "5. Start Redis server:" -ForegroundColor Yellow
    Write-Host "   redis-server.exe" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "6. Test Redis in another terminal:" -ForegroundColor Yellow
    Write-Host "   redis-cli.exe ping" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "7. If successful, you should see 'PONG'" -ForegroundColor Green
}

function Test-Redis-Connection {
    Write-Host "🧪 Testing Redis connection..." -ForegroundColor Blue
    
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $tcpClient.Connect("localhost", 6379)
        $tcpClient.Close()
        Write-Host "✅ Redis is accessible on localhost:6379" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ Redis is not accessible on localhost:6379" -ForegroundColor Red
        return $false
    }
}

# Main execution
Write-Host "🔍 Checking current Redis status..." -ForegroundColor Blue
$redisAvailable = Test-Redis-Connection

if ($redisAvailable) {
    Write-Host "✅ Redis is already running and accessible!" -ForegroundColor Green
    Write-Host "🔗 Redis URL: redis://localhost:6379" -ForegroundColor Cyan
    exit 0
}

Write-Host "❌ Redis is not available. Installing using method: $Method" -ForegroundColor Red
Write-Host ""

$success = $false

switch ($Method) {
    "docker" {
        $success = Install-Redis-Docker
    }
    "memurai" {
        $success = Install-Redis-Memurai
    }
    "chocolatey" {
        $success = Install-Redis-Chocolatey
    }
    "manual" {
        Install-Redis-Manual
        $success = $false  # Manual installation requires user action
    }
}

if ($success) {
    Write-Host ""
    Write-Host "🎉 Redis installation completed successfully!" -ForegroundColor Green
    Write-Host "🔗 Redis is now available at: redis://localhost:6379" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📊 You can test Redis with:" -ForegroundColor Blue
    Write-Host "   redis-cli ping" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🔄 Restart your backend server to use Redis instead of in-memory cache" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "⚠️ Redis installation was not successful or requires manual steps" -ForegroundColor Yellow
    Write-Host "💡 Your backend will continue to use in-memory cache as fallback" -ForegroundColor Blue
    Write-Host ""
    Write-Host "📚 For more installation options, see:" -ForegroundColor Blue
    Write-Host "   backend/REDIS_INSTALLATION_GUIDE.md" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "🔍 Testing final Redis connection..." -ForegroundColor Blue
$finalTest = Test-Redis-Connection

if ($finalTest) {
    Write-Host "✅ Redis is ready to use!" -ForegroundColor Green
} else {
    Write-Host "ℹ️ Redis is not available, but your backend will work with in-memory cache" -ForegroundColor Blue
}
