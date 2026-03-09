# Facility Survey Application Deployment Script
# Run as Administrator

param(
    [string]$BackendPath = "C:\WebApps\facility-backend",
    [string]$FrontendPath = "C:\WebApps\facility-app",
    [string]$ServiceName = "FacilitySurveyBackend",
    [int]$BackendPort = 3000
)

# Requires Administrator privileges
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script must be run as Administrator!"
    exit 1
}

Write-Host "=== Facility Survey Application Deployment ===" -ForegroundColor Green
Write-Host ""

# Step 1: Create directories
Write-Host "Step 1: Creating directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $BackendPath | Out-Null
New-Item -ItemType Directory -Force -Path $FrontendPath | Out-Null
Write-Host "Directories created." -ForegroundColor Green

# Step 2: Copy backend files
Write-Host "Step 2: Copying backend files..." -ForegroundColor Yellow
$SourceBackend = ".\backend"
if (Test-Path $SourceBackend) {
    Copy-Item -Path "$SourceBackend\*" -Destination $BackendPath -Recurse -Force
    Write-Host "Backend files copied to $BackendPath" -ForegroundColor Green
} else {
    Write-Warning "Backend source not found at $SourceBackend"
}

# Step 3: Copy frontend files
Write-Host "Step 3: Copying frontend files..." -ForegroundColor Yellow
$SourceFrontend = ".\FacilitySurveyApp\dist"
if (Test-Path $SourceFrontend) {
    Copy-Item -Path "$SourceFrontend\*" -Destination $FrontendPath -Recurse -Force
    Write-Host "Frontend files copied to $FrontendPath" -ForegroundColor Green
} else {
    Write-Warning "Frontend build not found at $SourceFrontend. Please build first: npm run build"
}

# Step 4: Copy web.config
Write-Host "Step 4: Copying IIS configuration..." -ForegroundColor Yellow
Copy-Item -Path ".\IIS_web.config" -Destination "$FrontendPath\web.config" -Force
Write-Host "IIS configuration copied." -ForegroundColor Green

# Step 5: Install backend dependencies
Write-Host "Step 5: Installing backend dependencies..." -ForegroundColor Yellow
Set-Location $BackendPath
& npm install --production
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to install backend dependencies"
    exit 1
}
Write-Host "Dependencies installed." -ForegroundColor Green

# Step 6: Create backend as Windows Service using NSSM
Write-Host "Step 6: Setting up backend as Windows Service..." -ForegroundColor Yellow

# Check if NSSM exists
$NSSMPath = "C:\ProgramData\chocolatey\bin\nssm.exe"
if (-not (Test-Path $NSSMPath)) {
    Write-Host "Installing NSSM (Non-Sucking Service Manager)..." -ForegroundColor Yellow
    try {
        choco install nssm -y
    } catch {
        Write-Warning "Could not install NSSM via Chocolatey. Please download from https://nssm.cc/download"
        exit 1
    }
}

# Remove existing service if exists
$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "Removing existing service..." -ForegroundColor Yellow
    & $NSSMPath remove $ServiceName confirm
}

# Create new service
Write-Host "Creating Windows Service: $ServiceName" -ForegroundColor Yellow
$NodePath = (Get-Command node).Source
& $NSSMPath install $ServiceName $NodePath
& $NSSMPath set $ServiceName AppDirectory $BackendPath
& $NSSMPath set $ServiceName AppParameters "src/server.ts"
& $NSSMPath set $ServiceName DisplayName "Facility Survey Backend"
& $NSSMPath set $ServiceName Description "Backend API service for Facility Survey Application"
& $NSSMPath set $ServiceName Start SERVICE_AUTO_START
& $NSSMPath set $ServiceName AppStdout "$BackendPath\logs\service.log"
& $NSSMPath set $ServiceName AppStderr "$BackendPath\logs\service-error.log"

# Create logs directory
New-Item -ItemType Directory -Force -Path "$BackendPath\logs" | Out-Null

# Start the service
Start-Service -Name $ServiceName
Write-Host "Service installed and started." -ForegroundColor Green

# Step 7: Configure Windows Firewall
Write-Host "Step 7: Configuring Windows Firewall..." -ForegroundColor Yellow

# Remove old rules if exist
Remove-NetFirewallRule -DisplayName "Facility Survey*" -ErrorAction SilentlyContinue

# Create rule for backend (localhost only, no external access needed with reverse proxy)
New-NetFirewallRule -DisplayName "Facility Survey Backend (Localhost)" `
    -Direction Inbound `
    -LocalPort $BackendPort `
    -Protocol TCP `
    -RemoteAddress LocalSubnet `
    -Action Allow `
    -Profile Any

Write-Host "Firewall configured." -ForegroundColor Green

# Step 8: Test backend
Write-Host "Step 8: Testing backend..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
$HealthCheck = Invoke-RestMethod -Uri "http://localhost:$BackendPort/health" -ErrorAction SilentlyContinue
if ($HealthCheck.status -eq "ok") {
    Write-Host "Backend is running and healthy!" -ForegroundColor Green
} else {
    Write-Warning "Backend health check failed. Please check logs."
}

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend Path: $FrontendPath" -ForegroundColor Cyan
Write-Host "Backend Path:  $BackendPath" -ForegroundColor Cyan
Write-Host "Backend Port:  $BackendPort" -ForegroundColor Cyan
Write-Host "Service Name:  $ServiceName" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Configure IIS website pointing to $FrontendPath" -ForegroundColor White
Write-Host "2. Bind SSL certificate to port 443" -ForegroundColor White
Write-Host "3. Ensure port 80 redirects to 443" -ForegroundColor White
Write-Host "4. Access application at https://your-domain.com" -ForegroundColor White
Write-Host ""
Write-Host "Logs:" -ForegroundColor Yellow
Write-Host "- Backend Service: $BackendPath\logs\" -ForegroundColor Gray
Write-Host "- IIS: %SystemDrive%\inetpub\logs\LogFiles\" -ForegroundColor Gray