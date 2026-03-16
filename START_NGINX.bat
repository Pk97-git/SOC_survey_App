@echo off
echo Stopping IIS to free port 443...
iisreset /stop

echo Starting backend on port 3000...
cd /d C:\Users\Prashant\Documents\GH products\SOC products\Conditional survey\backend
start "Backend" cmd /k "npx ts-node src/server.ts"

echo Waiting for backend to start...
timeout /t 5 /nobreak

echo Starting nginx...
cd /d C:\nginx\nginx-1.24.0
start "nginx" nginx.exe

echo.
echo Services started:
echo - Backend: http://localhost:3000
echo - Frontend + API: https://localhost (via nginx)
pause
