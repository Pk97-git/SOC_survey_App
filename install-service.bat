@echo off
REM Install Backend as Windows Service
REM Run as Administrator

echo ==========================================
echo Facility Survey Backend Service Installer
echo ==========================================
echo.

REM Check for admin privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Please run as Administrator!
    pause
    exit /b 1
)

set SERVICE_NAME=FacilitySurveyBackend
set NSSM_PATH=C:\ProgramData\chocolatey\bin\nssm.exe
set BACKEND_PATH=C:\WebApps\facility-backend
set NODE_PATH=C:\Program Files\nodejs\node.exe

echo Service Name: %SERVICE_NAME%
echo Backend Path: %BACKEND_PATH%
echo.

REM Check if NSSM is installed
if not exist "%NSSM_PATH%" (
    echo NSSM not found. Installing via Chocolatey...
    choco install nssm -y
    if %errorLevel% neq 0 (
        echo Failed to install NSSM. Please install manually from https://nssm.cc/
        pause
        exit /b 1
    )
)

REM Stop and remove existing service
sc query %SERVICE_NAME% >nul 2>&1
if %errorLevel% equ 0 (
    echo Stopping existing service...
    net stop %SERVICE_NAME% >nul 2>&1
    echo Removing existing service...
    "%NSSM_PATH%" remove %SERVICE_NAME% confirm >nul 2>&1
    timeout /t 2 >nul
)

REM Create logs directory
if not exist "%BACKEND_PATH%\logs" mkdir "%BACKEND_PATH%\logs"

echo Creating Windows Service...

REM Install service
"%NSSM_PATH%" install %SERVICE_NAME% "%NODE_PATH%"
"%NSSM_PATH%" set %SERVICE_NAME% AppDirectory "%BACKEND_PATH%"
"%NSSM_PATH%" set %SERVICE_NAME% AppParameters "src/server.ts"
"%NSSM_PATH%" set %SERVICE_NAME% DisplayName "Facility Survey Backend"
"%NSSM_PATH%" set %SERVICE_NAME% Description "Backend API service for Facility Survey Application"
"%NSSM_PATH%" set %SERVICE_NAME% Start SERVICE_AUTO_START
"%NSSM_PATH%" set %SERVICE_NAME% AppStdout "%BACKEND_PATH%\logs\service.log"
"%NSSM_PATH%" set %SERVICE_NAME% AppStderr "%BACKEND_PATH%\logs\service-error.log"
"%NSSM_PATH%" set %SERVICE_NAME% AppRotateFiles 1
"%NSSM_PATH%" set %SERVICE_NAME% AppRotateBytes 10485760

echo.
echo Starting service...
net start %SERVICE_NAME%

if %errorLevel% equ 0 (
    echo.
    echo ==========================================
    echo Service installed and started successfully!
    echo ==========================================
    echo.
    echo Service: %SERVICE_NAME%
    echo Status: sc query %SERVICE_NAME%
    echo Logs: %BACKEND_PATH%\logs\
    echo.
) else (
    echo.
    echo ERROR: Failed to start service!
    echo Check logs: %BACKEND_PATH%\logs\
    echo.
)

pause