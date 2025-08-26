@echo off
setlocal enabledelayedexpansion

REM Bus Tracking System Docker Deployment Script for Windows
REM Usage: deploy.bat [dev|prod]

set "MODE=%1"
if "%MODE%"=="" set "MODE=prod"

echo.
echo [INFO] Bus Tracking System Docker Deployment
echo [INFO] ======================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker Desktop and try again.
    pause
    exit /b 1
)
echo [SUCCESS] Docker is running

REM Check if .env file exists
if not exist ".env" (
    echo [WARNING] .env file not found. Creating from template...
    copy "backend\env.production" ".env"
    echo [WARNING] Please update .env file with your actual values before deploying.
    pause
    exit /b 1
)
echo [SUCCESS] .env file found

REM Deploy based on mode
if "%MODE%"=="dev" (
    echo [INFO] Deploying development environment...
    
    REM Stop existing containers
    docker-compose -f docker-compose.dev.yml down --remove-orphans
    
    REM Build and start containers
    docker-compose -f docker-compose.dev.yml up --build -d
    
    echo [SUCCESS] Development environment deployed successfully!
    echo [INFO] Backend is running on http://localhost:3000
    echo [INFO] View logs: docker-compose -f docker-compose.dev.yml logs -f backend
    
) else if "%MODE%"=="prod" (
    echo [INFO] Deploying production environment...
    
    REM Stop existing containers
    docker-compose down --remove-orphans
    
    REM Build and start containers
    docker-compose up --build -d
    
    echo [SUCCESS] Production environment deployed successfully!
    echo [INFO] Backend is running on http://localhost:3000
    echo [INFO] Nginx proxy is running on http://localhost:80
    echo [INFO] View logs: docker-compose logs -f backend
    
) else if "%MODE%"=="logs" (
    if "%2%"=="dev" (
        docker-compose -f docker-compose.dev.yml logs -f backend
    ) else (
        docker-compose logs -f backend
    )
    
) else if "%MODE%"=="stop" (
    if "%2%"=="dev" (
        docker-compose -f docker-compose.dev.yml down
    ) else (
        docker-compose down
    )
    echo [SUCCESS] Containers stopped
    
) else if "%MODE%"=="cleanup" (
    echo [INFO] Cleaning up Docker resources...
    docker system prune -f
    docker volume prune -f
    echo [SUCCESS] Cleanup completed
    
) else if "%MODE%"=="help" (
    echo Usage: deploy.bat [dev^|prod^|logs^|stop^|cleanup]
    echo.
    echo Commands:
    echo   dev     - Deploy development environment
    echo   prod    - Deploy production environment (default)
    echo   logs    - Show container logs
    echo   stop    - Stop containers
    echo   cleanup - Clean up Docker resources
    echo   help    - Show this help message
    
) else (
    echo [ERROR] Invalid option: %MODE%
    echo Use 'deploy.bat help' for usage information
    pause
    exit /b 1
)

echo.
pause
