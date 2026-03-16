@echo off
REM ===========================================
REM RUN THESE COMMANDS AS ADMINISTRATOR
REM ===========================================

echo ====== Step 1: Copy Frontend to IIS ======
xcopy /E /I /Y "C:\Users\Prashant\Documents\GH products\SOC products\Conditional survey\deploy\web" "C:\inetpub\wwwroot\SOCSurvey"

echo.
echo ====== Step 2: Install Backend Service ======
"C:\Users\Prashant\Documents\GH products\SOC products\Conditional survey\tools\nssm-2.24\win64\nssm.exe" install SOCSurveyBackend "C:\Program Files\nodejs\node.exe" "C:\Users\Prashant\Documents\GH products\SOC products\Conditional survey\backend\dist\server.js"
"C:\Users\Prashant\Documents\GH products\SOC products\Conditional survey\tools\nssm-2.24\win64\nssm.exe" set SOCSurveyBackend Start SERVICE_AUTO_START
"C:\Users\Prashant\Documents\GH products\SOC products\Conditional survey\tools\nssm-2.24\win64\nssm.exe" set SOCSurveyBackend AppDirectory "C:\Users\Prashant\Documents\GH products\SOC products\Conditional survey\backend"
"C:\Users\Prashant\Documents\GH products\SOC products\Conditional survey\tools\nssm-2.24\win64\nssm.exe" set SOCSurveyBackend AppEnvironmentExtra "NODE_ENV=production"

echo.
echo ====== Step 3: Start Backend Service ======
net start SOCSurveyBackend

echo.
echo ====== DONE! ======
echo Frontend: http://localhost/
echo API: http://localhost:3000/api
pause
