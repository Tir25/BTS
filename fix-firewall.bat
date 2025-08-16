@echo off
echo Adding Windows Firewall rules for cross-laptop testing...
echo.
echo This script needs to be run as Administrator
echo.

netsh advfirewall firewall add rule name="Vite Dev Server" dir=in action=allow protocol=TCP localport=5173
if %errorlevel% equ 0 (
    echo ✅ Vite Dev Server rule added successfully
) else (
    echo ❌ Failed to add Vite Dev Server rule
)

netsh advfirewall firewall add rule name="Backend API" dir=in action=allow protocol=TCP localport=3000
if %errorlevel% equ 0 (
    echo ✅ Backend API rule added successfully
) else (
    echo ❌ Failed to add Backend API rule
)

echo.
echo Firewall rules setup complete!
echo.
echo Test URLs:
echo - Backend: http://192.168.1.2:3000/health
echo - Frontend: http://192.168.1.2:5173
echo.
pause
