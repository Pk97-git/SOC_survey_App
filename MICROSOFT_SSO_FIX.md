# Microsoft SSO Login Fix - AADSTS50194 Error

## Problem
**Error:** `AADSTS50194: Application is not configured as a multi-tenant application`

**What it means:**
- Your Azure AD app is configured as **"Single Tenant"** (only your company users can log in)
- But the code was using the **`/common/`** endpoint (for multi-tenant apps)
- Microsoft rejected the login because of this mismatch

## Solution Implemented

### ✅ **Changes Made:**

#### 1. **Backend - `backend/src/routes/auth.routes.ts`**
Changed from hardcoded `/common/` to tenant-specific endpoint:

```typescript
// BEFORE (Wrong):
const msJwksClient = jwksClient({
    jwksUri: 'https://login.microsoftonline.com/common/discovery/v2.0/keys'
});

// AFTER (Fixed):
const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
const msJwksClient = jwksClient({
    jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`
});
```

#### 2. **Frontend - `FacilitySurveyApp/src/screens/LoginScreen.tsx`**
Changed from hardcoded `/common/` to tenant-specific endpoint:

```typescript
// BEFORE (Wrong):
const discovery: AuthSession.DiscoveryDocument = {
    authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
};

// AFTER (Fixed):
const tenantId = Constants.expoConfig?.extra?.microsoftTenantId || 'common';
const discovery: AuthSession.DiscoveryDocument = {
    authorizationEndpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
    tokenEndpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
};
```

#### 3. **Environment Files Updated:**

**Backend `.env`:**
```env
# Microsoft Entra ID (Outlook SSO)
# IMPORTANT: For single-tenant apps, use your actual tenant ID instead of 'common'
# Find your tenant ID in Azure Portal -> Azure Active Directory -> Overview -> Tenant ID
# Example: cc1559b9-4d98-451c-bf76-f92e14421b99
MICROSOFT_CLIENT_ID=your_microsoft_client_id_here
MICROSOFT_TENANT_ID=your_tenant_id_here
```

**Frontend `.env`:**
```env
# Microsoft Entra ID (Outlook SSO)
# IMPORTANT: For single-tenant apps, use your actual tenant ID instead of 'common'
# Find your tenant ID in Azure Portal -> Azure Active Directory -> Overview -> Tenant ID
# Example: cc1559b9-4d98-451c-bf76-f92e14421b99
EXPO_PUBLIC_MICROSOFT_CLIENT_ID=your_microsoft_client_id_here
EXPO_PUBLIC_MICROSOFT_TENANT_ID=your_tenant_id_here
```

---

## How to Configure (Next Steps)

### **Step 1: Get Your Tenant ID from Azure Portal**

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** (search in top bar)
3. Click **Overview** in left sidebar
4. Find **Tenant ID** (looks like: `cc1559b9-4d98-451c-bf76-f92e14421b99`)
5. **Copy this value**

### **Step 2: Get Your Client ID (App Registration ID)**

1. In Azure Portal, go to **Azure Active Directory**
2. Click **App Registrations** in left sidebar
3. Find your app (e.g., "CIT Operations" or "Conditional Survey App")
4. Click on it
5. Find **Application (client) ID** (looks like: `e869eb2e-...`)
6. **Copy this value**

### **Step 3: Update Backend .env File**

Open `backend/.env` and replace placeholders:

```env
MICROSOFT_CLIENT_ID=e869eb2e-YOUR-ACTUAL-CLIENT-ID-HERE
MICROSOFT_TENANT_ID=cc1559b9-YOUR-ACTUAL-TENANT-ID-HERE
```

### **Step 4: Update Frontend .env File**

Open `FacilitySurveyApp/.env` and replace placeholders:

```env
EXPO_PUBLIC_MICROSOFT_CLIENT_ID=e869eb2e-YOUR-ACTUAL-CLIENT-ID-HERE
EXPO_PUBLIC_MICROSOFT_TENANT_ID=cc1559b9-YOUR-ACTUAL-TENANT-ID-HERE
```

### **Step 5: Restart Backend Server**

```bash
cd backend
npm run dev
```

### **Step 6: Restart Frontend App**

```bash
cd FacilitySurveyApp
npm start
# Then press 'w' for web, 'a' for Android, or 'i' for iOS
```

---

## How to Test

### **Test 1: Web Login**
1. Open web app: `http://localhost:19006`
2. Click **"Sign in with Microsoft"** button
3. Should redirect to Microsoft login
4. Login with your company account
5. Should redirect back and log you in successfully

### **Test 2: Mobile Login**
1. Open mobile app (iOS/Android simulator or device)
2. Click **"Sign in with Microsoft"** button
3. Should open browser for Microsoft login
4. Login with your company account
5. Should return to app and log you in successfully

