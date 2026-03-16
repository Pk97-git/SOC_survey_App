# CIT Operations Survey App — User Manual

**CIT Group Ltd / Gulaid Holding**
Version 1.0 | March 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Accessing the App](#2-accessing-the-app)
3. [Logging In](#3-logging-in)
4. [Roles & Permissions](#4-roles--permissions)
5. [Surveyor Guide](#5-surveyor-guide)
6. [Reviewer Guide](#6-reviewer-guide)
7. [Admin Guide](#7-admin-guide)
8. [Offline Mode](#8-offline-mode)
9. [Sync & Connectivity](#9-sync--connectivity)
10. [Exporting Reports](#10-exporting-reports)
11. [Profile & Account Settings](#11-profile--account-settings)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Overview

The CIT Operations Survey App is used to conduct facility inspections across sites managed by Gulaid Holding. Field surveyors assess the condition of physical assets, reviewers verify the findings, and administrators manage the overall workflow.

The app works on:
- **Web browser** (Chrome, Edge) — sidebar navigation
- **iOS / Android mobile** — bottom tab navigation
- **Offline** — inspections can be recorded without internet and synced later

---

## 2. Accessing the App

| Platform | How to access |
|---|---|
| Web | Open the app URL in your browser |
| iOS | Open the app from your home screen |
| Android | Open the app from your app drawer |

> If you do not have an account, contact your Administrator. You cannot self-register.

---

## 3. Logging In

### Email & Password Login

1. Open the app — you will see the **Login** screen.
2. Enter your **email address** and **password**.
3. Tap / click **Sign In**.

### Microsoft SSO Login

If your organisation uses Microsoft accounts:

1. Tap **Sign in with Microsoft**.
2. You will be redirected to the Microsoft login page.
3. Enter your Microsoft credentials.
4. You will be returned to the app automatically.

> Your Microsoft email must already be registered in the system by an Admin.

### Forgot Password

1. Tap **Forgot Password** on the login screen.
2. Enter your registered email address.
3. Check your inbox for a reset link (valid for 1 hour).
4. Click the link and enter a new password.

### Account Lockout

After **5 incorrect password attempts**, your account will be locked for **15 minutes**. Wait and try again, or contact your Administrator.

### Password Requirements

Passwords must:
- Be at least **8 characters** long
- Contain at least one **uppercase letter**
- Contain at least one **lowercase letter**
- Contain at least one **number**

---

## 4. Roles & Permissions

| Feature | Surveyor | Reviewer | Admin |
|---|:---:|:---:|:---:|
| View sites | Yes | Yes | Yes |
| Start / conduct surveys | Yes | No | Yes |
| Submit surveys | Yes | No | Yes |
| Review surveys | No | Yes | Yes |
| Manage sites | No | No | Yes |
| Import assets | No | No | Yes |
| Manage users | No | No | Yes |
| View analytics | No | No | Yes |
| Export reports | No | Yes | Yes |

---

## 5. Surveyor Guide

Surveyors conduct on-site asset inspections and submit findings.

### 5.1 Navigation

On **mobile**: use the bottom tabs — **Home**, **Surveys**, **Profile**.
On **web**: use the left sidebar.

---

### 5.2 Selecting a Site

1. Open the **Home** tab.
2. You will see a list of all available sites.
3. Tap a **site name** to expand it and see its surveys grouped by location.
4. Use the **search bar** at the top to filter sites by name.

---

### 5.3 Starting a Survey

1. From the **Surveys** tab, tap the **+** button (or **New Survey**).
2. Select a **Site** from the dropdown.
3. Select the **Trade** (e.g. Mechanical, Electrical, HVAC, Plumbing, Civil, FLS).
4. Optionally select a **Location** (building/area) to narrow the asset list.
5. Tap **Start Survey**.

> A survey will be created and you will be taken directly to the inspection screen.

---

### 5.4 Inspecting Assets

The inspection screen lists all assets for the selected site, trade, and location.

**For each asset, you can record:**

| Field | Description |
|---|---|
| **Condition Rating** | A (New) → B (Excellent) → C (Good) → D (Average) → E (Poor) → F (Very Poor) → G (TBD) |
| **Overall Condition** | Satisfactory / Unsatisfactory / Satisfactory with Comment |
| **Quantity Installed** | Number of units installed |
| **Quantity Working** | Number of units in working condition |
| **Remarks** | Free-text notes about the asset |
| **GPS Location** | Tap the GPS icon to capture coordinates automatically |
| **Photos** | Tap the camera icon to take or upload a photo |

**To inspect an asset:**
1. Find the asset in the list — use the **search bar** to filter by name or reference code.
2. Tap the asset card to expand it.
3. Fill in the condition fields.
4. Tap **Save** on the card to save that individual inspection.

**Progress bar** at the top shows how many assets have been inspected out of the total.

**QR Code scanning:**
Tap the QR icon in the top bar to scan an asset's QR code and jump directly to that asset's card.

---

### 5.5 Submitting a Survey

Once all inspections are complete:

1. Tap the **Submit** button at the bottom of the inspection screen.
2. Confirm the submission in the dialog.
3. The survey status changes to **Submitted** and is sent for review.

> Once submitted, you **cannot edit** the inspections unless an Admin unlocks the survey.

---

### 5.6 Viewing Your Surveys

1. Go to the **Surveys** tab.
2. You will see all surveys with their current status:

| Status | Meaning |
|---|---|
| Draft | Created but inspection not started |
| In Progress | Inspections being recorded |
| Submitted | Sent for review |
| Under Review | Reviewer is reviewing |
| Completed | Approved and closed |

3. Tap any survey to open it and view or continue the inspection.

---

### 5.7 Exporting a Survey to Excel

1. From the Surveys tab, tap a survey to open it.
2. Tap the **Export** button (spreadsheet icon).
3. The Excel file will be generated and shared to your device / browser download.

---

## 6. Reviewer Guide

Reviewers inspect submitted survey findings and add verification comments.

### 6.1 Navigation

On **mobile**: use the bottom tabs — **Surveys**, **Profile**.
On **web**: use the left sidebar.

---

### 6.2 Viewing Surveys for Review

1. Open the **Surveys** tab — you will see all surveys with status **Submitted** or **Under Review**.
2. Use the status filter chips at the top to filter by status.
3. Tap a survey to open it.

---

### 6.3 Reviewing a Survey

When you open a survey for review you will see each asset inspection listed.

**For each inspection, you can add:**

| Field | Description |
|---|---|
| **Comments** | Your verification notes or observations |
| **Photos** | Attach photos from your device to support the review |

**To add a review:**
1. Scroll through the inspection list.
2. Tap an inspection card to expand it.
3. Type your comments in the **Comments** field.
4. Optionally tap **Add Photo** to attach supporting photos.
5. Tap **Save Review** at the bottom to save all comments.

---

### 6.4 Completing a Review

Once you have reviewed all inspections:

1. Tap **Submit Review** at the bottom of the screen.
2. Confirm in the dialog.
3. The survey status updates to **Completed** (or moves to the next review stage).

> You can save your review in progress and return to it later without submitting.

---

### 6.5 Exporting a Reviewed Survey

1. Open the survey.
2. Tap **Export to Excel**.
3. The exported file will include both surveyor findings and your reviewer comments.

---

## 7. Admin Guide

Admins have full access to all features across the app.

### 7.1 Navigation

On **mobile**: bottom tabs — **Dashboard**, **Sites**, **Assets**, **Surveys**, **Profile**.
On **web**: left sidebar with the same sections.

---

### 7.2 Dashboard

The Dashboard shows a real-time summary:

| Stat | Description |
|---|---|
| Total Surveys | All surveys across all sites |
| Pending Reviews | Surveys submitted but not yet reviewed |
| Active Surveyors | Number of surveyors with active surveys |
| Completed Today | Surveys marked complete today |

Tap **Active Surveyors** to see a list of which surveyors are currently active.

---

### 7.3 Managing Sites

1. Go to the **Sites** tab.
2. Tap **+ Add Site** to create a new site — enter the name, location, and client.
3. Tap an existing site to **edit** its details.
4. Tap the **delete** icon to remove a site.

> Deleting a site will delete all surveys and assets linked to it. This cannot be undone.

---

### 7.4 Managing Assets

Assets are the physical items being inspected (equipment, systems, fixtures).

#### Importing Assets from Excel

The fastest way to set up assets for a new site:

1. Go to the **Assets** tab.
2. Tap **Import Excel**.
3. Select the site.
4. Choose your Excel file — it must have sheets named: `MECHANICAL`, `FLS`, `ELECTRICAL`, `CIVIL`, `PLUMBING`, or `HVAC`.
5. Tap **Import**. The system will process the file and create all asset records.

**Required columns in the Excel sheet:**

| Column | Description |
|---|---|
| `ref_code` | Unique reference code for the asset |
| `name` | Asset name / description |
| `service_line` | Trade / service category |
| `building` | Building name |
| `location` | Area or room |
| `zone` | Zone or section (optional) |
| `asset_tag` | Physical tag number (optional) |
| `description` | Detailed description (optional) |

#### Adding a Single Asset

1. Go to **Assets** tab → tap **+ Add Asset**.
2. Fill in the asset details.
3. Tap **Save**.

#### Editing / Deleting an Asset

1. Find the asset in the list (use search or filter by site).
2. Tap the asset to open it.
3. Edit fields and tap **Save**, or tap **Delete** to remove it.

---

### 7.5 Managing Users

1. Go to **Dashboard** → tap **Manage Users**.
2. You will see all registered users.

#### Creating a New User

1. Tap **+ Add User**.
2. Enter:
   - Full name
   - Email address
   - Password (must meet strength requirements)
   - Role: **Surveyor**, **Reviewer**, or **Admin**
3. Tap **Create User**.
   > The user can log in immediately with the credentials you set.

#### Editing a User

1. Tap the user's name.
2. Update their role, name, or status.
3. Tap **Save**.

#### Deactivating a User

1. Tap the user.
2. Toggle **Active** to off.
3. The user will be immediately blocked from logging in — all existing sessions are invalidated.

#### Resetting a User's Password

Users can reset their own password via **Forgot Password**. Admins do not see user passwords.

---

### 7.6 Managing Surveys (Admin)

Admins can see and manage all surveys across all sites.

1. Go to the **Surveys** tab.
2. Use the status filter and search bar to find surveys.
3. Tap a survey to:
   - View full inspection details
   - Export to Excel
   - Delete the survey

#### Deleting All Surveys for a Site

From the **Sites** tab:
1. Tap the site.
2. Tap **Delete All Surveys**.
3. Confirm. This removes all surveys and inspections for that site.

---

### 7.7 Analytics

1. Go to **Dashboard** → tap **Analytics**.
2. View charts and breakdowns of survey activity, condition ratings across sites, and surveyor performance.

---

### 7.8 Exporting All Surveys as a ZIP

To download all surveys for a site in one go:

1. Go to **Surveys** tab.
2. Select a site.
3. Tap **Export All (ZIP)**.
4. A ZIP file is generated — each location/trade combination is a separate Excel file organised in folders.

---

## 8. Offline Mode

The app is designed to work without internet on **iOS and Android**.

### Going Offline — Preparation

Before going to a site where connectivity may be poor:

1. Connect to Wi-Fi or mobile data.
2. Go to the **Home** tab and select the site.
3. Tap **Download for Offline Use** (cloud/download icon next to the site name).
4. Wait for the download to complete — this saves all surveys, assets, and inspections for that site to your device.

### Working Offline

Once downloaded, you can:
- Open the app with no internet.
- Start new surveys.
- Record all inspections — condition ratings, remarks, photos, GPS.
- Submit surveys (they will be queued until you reconnect).

> Photos taken offline are stored on your device until sync.

### What is NOT available offline

- Creating new sites or assets
- Viewing other surveyors' data
- The Admin dashboard

---

## 9. Sync & Connectivity

### Automatic Sync

When the app detects internet connectivity, it automatically:
1. Uploads any pending surveys and inspections.
2. Uploads any queued photos.
3. Downloads updated site and survey data from the server.

### Sync Status Indicator

A sync status indicator appears at the top of the screen:

| Status | Meaning |
|---|---|
| **Syncing...** | Upload/download in progress |
| **Sync Complete** | All data is up to date |
| **Offline** | No internet — working locally |
| **Sync Failed** | Some items could not be uploaded — will retry |
| **X items pending** | Partial sync — some items still queued |

### Manual Sync

To trigger a sync manually:
1. Go to the **Profile** tab.
2. Tap **Sync Now**.

### If Sync Fails Repeatedly

If items remain pending after multiple sync attempts, they may be logged as permanently failed. Contact your Administrator who can check the sync log.

---

## 10. Exporting Reports

### Single Survey Export (Excel)

1. Open any survey from the **Surveys** tab.
2. Tap the **Export** button.
3. The Excel file includes:
   - Site and trade header information
   - All asset reference codes, descriptions, locations
   - Condition ratings (colour-coded A–G)
   - Overall condition
   - Quantity installed / working
   - Surveyor photos
   - Remarks
   - MAG, CIT, and DGDA reviewer comments and photos

### All Surveys Export (ZIP) — Admin only

1. Go to **Surveys** → select site → **Export All (ZIP)**.
2. The ZIP contains one Excel file per location/trade, organised in folders by location name.

### Sharing Reports

After export:
- On **web**: the file downloads to your browser's downloads folder.
- On **mobile**: a share sheet appears — you can save to Files, send via email, or share to other apps.

---

## 11. Profile & Account Settings

Go to the **Profile** tab to:

### Change Your Password

1. Tap **Change Password**.
2. Enter your current password.
3. Enter and confirm your new password (must meet strength requirements).
4. Tap **Save**.

### View Account Details

Your profile shows:
- Full name
- Email address
- Role
- Last login date

### Sync Now

Tap **Sync Now** to manually trigger a data sync.

### Log Out

Tap **Log Out** at the bottom of the profile screen. You will be returned to the login screen.

> On mobile, any unsynced data is preserved locally after logout. It will be uploaded when you log back in.

---

## 12. Troubleshooting

### I cannot log in

| Problem | Solution |
|---|---|
| "Invalid credentials" | Check your email and password. They are case-sensitive. |
| "Account is deactivated" | Contact your Administrator. |
| "Account locked" | Wait 15 minutes and try again, or contact your Administrator. |
| "User not found" | Your email may not be registered. Contact your Administrator. |
| Microsoft SSO fails | Ensure your Microsoft email matches the one registered in the system. |

---

### The app shows "Offline" but I have internet

1. Close and reopen the app.
2. Check that mobile data or Wi-Fi is working by opening a browser.
3. Go to **Profile** → tap **Sync Now**.
4. If still failing, the server may be temporarily unavailable — try again in a few minutes.

---

### My inspection data was not uploaded

1. Go to **Profile** and check the sync status.
2. Tap **Sync Now**.
3. If items still show as pending, ensure you are connected to the internet.
4. If the problem persists after multiple attempts, contact your Administrator — they can see the sync log and recover failed items.

---

### I submitted a survey by mistake

Contact your Administrator. Admins can manage submitted surveys.

---

### Photos are not appearing in the export

- Ensure the photos were taken while connected, or that the device had enough storage.
- Go to **Profile** → **Sync Now** to upload any pending photos.
- If photos were taken offline, they must be synced before export.

---

### I cannot find a site or asset

- Ensure you have synced recently — pull down on the list or go to **Profile** → **Sync Now**.
- For assets: the asset may not yet be imported for that site. Contact your Administrator.
- For sites: only Admins can create sites.

---

### The app crashed or froze

1. Close the app completely.
2. Reopen it — your data is saved locally.
3. Go to **Profile** → **Sync Now** to ensure data is backed up to the server.
4. If it crashes repeatedly on a specific screen, note the screen name and report it to your IT contact.

---

## Contact & Support

For access issues, user management, or technical problems, contact your system Administrator.

---

*CIT Group Ltd | Gulaid Holding | CIT Operations Survey App v1.0*
