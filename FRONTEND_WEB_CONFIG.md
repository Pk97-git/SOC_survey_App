# Frontend Web App Configuration for IIS

## Overview
This configuration uses IIS as a reverse proxy to serve both the frontend web app and backend API on ports 80/443 only.

```
Internet → IIS (80/443) → ┬─> Static Files (Frontend)
                           └─> /api/* → Backend (localhost:3000)
```

## Architecture

| Port | Protocol | Purpose | Exposed |
|------|----------|---------|---------|
| 80 | HTTP | Redirect to HTTPS | Yes |
| 443 | HTTPS | Web + API | Yes |
| 3000 | HTTP | Backend API | **No** (localhost only) |

## Prerequisites

### Required IIS Modules
Run in PowerShell as Administrator:

```powershell
# Install URL Rewrite Module (download from Microsoft)
# https://www.iis.net/downloads/microsoft/url-rewrite

# Install Application Request Routing (ARR)
# https://www.iis.net/downloads/microsoft/application-request-routing

# Enable required IIS features
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServer
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole
Enable-WindowsOptionalFeature -Online -FeatureName IIS-StaticContent
Enable-WindowsOptionalFeature -Online -FeatureName IIS-DefaultDocument
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpRedirect
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpLogging
```

## Deployment Steps

### 1. Create Website Folder Structure

```
C:\WebApps\
├── facility-app\          # Frontend build files
│   ├── index.html
│   ├── static\
│   └── ...
└── backend\               # Backend (optional - can run anywhere)
```

### 2. Configure IIS Website

1. Open **IIS Manager** (inetmgr)
2. Right-click **Sites** → **Add Website**
3. Configure:
   - **Site name:** FacilitySurveyApp
   - **Physical path:** C:\WebApps\facility-app
   - **Binding:** 
     - Type: https
     - Port: 443
     - Host name: your-domain.com (or blank for IP)
   - **SSL Certificate:** Select or create self-signed
4. Click **OK**

### 3. Add HTTP Binding (for redirect)

1. Select the website → **Bindings** → **Add**
2. Configure:
   - Type: http
   - Port: 80
   - Host name: same as HTTPS
3. Click **OK**

### 4. Configure Application Pool

1. Go to **Application Pools**
2. Select the pool for your site (or create new)
3. Set **.NET CLR Version:** No Managed Code
4. Set **Managed Pipeline Mode:** Integrated

### 5. Deploy Configuration Files

Copy the `IIS_web.config` file to your web root:
```powershell
Copy-Item IIS_web.config C:\WebApps\facility-app\web.config
```

## Configuration Details

### URL Rewrite Rules

| Rule | Match | Action |
|------|-------|--------|
| HTTP→HTTPS | All | Redirect to HTTPS |
| API Proxy | `/api/*` | Rewrite to `http://localhost:3000/api/*` |
| Health Check | `/health` | Rewrite to `http://localhost:3000/health` |
| Static Files | Files that exist | Serve directly |
| SPA Routing | All others | Serve `index.html` |

### Security Headers Applied

- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

## Backend Configuration

Ensure backend allows requests from IIS:

```env
# backend/.env
ALLOWED_ORIGINS=https://your-domain.com,https://localhost
```

## Testing

After deployment, test these endpoints:

```bash
# Should redirect to HTTPS
curl -I http://your-domain.com

# Should serve frontend
curl https://your-domain.com

# Should proxy to backend
curl https://your-domain.com/api/health

# Should serve index.html for SPA routes
curl https://your-domain.com/login
```

## Troubleshooting

### 502 Bad Gateway
- Ensure backend is running on port 3000
- Check Windows Firewall allows localhost:3000
- Verify ARR proxy settings in IIS

### Static Files Not Loading
- Check file permissions on C:\WebApps\facility-app
- Verify Static Content feature is enabled
- Check web.config MIME type mappings

### API Calls Failing
- Verify CORS settings in backend
- Check X-Forwarded headers are passed correctly
- Review IIS logs: `%SystemDrive%\inetpub\logs\LogFiles`

## Backend Service Setup (Windows)

To keep backend running as a service:

```powershell
# Install NSSM (Non-Sucking Service Manager)
# https://nssm.cc/download

# Create Windows Service
nssm install FacilitySurveyBackend

# Configure:
Path: C:\path\to\node.exe
Startup directory: C:\WebApps\backend
Arguments: src/server.ts

# Start service
nssm start FacilitySurveyBackend
```

## Production Checklist

- [ ] SSL Certificate installed and valid
- [ ] HTTP to HTTPS redirect working
- [ ] Backend service auto-starts on boot
- [ ] File permissions configured correctly
- [ ] Firewall rules set (only 80/443 exposed)
- [ ] Logging enabled and configured
- [ ] Error handling pages configured
- [ ] Backup strategy in place
