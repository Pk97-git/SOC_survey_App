# 🧪 CIT Facility Survey App - Comprehensive Testing Guide

## Table of Contents
1. [Test Environment Setup](#test-environment-setup)
2. [User Management Tests](#user-management-tests)
3. [Authentication Tests](#authentication-tests)
4. [Survey Workflow Tests](#survey-workflow-tests)
5. [Photo Upload & Excel Export Tests](#photo-upload--excel-export-tests)
6. [Review Workflow Tests](#review-workflow-tests)
7. [Security Tests](#security-tests)
8. [Performance Tests](#performance-tests)

---

## Test Environment Setup

### Prerequisites
- ✅ Backend running on port 3000
- ✅ Database seeded with test data
- ✅ Frontend accessible (web/mobile)
- ✅ Test user accounts created (admin, surveyor, reviewer)

### Test Accounts
```
Admin:
  Email: admin@cit.com
  Password: (set by admin)

Surveyor:
  Email: surveyor@cit.com
  Password: (set by admin)

Reviewer (MAG):
  Email: mag.reviewer@cit.com
  Password: (set by admin)

Reviewer (CIT):
  Email: cit.reviewer@cit.com
  Password: (set by admin)

Reviewer (DGDA):
  Email: dgda.reviewer@cit.com
  Password: (set by admin)
```

---

## 1. User Management Tests

### 1.1 User Creation (Admin Only)

**Test Case:** Create New Surveyor
- [ ] Login as admin
- [ ] Navigate to User Management
- [ ] Click "+" FAB button
- [ ] Fill in user details:
  - Full Name: "Test Surveyor"
  - Email: "test.surveyor@test.com"
  - Role: Surveyor
  - Click "Generate" for password
- [ ] Verify password is copied to clipboard
- [ ] Click "Save"
- [ ] ✅ Verify success message
- [ ] ✅ Verify user appears in list
- [ ] ✅ Verify user can login with generated password

**Test Case:** Create New Reviewer with Organization
- [ ] Login as admin
- [ ] Navigate to User Management
- [ ] Click "+" FAB button
- [ ] Fill in user details:
  - Full Name: "Test Reviewer"
  - Email: "test.reviewer@test.com"
  - Role: Reviewer
  - Organization: MAG
  - Generate password
- [ ] Click "Save"
- [ ] ✅ Verify user appears with "MAG" organization label
- [ ] ✅ Verify reviewer can login

**Test Case:** Password Validation
- [ ] Try to create user with weak password "123"
- [ ] ✅ Verify inline error: "At least 8 characters"
- [ ] Enter "Test1234"
- [ ] ✅ Verify all validation rules pass
- [ ] ✅ Verify success message appears

**Test Case:** Duplicate Email Prevention
- [ ] Try to create user with existing email
- [ ] ✅ Verify error: "User with this email already exists"

### 1.2 User Editing

**Test Case:** Update User Role
- [ ] Login as admin
- [ ] Open user menu (3 dots)
- [ ] Click "Edit"
- [ ] Change role from Surveyor to Admin
- [ ] Click "Save"
- [ ] ✅ Verify role badge updates
- [ ] ✅ Verify audit log records change
- [ ] Login as updated user
- [ ] ✅ Verify new role permissions apply

**Test Case:** Update Reviewer Organization
- [ ] Edit a reviewer user
- [ ] Change organization from MAG to CIT
- [ ] ✅ Verify organization label updates

**Test Case:** Admin Cannot Edit Own Account
- [ ] Login as admin
- [ ] Try to edit own user account
- [ ] ✅ Verify error: "Cannot modify your own account"

### 1.3 User Activation/Deactivation

**Test Case:** Deactivate User
- [ ] Login as admin
- [ ] Open user menu → "Deactivate"
- [ ] ✅ Verify user status changes
- [ ] Try to login as deactivated user
- [ ] ✅ Verify error: "Account is deactivated"

**Test Case:** Reactivate User
- [ ] Open deactivated user menu → "Activate"
- [ ] ✅ Verify user can login again

**Test Case:** Cannot Deactivate Self
- [ ] Try to deactivate own admin account
- [ ] ✅ Verify error: "Cannot deactivate your own account"

### 1.4 User Deletion

**Test Case:** Delete User with Anonymization
- [ ] Create a test user
- [ ] Have them create a survey
- [ ] Login as admin
- [ ] Open user menu → "Delete"
- [ ] ✅ Verify warning message about anonymization
- [ ] Confirm deletion
- [ ] ✅ Verify user removed from list
- [ ] Check survey record
- [ ] ✅ Verify surveyor_id is NULL (anonymized)
- [ ] ✅ Verify survey data preserved

**Test Case:** Cannot Delete Self
- [ ] Try to delete own admin account
- [ ] ✅ Verify error: "Cannot delete your own account"

### 1.5 Audit Logs

**Test Case:** View User Audit Logs
- [ ] Open user menu → "Audit Logs"
- [ ] ✅ Verify modal shows action history
- [ ] ✅ Verify timestamps are correct
- [ ] ✅ Verify actions include: creation, edits, login attempts

### 1.6 Search Functionality

**Test Case:** Search Users
- [ ] Type user's email in search bar
- [ ] ✅ Verify filtered list shows matching users
- [ ] Type user's full name
- [ ] ✅ Verify search works by name
- [ ] Clear search
- [ ] ✅ Verify all users reappear

---

## 2. Authentication Tests

### 2.1 Email/Password Login

**Test Case:** Successful Login
- [ ] Open login screen
- [ ] Enter valid email and password
- [ ] Click "Login"
- [ ] ✅ Verify redirect to home screen
- [ ] ✅ Verify user name appears in header
- [ ] ✅ Verify appropriate tabs show based on role

**Test Case:** Invalid Credentials
- [ ] Enter wrong password
- [ ] ✅ Verify error: "Invalid credentials"
- [ ] ✅ Verify failed attempt logged in audit log

**Test Case:** Account Lockout (Security)
- [ ] Enter wrong password 5 times
- [ ] ✅ Verify error: "Account locked due to too many failed attempts"
- [ ] ✅ Verify lockout message shows time remaining
- [ ] Wait 15 minutes
- [ ] Try login again
- [ ] ✅ Verify account is unlocked

### 2.2 Microsoft SSO Login

**Test Case:** Microsoft Login Flow
- [ ] Click "Sign in with Microsoft"
- [ ] ✅ Verify redirect to Microsoft login page
- [ ] Complete Microsoft authentication
- [ ] ✅ Verify redirect back to app
- [ ] ✅ Verify user logged in automatically
- [ ] ✅ Verify token stored securely

**Test Case:** Microsoft SSO - New User Auto-Creation
- [ ] Login with Microsoft account not in system
- [ ] ✅ Verify account auto-created
- [ ] ✅ Verify default role assigned (surveyor)
- [ ] ✅ Verify user can access surveyor features

### 2.3 Token Management

**Test Case:** Token Expiration
- [ ] Login successfully
- [ ] Wait 24 hours (or modify JWT expiry for testing)
- [ ] Try to access protected endpoint
- [ ] ✅ Verify error: "Token expired"
- [ ] ✅ Verify redirect to login

**Test Case:** Logout
- [ ] Click profile → "Logout"
- [ ] ✅ Verify redirect to login screen
- [ ] ✅ Verify token blacklisted
- [ ] Try to use old token
- [ ] ✅ Verify error: "Token has been revoked"

---

## 3. Survey Workflow Tests

### 3.1 Create Survey (Surveyor)

**Test Case:** Start New Survey
- [ ] Login as surveyor
- [ ] Navigate to Home
- [ ] Click "Start New Survey"
- [ ] Select site: "Test Site"
- [ ] Select trade: "MECHANICAL"
- [ ] Select location: "Building A"
- [ ] Click "Start Survey"
- [ ] ✅ Verify survey created with status "draft"
- [ ] ✅ Verify assets loaded for selected site/trade
- [ ] ✅ Verify survey appears in "My Surveys"

### 3.2 Conduct Inspection

**Test Case:** Complete Asset Inspection
- [ ] Open active survey
- [ ] Find first asset in list
- [ ] Select condition rating: "C >> Good"
- [ ] ✅ Verify rating button highlights
- [ ] Select overall condition: "Satisfactory"
- [ ] Enter quantity installed: 5
- [ ] Enter quantity working: 4
- [ ] Enter remarks: "Minor wear visible"
- [ ] Click "Capture GPS"
- [ ] ✅ Verify GPS coordinates populated
- [ ] Add 3 photos
- [ ] ✅ Verify photos appear in gallery
- [ ] ✅ Verify auto-save indicator shows
- [ ] ✅ Verify "Complete" chip appears on asset

**Test Case:** Inspect Multiple Assets
- [ ] Complete inspections for 10 assets
- [ ] ✅ Verify progress counter updates
- [ ] ✅ Verify all data persists on app restart

### 3.3 Offline Functionality

**Test Case:** Offline Survey Creation (Mobile)
- [ ] Turn off internet connection
- [ ] Start new survey
- [ ] Complete 5 inspections
- [ ] Add photos
- [ ] ✅ Verify all data saved locally (SQLite)
- [ ] Turn on internet
- [ ] ✅ Verify automatic sync triggers
- [ ] ✅ Verify photos uploaded
- [ ] ✅ Verify inspections synced to server

### 3.4 Submit Survey

**Test Case:** Submit Incomplete Survey
- [ ] Try to submit survey with incomplete assets
- [ ] ✅ Verify warning lists incomplete assets
- [ ] ✅ Verify option to "Submit Anyway"

**Test Case:** Submit Complete Survey
- [ ] Complete all asset inspections
- [ ] Click "Submit Survey"
- [ ] ✅ Verify confirmation dialog shows summary
- [ ] Confirm submission
- [ ] ✅ Verify status changes to "submitted"
- [ ] ✅ Verify survey locked from further edits
- [ ] ✅ Verify survey appears in reviewer queue

### 3.5 Export Survey

**Test Case:** Export to Excel (Web)
- [ ] Open submitted survey
- [ ] Click "Export"
- [ ] ✅ Verify Excel file downloads automatically
- [ ] Open Excel file
- [ ] ✅ Verify all asset data present
- [ ] ✅ Verify all photos embedded correctly
- [ ] ✅ Verify condition ratings color-coded
- [ ] ✅ Verify site/trade header information correct

**Test Case:** Export to Excel (Mobile)
- [ ] Click "Export"
- [ ] ✅ Verify share dialog appears
- [ ] Share to email/drive
- [ ] ✅ Verify file received
- [ ] ✅ Verify photos embedded correctly

---

## 4. Photo Upload & Excel Export Tests

### 4.1 Web Photo Upload

**Test Case:** Upload Photo on Web
- [ ] Open survey in web browser
- [ ] Click "Add Photo"
- [ ] Select image file
- [ ] ✅ Verify upload progress indicator
- [ ] ✅ Verify photo appears in gallery
- [ ] ✅ Verify photo stored with UUID
- [ ] Save inspection
- [ ] Export to Excel
- [ ] ✅ Verify photo embedded in Excel ✅

### 4.2 Mobile Photo Upload

**Test Case:** Take Photo with Camera
- [ ] Open survey on mobile
- [ ] Click "Add Photo"
- [ ] Select "Take Photo"
- [ ] ✅ Verify camera opens
- [ ] Take photo
- [ ] ✅ Verify photo compressed (~500KB)
- [ ] ✅ Verify photo saved locally
- [ ] Go online
- [ ] ✅ Verify photo uploads automatically
- [ ] Export to Excel
- [ ] ✅ Verify photo embedded in Excel ✅

**Test Case:** Pick from Gallery
- [ ] Click "Add Photo" → "Choose from Gallery"
- [ ] Select 5 photos
- [ ] ✅ Verify all 5 photos compressed
- [ ] ✅ Verify all photos appear
- [ ] ✅ Verify max 10 photos enforced

### 4.3 Excel Photo Embedding

**Test Case:** Surveyor Photos in Excel
- [ ] Create survey with 10 assets
- [ ] Add 3 photos to each asset
- [ ] Submit and export
- [ ] ✅ Verify all 30 photos embedded
- [ ] ✅ Verify photos in correct cells
- [ ] ✅ Verify photo sizing correct

**Test Case:** Review Photos in Excel
- [ ] Add MAG review comments with 2 photos
- [ ] Add CIT review comments with 1 photo
- [ ] Export to Excel
- [ ] ✅ Verify all review photos embedded ✅
- [ ] ✅ Verify photos in audit column

---

## 5. Review Workflow Tests

### 5.1 Reviewer Assignment

**Test Case:** View Submitted Surveys
- [ ] Login as MAG reviewer
- [ ] Navigate to Surveys tab
- [ ] ✅ Verify submitted surveys appear
- [ ] ✅ Verify only relevant surveys shown

### 5.2 Add Review Comments

**Test Case:** Add MAG Review
- [ ] Open submitted survey
- [ ] For first inspection, click "Add Review"
- [ ] Enter MAG comments: "Requires maintenance"
- [ ] Add 2 review photos
- [ ] Save review
- [ ] ✅ Verify comments saved
- [ ] ✅ Verify photos uploaded
- [ ] ✅ Verify review appears in inspection

**Test Case:** Add Multiple Organization Reviews
- [ ] Login as CIT reviewer
- [ ] Add CIT comments to same survey
- [ ] Login as DGDA reviewer
- [ ] Add DGDA comments
- [ ] ✅ Verify all three reviews coexist
- [ ] Export to Excel
- [ ] ✅ Verify all comments in respective columns

### 5.3 Complete Review

**Test Case:** Mark Survey as Completed
- [ ] Complete all reviews
- [ ] Click "Mark as Completed"
- [ ] ✅ Verify status changes to "completed"
- [ ] ✅ Verify survey locked
- [ ] ✅ Verify survey removed from active queue

---

## 6. Security Tests

### 6.1 Role-Based Access Control

**Test Case:** Surveyor Cannot Access Admin Features
- [ ] Login as surveyor
- [ ] Try to access `/admin/users` via URL
- [ ] ✅ Verify 403 Forbidden error
- [ ] ✅ Verify redirect to home

**Test Case:** Reviewer Cannot Create Users
- [ ] Login as reviewer
- [ ] Try to access user management
- [ ] ✅ Verify feature not visible
- [ ] Try direct API call: `POST /api/auth/register`
- [ ] ✅ Verify 403 error

**Test Case:** Admin Can Access Everything
- [ ] Login as admin
- [ ] ✅ Verify all tabs visible
- [ ] ✅ Verify can create surveys
- [ ] ✅ Verify can manage users
- [ ] ✅ Verify can view all surveys

### 6.2 SQL Injection Prevention

**Test Case:** SQL Injection in Login
- [ ] Enter email: `admin@test.com' OR '1'='1`
- [ ] ✅ Verify login fails (not vulnerable)

**Test Case:** SQL Injection in Search
- [ ] Search users: `' OR 1=1 --`
- [ ] ✅ Verify no SQL error
- [ ] ✅ Verify proper escaping

### 6.3 XSS Prevention

**Test Case:** XSS in User Name
- [ ] Create user with name: `<script>alert('XSS')</script>`
- [ ] ✅ Verify script not executed
- [ ] ✅ Verify name displayed as text

**Test Case:** XSS in Survey Remarks
- [ ] Enter remarks: `<img src=x onerror=alert('XSS')>`
- [ ] ✅ Verify script not executed
- [ ] ✅ Verify proper HTML escaping

### 6.4 CSRF Protection

**Test Case:** CSRF Token Validation
- [ ] Make POST request without CSRF token
- [ ] ✅ Verify request rejected (if CSRF enabled)

### 6.5 Rate Limiting

**Test Case:** Login Rate Limiting
- [ ] Make 20 login attempts in 1 minute
- [ ] ✅ Verify rate limit error: "Too many requests"
- [ ] Wait 15 minutes
- [ ] ✅ Verify access restored

---

## 7. Performance Tests

### 7.1 Large Dataset Handling

**Test Case:** 1000+ Assets
- [ ] Create site with 1000 assets
- [ ] Open survey
- [ ] ✅ Verify list renders smoothly
- [ ] ✅ Verify scroll performance acceptable
- [ ] Search for specific asset
- [ ] ✅ Verify search fast (<1 second)

**Test Case:** 100+ Photos
- [ ] Create survey with 100 photos total
- [ ] ✅ Verify upload completes
- [ ] Export to Excel
- [ ] ✅ Verify Excel generation completes (<30 seconds)
- [ ] ✅ Verify file size reasonable (<20MB)

### 7.2 Network Performance

**Test Case:** Slow Network (Mobile)
- [ ] Throttle network to 3G speed
- [ ] Upload 10 photos
- [ ] ✅ Verify uploads complete (may take time)
- [ ] ✅ Verify progress indicator accurate
- [ ] ✅ Verify retry on failure

### 7.3 Concurrent Users

**Test Case:** 10 Simultaneous Users
- [ ] Have 10 users login simultaneously
- [ ] ✅ Verify all can create surveys
- [ ] ✅ Verify no data conflicts
- [ ] ✅ Verify database handles load

---

## 8. Edge Cases & Error Handling

### 8.1 Offline Scenarios

**Test Case:** Offline Submission
- [ ] Complete survey offline
- [ ] Try to submit
- [ ] ✅ Verify friendly error: "Cannot submit offline"
- [ ] Go online
- [ ] ✅ Verify sync completes
- [ ] ✅ Verify submission works

### 8.2 Data Validation

**Test Case:** Invalid GPS Coordinates
- [ ] Try to save GPS: lat=91, lng=181
- [ ] ✅ Verify validation error
- [ ] ✅ Verify inspection not saved

**Test Case:** Negative Quantities
- [ ] Enter quantity_installed: -5
- [ ] ✅ Verify validation prevents save

### 8.3 File Upload Limits

**Test Case:** Oversized Photo
- [ ] Try to upload 50MB photo
- [ ] ✅ Verify error: "File too large"
- [ ] ✅ Verify 10MB limit enforced

**Test Case:** Invalid File Type
- [ ] Try to upload .exe file
- [ ] ✅ Verify error: "Invalid file type"

---

## Test Results Template

```markdown
## Test Execution Report

**Date:** YYYY-MM-DD
**Tester:** Name
**Environment:** Production / Staging / Dev
**Platform:** Web / iOS / Android

### Summary
- Total Tests: XX
- Passed: XX ✅
- Failed: XX ❌
- Blocked: XX ⚠️

### Failed Tests
1. **Test Name:** Export Excel with 100 photos
   **Status:** ❌ Failed
   **Issue:** Excel generation times out after 60 seconds
   **Priority:** High
   **Assigned:** Developer Name

### Blocked Tests
1. **Test Name:** Microsoft SSO
   **Status:** ⚠️ Blocked
   **Issue:** Azure AD credentials not configured in staging
   **Priority:** Medium

### Notes
- All user management tests passed ✅
- Photo upload/export fully functional ✅
- Minor performance issue with large datasets
```

---

## Automated Testing Checklist

For CI/CD integration:

- [ ] Unit tests for all services
- [ ] Integration tests for API endpoints
- [ ] E2E tests for critical paths:
  - [ ] Login → Create Survey → Submit
  - [ ] Admin → Create User → User Login
  - [ ] Photo Upload → Export Excel
- [ ] Performance tests
- [ ] Security scans
- [ ] Database migration tests

---

## Production Readiness Checklist

Before deploying to production:

- [ ] All high-priority tests passed ✅
- [ ] No critical bugs in backlog
- [ ] Email service configured (or disabled)
- [ ] Database backups configured
- [ ] SSL certificates valid
- [ ] Environment variables set correctly
- [ ] Rate limiting configured
- [ ] Audit logging enabled
- [ ] Error monitoring configured (Sentry, etc.)
- [ ] Load testing completed
- [ ] Security audit completed
- [ ] User acceptance testing completed
- [ ] Documentation updated
- [ ] Training materials prepared
- [ ] Rollback plan documented

---

## Support & Troubleshooting

### Common Issues

**Issue:** "Failed to upload photo"
- **Check:** Network connection
- **Check:** File size < 10MB
- **Check:** Backend `/uploads` directory writable

**Issue:** "Excel export missing photos"
- **Check:** Photos directory path correct
- **Check:** File permissions on `uploads/` folder
- **Fix:** Restart backend after photo uploads

**Issue:** "Account locked"
- **Wait:** 15 minutes for auto-unlock
- **Admin:** Can reset via user management

**Issue:** "Sync not working"
- **Check:** Internet connection
- **Check:** Backend API accessible
- **Force:** Pull to refresh

---

## Contact

For issues or questions:
- **Developer:** [Your Name]
- **Email:** support@cit.com
- **Documentation:** See USER_MANUAL.md

---

**Last Updated:** 2025-01-29
**Version:** 1.0.0
