# SOC Survey Application - Testing Announcement Email

---

**Subject:** SOC Condition Survey Application - Testing Environment Ready for Review

---

Dear SOC Team,

We are pleased to inform you that the **SOC Condition Survey Application** is now set up and ready for testing purposes.

## Access Details

**Application URL:** https://20.233.49.59/

**Note:** You may receive a browser security warning due to our self-signed SSL certificate. Please click "Advanced" → "Proceed to unsafe" to access the application.

---

## Test Accounts

The following test accounts have been created for your use:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@cit.com | admin123 |
| Surveyor | surveyor@cit.com | survey123 |

---

## Features Available for Testing

- ✅ User Login/Authentication
- ✅ Site Management
- ✅ Asset Import (Excel upload - tested with 25,899 assets)
- ✅ Survey Creation & Management
- ✅ Inspection Recording
- ✅ Survey Submission & Export
- ✅ Dashboard & Analytics

## Mobile App Coming Soon!

The **Android mobile app** is currently under testing and will be shared shortly. Until then, you can test the full functionality of the application by accessing the **web version** at the URL below:

**https://20.233.49.59/**

---

## Testing Scope

Please test the following workflows:

1. **Asset Management**
   - Import assets from Excel
   - View and filter assets by site

2. **Survey Workflow**
   - Create new surveys
   - Conduct inspections
   - Submit completed surveys
   - Export survey reports

3. **User Roles**
   - Test Admin features (user management, all sites)
   - Test Surveyor features (assigned sites only)

---

## Important Notes

- This is a **testing environment** - data may be reset periodically
- Please report any bugs or issues you encounter
- For support, contact the IT team

## Future: Microsoft Outlook Authentication

We are in the process of integrating **Microsoft Entra ID (Azure AD)** for single sign-on. This will allow users to login using their existing Microsoft/Outlook credentials, eliminating the need for separate passwords.

Stay tuned for updates on this feature!

---

## Technical Details

- **Server:** Windows Server 2019
- **Frontend:** React Native Web (Expo)
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Protocol:** HTTPS (port 443)

---

We appreciate your cooperation in testing the application. Your feedback will help us ensure a smooth deployment.

Regards,  
**IT Team**

