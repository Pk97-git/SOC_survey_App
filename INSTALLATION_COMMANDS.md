# Installation Commands for Azure VM
## Run these as Administrator on the Azure Windows VM

---

## Step 1: Install IIS (PowerShell as Administrator)

```powershell
# Install IIS with all required features
Install-WindowsFeature -Name Web-Server -IncludeManagementTools -IncludeAllSubFeature

# Verify installation
Get-WindowsFeature -Name Web-Server
```

**Expected output:** `[InstallationState] : Installed`

---

## Step 2: Download and Install IIS URL Rewrite Module

```powershell
# Create temp directory
mkdir C:\Temp -Force

# Download URL Rewrite Module 2.1
Invoke-WebRequest -Uri "https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi" -OutFile "C:\Temp\rewrite_amd64_en-US.msi"

# Install it
Start-Process -FilePath "msiexec.exe" -ArgumentList "/i C:\Temp\rewrite_amd64_en-US.msi /quiet /norestart" -Wait

# Verify installation
Get-ChildItem "C:\Windows\System32\inetsrv\rewrite.dll"
```

---

## Step 3: Download and Install IIS ARR (Application Request Routing)

```powershell
# Download ARR 3.0
Invoke-WebRequest -Uri "https://download.microsoft.com/download/E/9/8/E9849D6A-022E-47B1-951E-F384FCE2DC09/requestRouter_amd64.msi" -OutFile "C:\Temp\requestRouter_amd64.msi"

# Install it
Start-Process -FilePath "msiexec.exe" -ArgumentList "/i C:\Temp\requestRouter_amd64.msi /quiet /norestart" -Wait
```

---

## Step 4: Install PM2 (Can run as regular user in cmd or PowerShell)

```bash
npm install -g pm2
```

Verify installation:
```bash
pm2 --version
```

---

## Step 5: Enable ARR Proxy (PowerShell as Administrator after ARR is installed)

```powershell
# Enable proxy functionality in ARR
Import-Module WebAdministration
Set-WebConfigurationProperty -pspath 'MACHINE/WEBROOT/APPHOST' -filter "system.webServer/proxy" -name "enabled" -value "True"
```

---

## Step 6: Verify All Installations

```powershell
# Check IIS
Get-WindowsFeature -Name Web-Server | Select-Object Name,Installed

# Check URL Rewrite
Test-Path "C:\Windows\System32\inetsrv\rewrite.dll"

# Check ARR
Test-Path "C:\Windows\System32\inetsrv\arr.dll"

# Check PM2 (in regular cmd/powershell)
pm2 --version
```

---

## Next Steps After Installation

1. Deploy backend code to `C:\apps\facility-survey\backend\`
2. Create `.env` file with database credentials
3. Run `npm install` and `npm run build`
4. Configure IIS reverse proxy
5. Start backend with PM2

---

**Run Steps 1-3 as Administrator, then Step 4 as regular user.**
