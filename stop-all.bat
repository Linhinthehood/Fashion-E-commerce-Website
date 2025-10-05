@echo off
echo ========================================
echo   Stopping Fashion E-commerce Website
echo ========================================
echo.

echo Stopping all Node.js processes...
taskkill /F /IM node.exe /T 2>nul

echo.
echo ========================================
echo   All Services Stopped!
echo ========================================
echo.
echo Press any key to exit...
pause > nul
