@echo off
echo Starting Backend...
start "Backend" cmd /k "cd /d c:\Users\Prashant\Documents\GH products\SOC products\Conditional survey\backend && npx ts-node src/server.ts"
timeout /t 3 /nobreak >nul
echo Starting Frontend...
start "Frontend" cmd /k "cd /d c:\Users\Prashant\Documents\GH products\SOC products\Conditional survey\deploy && node combined-server.js"
echo Both services started!
