@echo off
REM 🚀 Vercel Deployment Script for Bus Tracking System (Windows)
REM This script automates the deployment process to Vercel

echo 🚀 Starting Vercel Deployment for Bus Tracking System
echo ==================================================

REM Check if Vercel CLI is installed
echo [INFO] Checking Vercel CLI installation...
vercel --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Vercel CLI not found. Installing...
    npm install -g vercel
    if %errorlevel% equ 0 (
        echo [SUCCESS] Vercel CLI installed successfully
    ) else (
        echo [ERROR] Failed to install Vercel CLI
        pause
        exit /b 1
    )
) else (
    echo [SUCCESS] Vercel CLI is already installed
)

REM Check if user is logged in to Vercel
echo [INFO] Checking Vercel login status...
vercel whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Not logged in to Vercel. Please login...
    vercel login
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to login to Vercel
        pause
        exit /b 1
    )
) else (
    echo [SUCCESS] Already logged in to Vercel
)

REM Build the frontend
echo [INFO] Building frontend application...
cd frontend

REM Install dependencies if needed
if not exist "node_modules" (
    echo [INFO] Installing frontend dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Run optimized build
echo [INFO] Running optimized build...
npm run build:optimized
if %errorlevel% equ 0 (
    echo [SUCCESS] Frontend build completed successfully
) else (
    echo [ERROR] Frontend build failed
    pause
    exit /b 1
)

cd ..

REM Deploy to Vercel
echo [INFO] Deploying to Vercel...
vercel --prod --yes
if %errorlevel% equ 0 (
    echo [SUCCESS] Deployment completed successfully!
    echo [INFO] Your app is now live on Vercel
) else (
    echo [ERROR] Deployment failed
    pause
    exit /b 1
)

echo.
echo 🎉 Deployment process completed!
echo ==================================================
echo Next steps:
echo 1. Check your Vercel dashboard for the deployment
echo 2. Test all functionality on the live site
echo 3. Set up custom domain if needed
echo 4. Configure monitoring and analytics
echo.
echo For troubleshooting, see: VERCEL_DEPLOYMENT_GUIDE.md
echo.
pause
