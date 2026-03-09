# Frontend Website Access Guide

## Current Status

### Development Mode (Running Now)
The frontend is currently running in development mode:

```
URL: http://localhost:8081
Status: ✅ Running (Expo development server)
```

**Access it now:** Open browser and go to `http://localhost:8081`

---

## Production Deployment Steps

Since this is an Expo/React Native app, you need to build it for web first:

### Step 1: Build Frontend for Production

```bash
cd FacilitySurveyApp

# Install dependencies (if not done)
npm install

# Build for web
npx expo export:web

# This creates a 'web-build' folder with static files
```

### Step 2: Copy Build Files to IIS

```bash
# Copy built files to IIS folder
xcopy /E /I /Y FacilitySurveyApp\web-build\* C:\WebApps\facility-app\

# web.config is already there (reverse proxy configured)
```

### Step 3: Access the Website

After IIS is configured with the built files:

| Environment | URL | Notes |
|-------------|-----|-------|
| **Local Development** | `http://localhost:8081` | Expo dev server (currently running) |
| **Local IIS** | `http://localhost` | After building & copying to IIS |
| **Production** | `https://your-domain.com` | With SSL certificate |

---

## Quick Test (Right Now)

Since the development server is already running:

1. Open your web browser
2. Go to: `http://localhost:8081`
3. The app should load!

---

## Architecture After Production Deploy

```
User Browser → IIS (Port 80/443)
                    ├── /           → index.html (Frontend)
                    ├── /login      → index.html (SPA routing)
                    └── /api/*      → Backend (localhost:3000)
```

---

## Troubleshooting

### Can't access localhost:8081?
- Check if the terminal is still running `npm start`
- Try: `http://127.0.0.1:8081`
- Check Windows Firewall isn't blocking port 8081

### Blank page after build?
- Check browser console for errors
- Ensure API URL in `api.ts` points to correct backend
- Verify `web.config` is in the IIS folder

### API calls failing?
- Backend must be running on port 3000
- Check browser Network tab for CORS errors
- Verify IIS is proxying `/api/*` correctly

---

## Summary

| What You Want | How to Access |
|---------------|---------------|
| **Test now (development)** | `http://localhost:8081` ✅ Ready |
| **Production website** | Build → Deploy to IIS → `https://your-domain.com` |