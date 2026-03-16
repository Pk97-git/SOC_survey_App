@echo off
REM Install SOC Survey Backend as Windows Service using NSSM
REM Run this script as Administrator

set SERVICE_NAME=SOCSurveyBackend
set BACKEND_PATH=c:\Users\Prashant\Documents\GH products\SOC products\Conditional survey\backend
set NSSM_PATH=c:\Users\Prashant\Documents\GH products\SOC products\Conditional survey\tools\nssm-2.24\win64\nssm.exe

echo Installing SOC Survey Backend as Windows Service...

REM Stop service if it exists
"%NSSM_PATH%" stop %SERVICE_NAME% 2>nul

REM Remove service if it exists
"%NSSM_PATH%" remove %SERVICE_NAME% confirm 2>nul

REM Install service
"%NSSM_PATH%" install %SERVICE_NAME% "C:\Users\Prashant\Documents\GH products\SOC products\Conditional survey\deploy\run-backend.bat"

REM Set service to start automatically
"%NSSM_PATH%" set %SERVICE_NAME% Start SERVICE_AUTO_START

REM Set working directory
"%NSSM_PATH%" set %SERVICE_NAME% AppDirectory "%BACKEND_PATH%"

REM Set environment variables
"%NSSM_PATH%" set %SERVICE_NAME% AppEnvironmentExtra "NODE_ENV=production"

REM Set restart options
"%NSSM_PATH%" set %SERVICE_NAME% AppRestartDelay 5000

echo.
echo Service installed successfully!
echo.
echo To manage the service:
echo   Start:   net start %SERVICE_NAME%
echo   Stop:    net stop %SERVICE_NAME%
echo   Status:  sc query %SERVICE_NAME%
echo.
echo After installation, you need to configure IIS to proxy /api requests to this service (localhost:3000).
echo.

pause
