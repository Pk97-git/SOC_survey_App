# Start both services
$backendJob = Start-Job -ScriptBlock {
    Set-Location "C:\Users\Prashant\Documents\GH products\SOC products\Conditional survey\backend"
    node src/server.ts
} -Name "Backend"

Start-Sleep -Seconds 3

$frontendJob = Start-Job -ScriptBlock {
    Set-Location "C:\Users\Prashant\Documents\GH products\SOC products\Conditional survey\deploy"
    node combined-server.js
} -Name "Frontend"

Write-Host "Both services starting..."
Write-Host "Backend PID: $backendJob.Id"
Write-Host "Frontend PID: $frontendJob.Id"
