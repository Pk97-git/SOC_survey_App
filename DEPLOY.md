# SOC Survey - Deployment Guide

This document outlines the steps to deploy changes to the production environment (Windows + Nginx + PM2).

---

## 🏗️ 1. Backend Deployment
*Use these steps if you change anything in the `backend/` folder.*

1. **Rebuild the TypeScript code:**
   ```powershell
   cd backend
   npm run build
   ```
2. **Restart the PM2 service:**
   ```powershell
   pm2 restart soc-survey-backend
   ```
3. **Verify status:**
   ```powershell
   pm2 status
   ```

---

## 🌐 2. Frontend (Web) Deployment
*Use these steps if you change anything in the `FacilitySurveyApp/` folder.*

1. **Export the web bundle:**
   ```powershell
   cd FacilitySurveyApp
   npx expo export --platform web
   ```
2. **Sync files to Nginx root:**
   ```powershell
   # This copies everything from 'dist' to the actual folder served by Nginx
   robocopy dist ..\deploy\web /MIR
   ```
3. **Patch Paths (if needed):**
   ```powershell
   # If building fresh, ensure index.html points to /socsurvey/
   (Get-Content -Path "..\deploy\web\index.html") -replace 'src="/', 'src="/socsurvey/' -replace 'href="/', 'href="/socsurvey/' | Set-Content -Path "..\deploy\web\index.html"
   ```
4. **Reload Nginx:**
   ```powershell
   C:\nginx\nginx-1.24.0\nginx.exe -c C:\nginx\conf\nginx.conf -s reload
   ```

---

## 🛠️ 3. Environment Details
- **Nginx Config**: `C:\nginx\conf\nginx.conf`
- **Web Root**: `...\deploy\web`
- **Backend Port**: 3000
- **Database**: PostgreSQL (managed locally)

---

## 🛑 4. Troubleshooting
- **Old Version Still Appears?**
  - Press `Ctrl + F5` in your browser to clear the cache.
  - The `nginx.conf` is now set to kill cache for `index.html` automatically.
- **Backend Fails to Start?**
  - Check logs: `pm2 logs soc-survey-backend`.
  - Ensure port 3000 isn't blocked by another process.
