@echo off
echo ========================================
echo   Starting SOC Survey App
echo ========================================
echo.

REM Start nginx (Frontend on port 443)
echo [1/2] Starting nginx (Frontend)...
start "nginx" "C:\nginx\nginx-1.24.0\nginx.exe"

REM Wait for nginx to start
timeout /t 2 /nobreak >nul

REM Start backend (Node.js on port 3000)
echo [2/2] Starting Backend...
start "Backend" "C:\Program Files\nodejs\node.exe" "-r" "C:\Users\Prashant\Documents\GH products\SOC products\Conditional survey\backend\node_modules\dotenv\config" "C:\Users\Prashant\Documents\GH products\SOC products\Conditional survey\backend\dist\server.js"

echo.
echo ========================================
echo   SOC Survey App is starting!
echo   - Frontend: https://20.233.49.59/
echo   - Backend: http://localhost:3000
echo ========================================
echo.
pause
