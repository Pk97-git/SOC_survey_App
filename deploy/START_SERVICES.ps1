# Production Deployment Script
# Run this as Administrator to start both services

$ErrorActionPreference = "Stop"

# Kill existing processes on ports 3000, 3001, 443
Write-Host "Stopping existing processes on ports 3000, 3001, 443..."
Get-NetTCPConnection -LocalPort 3000,3001,443 -ErrorAction SilentlyContinue | ForEach-Object { 
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue 
}
Start-Sleep -Seconds 2

# Start Backend
Write-Host "Starting Backend on port 3001..."
$backendPath = "C:\Users\Prashant\Documents\GH products\SOC products\Conditional survey\backend"
Start-Process -FilePath "node" -ArgumentList "src\server.ts" -WorkingDirectory $backendPath -WindowStyle Hidden

Start-Sleep -Seconds 3

# Start Frontend Combined Server  
Write-Host "Starting Frontend on port 443..."
$deployPath = "C:\Users\Prashant\Documents\GH products\SOC products\Conditional survey\deploy"
Start-Process -FilePath "node" -ArgumentList "combined-server.js" -WorkingDirectory $deployPath -WindowStyle Hidden

Start-Sleep -Seconds 3

# Test
Write-Host "`nTesting endpoints..."
Write-Host "Frontend: https://localhost/"
Write-Host "Backend API: http://localhost:3001/health"

# Keep script running
Write-Host "`nServices started. Press Ctrl+C to stop."
while ($true) { 
    Start-Sleep -Seconds 60 
}