---

## Expected Behavior After Fix

### **Before Fix:**
```
❌ Error: AADSTS50194: Application is not configured as a multi-tenant application
❌ Login fails with Azure AD error
```

### **After Fix:**
```
✅ Microsoft login page opens
✅ User logs in with company credentials
✅ App receives ID token
✅ Backend validates token
✅ User is logged into the app
```

---

## Troubleshooting

### **Issue 1: Still Getting AADSTS50194 Error**

**Possible Causes:**
1. Didn't restart backend/frontend after updating .env
2. Tenant ID is incorrect
3. Client ID is incorrect
4. Cached build - need to clear cache

**Solution:**
```bash
# Clear backend cache
cd backend
rm -rf dist/
npm run build
npm run dev

# Clear frontend cache
cd FacilitySurveyApp
npx expo start --clear
```

### **Issue 2: "Application not found" Error**

**Possible Causes:**
- Client ID is wrong or doesn't exist in Azure

**Solution:**
1. Double-check Client ID in Azure Portal
2. Make sure you're looking at the correct app registration
3. Verify the app hasn't been deleted

### **Issue 3: "User not registered in system" Error**

**Possible Causes:**
- User's Microsoft email doesn't exist in your database

**Solution:**
1. Admin needs to create user account first via `/api/auth/register`
2. Email in database must match Microsoft account email exactly
3. User must be set to `is_active = true`

### **Issue 4: Different App Name in Error**

**Example:** Error mentions "Conditional Survey App" but you're using "CIT Operations"

**Possible Causes:**
- Using wrong Client ID (from different app registration)
- Multiple app registrations exist in Azure

**Solution:**
1. Check which app registration your Client ID belongs to
2. Make sure you're using the correct Client ID for your desired app
3. If needed, create new app registration with correct name

---

## Azure AD App Configuration Checklist

Make sure your Azure AD app registration has these settings:

### **Authentication**
- ✅ Platform: Single-page application (SPA)
- ✅ Redirect URI: `facilitysurveyapp://` (for mobile)
- ✅ Redirect URI: `http://localhost:19006` (for web dev)
- ✅ ID tokens: **Enabled**
- ✅ Supported account types: **Single tenant** (Accounts in this organizational directory only)

### **API Permissions**
- ✅ Microsoft Graph: `openid`
- ✅ Microsoft Graph: `profile`
- ✅ Microsoft Graph: `email`
- ✅ Admin consent: **Granted** (if required)

### **Token Configuration** (Optional)
- Optional claims:
  - `email`
  - `preferred_username`
  - `upn`

---

## Common Tenant ID vs Common Endpoint

### **When to Use `/common/`:**
- ❌ **DO NOT USE** for your app (single-tenant)
- Multi-tenant apps (any Microsoft account can log in)
- Apps like Zoom, Slack that allow any company to sign up

### **When to Use Tenant ID:**
- ✅ **USE THIS** for your app
- Internal company apps
- Apps where only your employees can log in
- Your use case: CIT Operations survey app

---

## Files Changed

### Backend
- ✅ `backend/src/routes/auth.routes.ts` - Updated to use tenant ID
- ✅ `backend/.env` - Added MICROSOFT_TENANT_ID with instructions

### Frontend
- ✅ `FacilitySurveyApp/src/screens/LoginScreen.tsx` - Updated to use tenant ID
- ✅ `FacilitySurveyApp/.env` - Added EXPO_PUBLIC_MICROSOFT_TENANT_ID
- ✅ `FacilitySurveyApp/.env.example` - Added tenant ID example
- ✅ `FacilitySurveyApp/app.config.js` - Already configured to read tenant ID

---

## Summary

**What was fixed:**
- ✅ Backend now uses tenant-specific JWKS endpoint
- ✅ Frontend now uses tenant-specific auth/token endpoints
- ✅ Environment variables added for tenant ID
- ✅ Documentation created for setup

**What you need to do:**
1. Get Tenant ID from Azure Portal
2. Get Client ID from Azure Portal
3. Update `backend/.env` with actual values
4. Update `FacilitySurveyApp/.env` with actual values
5. Restart backend and frontend
6. Test Microsoft login

**Expected result:**
- Microsoft SSO login works without AADSTS50194 error
- Only users from your tenant can log in
- Secure single-tenant authentication

---

## Questions?

If you encounter issues:
1. Check the Troubleshooting section above
2. Verify your Azure AD app registration settings
3. Make sure tenant ID and client ID are correct
4. Clear caches and restart servers
5. Check backend console logs for detailed error messages
