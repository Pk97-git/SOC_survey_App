@echo off
echo ========================================
echo   Stopping SOC Survey App
echo ========================================
echo.

REM Stop nginx
echo [1/2] Stopping nginx...
taskkill /F /IM nginx.exe 2>nul
if %ERRORLEVEL%==0 (echo nginx stopped) else (echo nginx was not running)

REM Stop Node.js backend
echo [2/2] Stopping Backend...
taskkill /F /IM node.exe 2>nul
if %ERRORLEVEL%==0 (echo Backend stopped) else (echo Backend was not running)

echo.
echo ========================================
echo   SOC Survey App stopped!
echo ========================================
echo.
pause
