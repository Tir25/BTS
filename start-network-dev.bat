@echo off
echo 🌐 Starting Cross-Laptop Development Environment
echo ================================================

echo.
echo 📡 Detecting network configuration...
ipconfig | findstr "IPv4 Address"

echo.
echo 🚀 Starting Backend Server...
cd backend
start "Backend Server" cmd /k "npm run dev"

echo.
echo ⏳ Waiting for backend to start...
timeout /t 5 /nobreak > nul

echo.
echo 🎨 Starting Frontend Server...
cd ..\frontend
start "Frontend Server" cmd /k "npm run dev"

echo.
echo ⏳ Waiting for frontend to start...
timeout /t 3 /nobreak > nul

echo.
echo 🌐 Opening Network Test Client...
start http://192.168.1.2:5173/network-test-client.html

echo.
echo 🎉 Cross-Laptop Development Environment Started!
echo.
echo 📱 Access URLs:
echo    Main App: http://192.168.1.2:5173/
echo    Network Test: http://192.168.1.2:5173/network-test-client.html
echo    Backend API: http://192.168.1.2:3000/
echo    Health Check: http://192.168.1.2:3000/health
echo.
echo 💡 Share these URLs with other laptops on your network!
echo.
pause
