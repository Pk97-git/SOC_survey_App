# Facility Survey App - Deployment Summary

## Server: Azure VM (20.233.255.53)

---

## ✅ COMPLETED TASKS

### 1. Backend API (Node.js/Express)
- **Status:** ✅ Running
- **Location:** C:\Users\PrashantK\Documents\CIT products testing\Condidtional survey\backend
- **Process:** facility-api (PM2)
- **Port:** 3000 (internal)
- **Access:** http://20.233.255.53/api
- **Health Check:** http://20.233.255.53/health

### 2. Database (PostgreSQL)
- **Status:** ✅ Connected
- **Database:** facility_survey
- **Port:** 5432
- **Default Users:**
  - admin@cit.com / admin123 (Super Admin)
  - reviewer@cit.com / reviewer123 (Reviewer)

### 3. IIS Configuration
- **Status:** ✅ Configured
- **Reverse Proxy:** Port 80 → 3000
- **URL Rewrite:** Enabled
- **ARR:** Enabled

### 4. Web Frontend (React Native Web)
- **Status:** ✅ Built & Deployed
- **Build Location:** C:\WebApps\facility-app\
- **Files:** 25 (HTML, JS, CSS, fonts)
- **SPA Config:** web.config created
- **Pending:** IIS website creation (requires admin)

### 5. Mobile App Configuration
- **Status:** ✅ Configured
- **API URL:** http://20.233.255.53/api
- **Build:** Ready for EAS

---

## ⏳ PENDING (Requires Admin/Your Action)

### 1. Create IIS Website for Frontend
**Run in PowerShell as Administrator:**
```powershell
Import-Module WebAdministration
New-Website -Name 'FacilityApp' -PhysicalPath 'C:\WebApps\facility-app' -Port 8080
```

### 2. Open Windows Firewall
```powershell
netsh advfirewall firewall add rule name="FacilityApp Web" dir=in action=allow protocol=tcp localport=8080
```

### 3. Azure NSG Rules
Open Azure Portal → VM → Networking → Add inbound port rules:
- **Port 80** (for API)
- **Port 8080** (for Web App)

### 4. Build Mobile APK
```bash
cd FacilitySurveyApp
npx eas build --platform android --profile production
```

---

## 🌐 ACCESS URLs (After Completion)

| Service | URL | Status |
|---------|-----|--------|
| Backend API | http://20.233.255.53/api | ✅ Ready |
| Health Check | http://20.233.255.53/health | ✅ Ready |
| Web Frontend | http://20.233.255.53:8080 | ⏳ Pending |
| API Documentation | http://20.233.255.53/api/health | ✅ Ready |

---

## 📁 IMPORTANT FILES

- `ADMIN_COMMANDS.txt` - Commands to run as admin
- `FRONTEND_WEB_CONFIG.md` - IIS configuration guide
- `IIS_web.config` - Backend reverse proxy config
- `DEPLOYMENT_SUMMARY.md` - This file

---

## 🔧 LOCAL CODE CHANGES (Made for Production)

### 1. backend/src/server.ts
- Modified CORS to allow IIS reverse proxy
- Changed: `if (!origin || NODE_ENV !== 'production')`
- To: `if (!origin)` (always allow no-origin)

### 2. FacilitySurveyApp/src/services/api.ts
- Already configured with production URL
- Production: `'http://20.233.255.53/api'`

### 3. FacilitySurveyApp/src/services/storage.ts
- Changed to dynamic import for getDb
- Prevents SQLite loading on web platform
- Enables web build to succeed

---

## 📞 SUPPORT

If backend stops:
```bash
pm2 restart facility-api
```

Check backend logs:
```bash
pm2 logs facility-api
```

---

**Deployment Date:** 2026-03-04
**Server IP:** 20.233.255.53
**Status:** Ready for testing after admin configuration
