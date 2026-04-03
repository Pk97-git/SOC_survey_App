# CIT Facility Survey App - Workflow & User Guide
**Complete Guide for Surveyors, Admins, and Reviewers**

**Last Updated:** March 29, 2026
**App Version:** 1.0.0

---

## 📋 Table of Contents

1. [Survey Status Workflow](#survey-status-workflow)
2. [Lock Mode Explained](#lock-mode-explained)
3. [How to Use - For Surveyors](#how-to-use---for-surveyors)
4. [How to Use - For Admins](#how-to-use---for-admins)
5. [How to Use - For Reviewers](#how-to-use---for-reviewers)
6. [FAQ](#faq)

---

## 📊 Survey Status Workflow

### Survey Status Lifecycle

```
┌─────────────┐
│   DRAFT     │  Created by Admin, not yet started
└──────┬──────┘
       │ Surveyor clicks "Inspect"
       ↓
┌─────────────┐
│ IN_PROGRESS │  ← Save & Exit does NOT change status
└──────┬──────┘    Surveyor can resume anytime
       │ Surveyor clicks "Submit Survey"
       ↓
┌─────────────┐
│  SUBMITTED  │  ← SURVEY LOCKED for Surveyor
└──────┬──────┘    Only Admin can edit
       │ Reviewer adds review comments
       ↓
┌─────────────┐
│UNDER_REVIEW │  Reviewer is working on it
└──────┬──────┘
       │ Reviewer approves
       ↓
┌─────────────┐
│  COMPLETED  │  ← SURVEY LOCKED for everyone except Admin
└─────────────┘    Final state
```

---

### Status Details

| Status | Description | Who Can Edit | Actions Available |
|--------|-------------|--------------|-------------------|
| **draft** | Survey created but not started | Admin | Delete, Start |
| **in_progress** | Surveyor is working on it | Surveyor, Admin | Inspect, Save, Submit |
| **submitted** | Surveyor submitted for review | **Admin only** | Review, Edit, Approve |
| **under_review** | Reviewer is working on it | Reviewer, Admin | Add comments, Approve |
| **completed** | Finalized and approved | **Admin only** | View, Export |

---

### Critical Question: **Does "Save & Exit" Change Status?**

**Answer: NO ❌**

**Save & Exit Behavior:**
- Saves all your progress locally
- **Does NOT change survey status**
- Survey remains in `in_progress` status
- You can resume anytime from Home screen
- No Excel report generated
- No submission to reviewers

**Example:**
```
1. Start survey → Status = in_progress
2. Inspect 5 assets
3. Click "Save & Exit"
4. Status = in_progress (unchanged)
5. Come back tomorrow
6. Click "Inspect" to resume
7. Status = in_progress (still unchanged)
8. Complete remaining assets
9. Click "Submit Survey"
10. Status = submitted (CHANGED!)
```

---

### When Does Status Change?

| Action | Old Status | New Status | Trigger |
|--------|------------|------------|---------|
| **Start Survey** | draft | in_progress | Surveyor clicks "Inspect" |
| **Submit Survey** | in_progress | submitted | Surveyor clicks "Submit Survey" |
| **Start Review** | submitted | under_review | Reviewer opens survey |
| **Approve Survey** | under_review | completed | Reviewer clicks "Approve" |
| **Admin Edit** | submitted/completed | in_progress | Admin clicks "Edit" |

**Code Reference:**
[AssetInspectionScreen.tsx:300](FacilitySurveyApp/src/screens/AssetInspectionScreen.tsx#L300)
```typescript
// Line 300: Only Submit changes status
await hybridStorage.updateSurvey(surveyId, { status: 'submitted' });
```

[AssetInspectionScreen.tsx:218-232](FacilitySurveyApp/src/screens/AssetInspectionScreen.tsx#L218-L232)
```typescript
// Line 218-232: Save & Exit does NOT change status
const handleSaveAndExit = async () => {
    // NO status update here - just navigation
    navigation.goBack();
};
```

---

## 🔒 Lock Mode Explained

### What is Lock Mode?

**Lock Mode** prevents surveyors from editing a survey after submission. Only admins can override this lock.

### When Does a Survey Lock?

**✅ Locked When:**
- Survey status = `submitted` **AND** user role = `surveyor`
- Survey status = `completed` **AND** user role = `surveyor` or `reviewer`

**❌ NOT Locked When:**
- Survey status = `in_progress` (anyone can edit)
- User role = `admin` (admins can always edit)

**Code Reference:**
[HomeScreen.tsx:229-231](FacilitySurveyApp/src/screens/HomeScreen.tsx#L229-L231)
```typescript
const isCompleted = survey.status === 'completed' || survey.status === 'submitted';
const isAdmin = user?.role === 'admin';
const isLocked = isCompleted && !isAdmin;
```

---

### Lock Mode Matrix

| Survey Status | Surveyor | Reviewer | Admin |
|---------------|----------|----------|-------|
| **draft** | ❌ Cannot see | ❌ Cannot see | ✅ Can edit |
| **in_progress** | ✅ Can edit | ❌ Cannot see | ✅ Can edit |
| **submitted** | 🔒 **LOCKED** | ✅ Can review | ✅ Can edit |
| **under_review** | 🔒 **LOCKED** | ✅ Can edit | ✅ Can edit |
| **completed** | 🔒 **LOCKED** | 🔒 **LOCKED** | ✅ Can edit |

---

### Visual Indicators

**Home Screen - Locked Survey:**
```
┌──────────────────────────────┐
│ HVAC Survey                  │
│ ✓ Completed                  │ ← Green chip
│                   [Locked]   │ ← Disabled gray button
└──────────────────────────────┘
```

**Home Screen - Unlocked Survey (Admin):**
```
┌──────────────────────────────┐
│ HVAC Survey                  │
│ ✓ Completed                  │ ← Green chip
│                   [Edit]     │ ← Enabled button (Admin override)
└──────────────────────────────┘
```

---

## 👷 How to Use - For Surveyors

### Your Role
Conduct on-site facility inspections, capture photos, and document asset conditions.

---

### 1. Starting a Survey

**Step 1: Select Site**
1. Open app → Home screen shows "All Sites"
2. Tap on a site (e.g., "Aden Airport Terminal 1")

**Step 2: Select Survey**
1. See list of surveys organized by location
2. Tap ▼ to expand location (e.g., "Main Terminal Building")
3. See surveys by service line (HVAC, Electrical, etc.)
4. Tap **"Inspect"** button

**Visual:**
```
┌────────────────────────────────────┐
│ Main Terminal Building        ▼   │
├────────────────────────────────────┤
│ HVAC                               │
│ ⏱ Pending                          │
│                         [Inspect]  │ ← Tap here
├────────────────────────────────────┤
│ Electrical                         │
│ ⏱ Pending                          │
│                         [Inspect]  │
└────────────────────────────────────┘
```

---

### 2. Inspecting Assets

**Survey Screen Layout:**
```
┌────────────────────────────────────┐
│ ← CIT OPS Survey                   │ Header
│ HVAC - Main Terminal Building      │
│ Progress: 3/10 assets              │
├────────────────────────────────────┤
│ [Search assets...]                 │ Search bar
├────────────────────────────────────┤
│ ┌────────────────────────────────┐ │
│ │ Air Handling Unit #1           │ │ Asset Card
│ │ Ref: AHU-001                   │ │
│ │ Floor: 2 | HVAC                │ │
│ ├────────────────────────────────┤ │
│ │ Condition Rating *             │ │
│ │ [A] [B] [C] [D] [E] [F] [G]    │ │ ← Tap one
│ ├────────────────────────────────┤ │
│ │ Overall Condition *            │ │
│ │ [Satisfactory] [Unsatisfactory]│ │ ← Tap one
│ ├────────────────────────────────┤ │
│ │ Qty Installed: [10]            │ │
│ │ Qty Working:   [8]             │ │
│ ├────────────────────────────────┤ │
│ │ Photos                         │ │
│ │ [+] [Photo1] [Photo2]          │ │ ← Tap to add
│ ├────────────────────────────────┤ │
│ │ Remarks                        │ │
│ │ [Text area]                    │ │
│ └────────────────────────────────┘ │
│                                    │
│                        [+ Add      │ ← Floating button
│                          Asset]    │
└────────────────────────────────────┘
```

---

### 3. Filling Out Inspection Data

#### Required Fields (marked with *)

1. **Condition Rating** ⭐ REQUIRED
   - A = New
   - B = Excellent
   - C = Good
   - D = Average
   - E = Poor
   - F = Very Poor
   - G = To Be Determined

2. **Overall Condition** ⭐ REQUIRED
   - Satisfactory
   - Unsatisfactory
   - Satisfactory with Comment

3. **Remarks** ⭐ REQUIRED if:
   - Overall Condition = "Unsatisfactory"
   - Overall Condition = "Satisfactory with Comment"

#### Optional Fields

4. **Quantities**
   - Qty Installed (e.g., 10 units)
   - Qty Working (e.g., 8 units)
   - ⚠️ **Validation:** Working ≤ Installed

5. **Photos**
   - Take photo or choose from gallery
   - Tap photo to view full-screen
   - Pinch to zoom
   - Swipe to navigate
   - Delete from lightbox

6. **MAG Comments & Photos**
   - For MAG reviewer notes
   - Optional photos

7. **CIT Verification**
   - For CIT reviewer comments

8. **DGDA Comments**
   - For DGDA reviewer notes

9. **GPS Coordinates**
   - Tap "Capture GPS" to record location
   - Useful for outdoor assets

---

### 4. Inline Validation

**Real-time Feedback:**

✅ **Valid Input:**
```
Qty Working
┌────────────┐
│     8      │ ← Normal border
└────────────┘
```

❌ **Invalid Input:**
```
Qty Working
┌────────────┐
│     15     │ ← RED border
└────────────┘
⚠️ Cannot exceed installed qty (10)
```

**Required Field Missing:**
```
Remarks *  ← Red asterisk appears
┌──────────────────┐
│                  │ ← RED border when you try to submit
└──────────────────┘
⚠️ Remarks required for this condition
```

---

### 5. Adding Assets Manually

**When to Use:**
- Found an asset not in the pre-loaded list
- Discovered a deficiency or issue

**Steps:**
1. Tap **"+ Add Asset"** floating button
2. Choose option:
   - **Scan QR Code:** Use camera to scan asset tag
   - **Enter Manually:** Type asset details
3. Fill in asset information:
   - Asset Name
   - Reference Code
   - Service Line
   - Floor / Location
4. Tap **"Add"**
5. New asset card appears in list

---

### 6. Using Photo Lightbox

**Take/Upload Photo:**
1. Tap **"+ Add Photo"** in Photos section
2. Choose:
   - Take Photo (camera)
   - Choose from Gallery
3. Photo appears as 120x120px thumbnail

**View Full-Screen:**
1. Tap photo thumbnail
2. 🔍 Zoom indicator shows it's tappable
3. Full-screen viewer opens
4. **Pinch to zoom** 2x-10x
5. **Swipe left/right** to navigate
6. Tap **"X"** or swipe down to close

**Delete Photo:**
1. From thumbnail: Tap ❌ button → Confirm
2. From lightbox: Tap **"Delete"** button → Confirm

**Photo Counter:**
```
Photo 2 of 5       [Delete] ✕
```

---

### 7. Saving Progress

**Auto-Save:**
- Your progress saves automatically every time you:
  - Select a condition rating
  - Change quantities
  - Add photos
  - Type remarks

**Manual Save & Exit:**
1. Tap **"Save & Exit"** in header
2. Confirm "Your progress has been auto-saved"
3. Tap **"Exit"**
4. ✅ Status remains **`in_progress`**
5. Resume anytime from Home screen

⚠️ **Important:** Save & Exit does NOT submit the survey!

---

### 8. Submitting Survey

**Pre-Submission Checklist:**
- All required fields completed (Condition Rating, Overall Condition)
- Remarks added for "Unsatisfactory" conditions
- Photos captured for defects
- Quantities validated

**Steps:**
1. Scroll to top of screen
2. Tap **"Submit Survey"** button (green)
3. Review summary:
   ```
   Survey Summary:
   • 10 assets inspected
   • 15 photos captured
   • All required fields completed

   Generate Excel report and submit?
   ```
4. Tap **"Submit"**

**What Happens:**
1. Survey status changes to **`submitted`**
2. Excel report generates automatically
3. Data syncs to server (if online)
4. Survey **LOCKS** - you can no longer edit
5. Success message appears
6. You return to Home screen

**Offline Submission:**
- Excel saves locally
- Data queued for sync when online
- Green sync indicator shows pending uploads

---

### 9. Common Tasks

#### Resume In-Progress Survey
1. Home screen → Tap site
2. Find survey with "⏱ Pending" chip
3. Tap **"Inspect"** button
4. Continue where you left off

#### Search for Asset
1. In survey screen, tap search bar
2. Type asset name or ref code
3. Filtered list appears
4. Tap asset to scroll to it

#### Capture GPS for Outdoor Assets
1. Scroll to bottom of asset card
2. Tap **"Capture GPS"** button
3. Allow location permission (if first time)
4. GPS coordinates populate automatically
5. Tap **"Update GPS"** to recapture

---

## 👨‍💼 How to Use - For Admins

### Your Role
Manage sites, users, assets, and survey generation. Review and approve completed surveys.

---

### 1. Dashboard Overview

**Admin Dashboard Shows:**
```
┌────────────────────────────────────┐
│ Admin Dashboard                    │
├────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│ │   42    │ │   28    │ │   15    ││
│ │ Surveys │ │ Active  │ │ Pending ││
│ │  Total  │ │ Users   │ │ Reviews ││
│ └─────────┘ └─────────┘ └─────────┘│
├────────────────────────────────────┤
│ Quick Actions                      │
│ [Create Survey] [Manage Users]     │
│ [Import Assets] [Generate Reports] │
├────────────────────────────────────┤
│ Recent Activity                    │
│ • John submitted HVAC survey       │
│ • Sarah approved Electrical survey │
└────────────────────────────────────┘
```

---

### 2. Managing Sites

**View Sites:**
1. Tap **"Sites"** tab
2. See list of all sites
3. Tap site to view details

**Add New Site:**
1. Tap **"+ Add Site"** floating button
2. Fill in details:
   - Site Name
   - Location
   - Description
3. Tap **"Save"**

**Edit/Delete Site:**
1. Tap site card
2. Tap **⋮** menu icon
3. Choose:
   - **Edit:** Modify details
   - **Delete:** Remove site (warns if surveys exist)

---

### 3. Managing Users

**View Users:**
1. Tap **"Users"** tab
2. See list with roles:
   - 🔵 Admin
   - 🟢 Surveyor
   - 🟡 Reviewer

**Add New User:**
1. Tap **"+ Add User"** floating button
2. Fill in:
   - Full Name
   - Email
   - Role (Admin/Surveyor/Reviewer)
   - Temporary Password (optional)
3. Tap **"Create User"**
4. User receives welcome email

**Edit User:**
1. Tap user card
2. Modify:
   - Full Name
   - Email
   - Role
   - Active/Inactive status
3. Tap **"Save"**

**Reset Password:**
1. Tap user card → Tap **"Reset Password"**
2. Choose:
   - Generate temporary password
   - Send reset email
3. User receives instructions

**Deactivate User:**
1. Tap user card
2. Toggle **"Active"** switch to OFF
3. User cannot login but data preserved

---

### 4. Managing Assets

**Import Assets from Excel:**
1. Tap **"Assets"** tab → **"Import"**
2. Choose Excel file with columns:
   - Site Name
   - Building/Location
   - Service Line (HVAC, Electrical, etc.)
   - Asset Name
   - Reference Code
   - Floor
   - Area
3. Tap **"Upload"**
4. Review preview
5. Tap **"Confirm Import"**
6. Success: "152 assets imported"

**Add Single Asset:**
1. Tap **"+ Add Asset"** button
2. Fill in:
   - Site
   - Building/Location
   - Service Line
   - Asset Name
   - Reference Code
   - Floor, Area
3. Tap **"Save"**

**Edit/Delete Asset:**
1. Search or browse to asset
2. Tap asset card
3. Tap **⋮** menu → Edit or Delete

---

### 5. Creating Surveys

**Generate Surveys:**
1. Tap **"Survey Management"** tab
2. Select site from dropdown
3. Tap **"Generate Workbooks"** button
4. System creates surveys automatically:
   - One survey per location + service line combination
   - Assets auto-assigned based on building and trade
   - Status = `draft`

**Example:**
```
Site: Aden Airport Terminal 1
Locations: Main Terminal, Cargo Area
Service Lines: HVAC, Electrical, Plumbing

Generated Surveys:
├─ Main Terminal - HVAC (25 assets)
├─ Main Terminal - Electrical (18 assets)
├─ Main Terminal - Plumbing (12 assets)
├─ Cargo Area - HVAC (8 assets)
├─ Cargo Area - Electrical (10 assets)
└─ Cargo Area - Plumbing (5 assets)
```

**Manual Survey Creation:**
1. Tap **"Start Survey"** tab
2. Fill in:
   - Site
   - Location/Building
   - Trade/Service Line
3. Choose:
   - **Load Pre-defined Assets:** Use imported assets
   - **Start Empty:** Surveyor adds assets manually
4. Tap **"Create Survey"**

---

### 6. Reviewing Submitted Surveys

**Find Submitted Surveys:**
1. Dashboard → "15 Pending Reviews" card
2. OR Reports tab → Filter by "Submitted"
3. Tap survey to review

**Review Process:**
1. View survey details:
   - Surveyor name
   - Date submitted
   - Completion percentage
   - Number of photos
2. Review each asset inspection:
   - Condition ratings
   - Photos (tap to view full-screen)
   - Remarks
3. Add admin comments if needed
4. Choose action:
   - **Approve:** Changes status to `completed`
   - **Request Changes:** Unlock for surveyor
   - **Reject:** Add rejection reason

---

### 7. Editing Locked Surveys

**Admin Override:**
- Admins can edit ANY survey, even `submitted` or `completed`
- Useful for:
  - Fixing surveyor mistakes
  - Adding missing information
  - Updating after external review

**Steps:**
1. Home screen → Find locked survey
2. Tap **"Edit"** button (only admins see this)
3. Make changes
4. Choose:
   - **Save & Exit:** Keep current status
   - **Submit:** Change status to `submitted`

---

### 8. Generating Reports

**Export Single Survey:**
1. Reports tab → Find survey
2. Tap **"Export Excel"** button
3. Choose location to save
4. Excel file downloads with:
   - Asset inspections
   - Embedded photos
   - Review comments
   - GPS coordinates

**Export All Surveys (ZIP):**
1. Survey Management → Select site
2. Tap **"Export All as ZIP"** button
3. All surveys for site bundled into ZIP
4. Download and extract

**Report Contents:**
- Cover sheet with survey metadata
- One sheet per service line
- Photos embedded in cells
- Conditional formatting for ratings
- Review comments in separate columns

---

### 9. Monitoring Sync Status

**Check Sync Dashboard:**
1. Profile tab → **"Sync Data"** button
2. See:
   - Last sync time
   - Pending uploads (photos, surveys)
   - Failed uploads
3. Tap **"Sync Now"** to force sync

**Troubleshooting Sync Issues:**
- Green indicator: All synced ✅
- Yellow indicator: Sync in progress ⏳
- Red indicator: Sync failed ❌

**Manual Intervention:**
1. Check network connection
2. Tap **"Retry Failed Uploads"**
3. If persists, contact support

---

## 👁️ How to Use - For Reviewers

### Your Role
Review submitted surveys, add comments, request changes, and approve final reports.

---

### 1. Reviewer Dashboard

**Dashboard Shows:**
```
┌────────────────────────────────────┐
│ Reviewer Dashboard                 │
├────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│ │   15    │ │   8     │ │   42    ││
│ │ Pending │ │ Active  │ │Completed││
│ │ Reviews │ │ Reviews │ │  Total  ││
│ └─────────┘ └─────────┘ └─────────┘│
├────────────────────────────────────┤
│ Assigned Surveys                   │
│ ┌────────────────────────────────┐ │
│ │ HVAC - Terminal 1              │ │
│ │ Submitted by: John Doe         │ │
│ │ Date: Mar 28, 2026             │ │
│ │                     [Review]   │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

---

### 2. Reviewing Surveys

**Open Survey for Review:**
1. Dashboard → Tap **"Review"** button
2. OR Reports tab → Filter "Submitted" → Tap survey
3. Survey status changes to `under_review`

**Review Screen Layout:**
```
┌────────────────────────────────────┐
│ ← Review Survey                    │
│ HVAC - Main Terminal Building      │
│ Submitted by: John Doe             │
│ Date: Mar 28, 2026                 │
├────────────────────────────────────┤
│ Summary                            │
│ • 10/10 assets inspected (100%)    │
│ • 15 photos captured               │
│ • Avg Condition: C (Good)          │
├────────────────────────────────────┤
│ Asset Inspections                  │
│ [Filter by condition] [Sort by]    │
├────────────────────────────────────┤
│ ┌────────────────────────────────┐ │
│ │ Air Handling Unit #1           │ │
│ │ Rating: C (Good)               │ │
│ │ Condition: Satisfactory        │ │
│ │ Photos: [📷][📷][📷]           │ │
│ │ Remarks: "Minor rust on cover" │ │
│ ├────────────────────────────────┤ │
│ │ MAG Comments:                  │ │
│ │ [Add your comments...]         │ │
│ │ MAG Photos: [+]                │ │
│ └────────────────────────────────┘ │
│ [Approve] [Request Changes]        │
└────────────────────────────────────┘
```

---

### 3. Adding Review Comments

**MAG Reviewer Comments:**
1. Scroll to "MAG Comments" section in asset card
2. Tap text area
3. Type your feedback:
   - Observations
   - Recommendations
   - Additional notes
4. Tap **"+ Add Photo"** to attach images (optional)
5. Changes auto-save

**CIT Verification Comments:**
1. Scroll to "CIT Verification / Comments"
2. Add verification notes
3. Auto-saves

**DGDA Comments:**
1. Scroll to "DGDA Comments"
2. Add regulatory compliance notes
3. Auto-saves

**Example Comments:**
```
MAG Comments:
"Confirmed poor condition. Recommend replacement
within 6 months. Rust damage visible on housing."

MAG Photos: [Photo showing rust damage]
```

---

### 4. Viewing Photos in Detail

**Tap Photo → Lightbox Opens:**
1. Full-screen view with zoom
2. Swipe to view all photos for that asset
3. **Photo counter:** "Photo 2 of 5"
4. Pinch to zoom 2x-10x to inspect defects
5. Tap **"X"** to close

**Useful for:**
- Verifying surveyor claims
- Documenting defects
- Quality control

---

### 5. Filtering & Sorting

**Filter by Condition:**
1. Tap filter dropdown
2. Choose:
   - All Assets
   - A-B (Excellent)
   - C-D (Good-Average)
   - E-F (Poor-Very Poor)
   - Unsatisfactory
   - Has Photos
3. List updates instantly

**Sort Options:**
- Alphabetical
- Condition (worst first)
- Floor/Location
- Date added

---

### 6. Approving Survey

**When to Approve:**
- All required fields completed
- Photos adequate for documentation
- No major discrepancies found
- Review comments added

**Steps:**
1. Scroll to bottom of review screen
2. Tap **"Approve Survey"** button (green)
3. Confirm:
   ```
   Approve this survey?

   This will mark it as completed and finalize
   the report. You can still add comments after.
   ```
4. Tap **"Approve"**
5. Status changes to **`completed`**
6. Excel report generated
7. Success message appears

**Post-Approval:**
- Survey locked for further edits (except Admin)
- Report available for export
- Surveyor notified of approval

---

### 7. Requesting Changes

**When to Request Changes:**
- Missing required information
- Photos insufficient or unclear
- Data inconsistencies found
- Surveyor errors detected

**Steps:**
1. Add comments explaining what needs fixing
2. Tap **"Request Changes"** button (orange)
3. Add rejection reason:
   ```
   Reason for Changes:

   - Missing photos for AHU-003
   - Quantity working > quantity installed for FAN-007
   - Remarks required for "Unsatisfactory" items
   ```
4. Tap **"Send Back"**
5. Status changes to **`in_progress`**
6. Survey unlocks for surveyor
7. Surveyor receives notification

**Surveyor's View After Request:**
- Home screen → See survey with "⏱ Pending" chip
- Tap "Inspect" → See reviewer comments
- Fix issues
- Resubmit

---

### 8. Generating Final Reports

**Export Reviewed Survey:**
1. Review complete → Tap **"Export"** button
2. Choose format:
   - **Excel with Photos:** Full report
   - **PDF Summary:** Compact version
3. Download location
4. Report includes:
   - All asset data
   - Embedded photos
   - MAG/CIT/DGDA comments
   - Approval date and reviewer name

**Batch Export:**
1. Reports tab → Select multiple surveys
2. Tap **"Export Selected"**
3. ZIP file with all reports downloads

---

## ❓ FAQ

### General Questions

**Q: Can I work offline?**
A: Yes! The app has full offline support:
- Start surveys offline
- Capture photos and data
- Save progress locally
- Auto-syncs when you reconnect
- Excel reports generate locally

**Q: What happens if I lose internet during submission?**
A: No problem:
1. Survey status changes to `submitted` locally
2. Excel report generates from local data
3. Data queues for upload
4. Syncs automatically when reconnected
5. Green sync indicator shows status

**Q: Can I use the app on both mobile and web?**
A: Yes! Your account works on:
- iOS (iPhone, iPad)
- Android (phones, tablets)
- Web browsers (Chrome, Safari, Firefox)

Data syncs across all devices.

---

### For Surveyors

**Q: I accidentally submitted a survey. Can I edit it?**
A: Only if you're an admin. Otherwise:
1. Contact your admin
2. Explain what needs changing
3. Admin can unlock the survey
4. You can then edit and resubmit

**Q: Why can't I edit a completed survey?**
A: Lock mode prevents accidental changes after approval. Only admins can edit completed surveys to maintain data integrity.

**Q: How do I know if my photos uploaded?**
A: Check sync indicator:
- 🟢 Green = All synced
- 🟡 Yellow = Uploading
- 🔴 Red = Failed (will retry)

Profile tab → "Sync Data" shows details.

**Q: Can I add assets not in the pre-loaded list?**
A: Yes! Tap **"+ Add Asset"** button:
- Scan QR code
- Or enter manually
- Asset saves to survey

**Q: What's the difference between "Save & Exit" and "Submit"?**
A:
- **Save & Exit:**
  - Saves progress
  - Status stays `in_progress`
  - You can resume later
  - No Excel generated
  - No lock applied

- **Submit Survey:**
  - Changes status to `submitted`
  - Generates Excel report
  - Survey locks
  - Sends to reviewers
  - Cannot edit (unless admin unlocks)

---

### For Admins

**Q: How do I unlock a submitted survey?**
A:
1. Home screen → Find survey
2. Tap **"Edit"** button (only admins see this)
3. Survey unlocks automatically
4. Surveyor can now edit
5. Status reverts to `in_progress`

**Q: Can I delete a survey?**
A: Yes, but:
- Only surveys in `draft` or `in_progress` status
- Cannot delete `submitted` or `completed` surveys
- Deleting removes all associated data (assets, photos)
- Confirmation required

**Q: How do I export all surveys for a site?**
A:
1. Survey Management tab
2. Select site from dropdown
3. Tap **"Export All as ZIP"**
4. One ZIP with all surveys downloads

**Q: What if a surveyor leaves the company?**
A:
1. User Management → Find user
2. Toggle **"Active"** to OFF
3. User cannot login
4. Their completed surveys remain intact
5. Reassign in-progress surveys to another surveyor

---

### For Reviewers

**Q: Can I edit surveyor data?**
A: No, you can only:
- Add review comments (MAG, CIT, DGDA)
- Add review photos
- Approve or request changes

To edit surveyor data, ask an admin.

**Q: What if I approve a survey by mistake?**
A: Contact an admin:
1. Admin can unlock the survey
2. Status reverts to `under_review`
3. You can make corrections
4. Re-approve when ready

**Q: Can I review surveys offline?**
A: Yes, but:
- Survey must be downloaded first (open while online)
- You can add comments offline
- Comments upload when reconnected

**Q: How do I know which surveys need review?**
A: Reviewer Dashboard shows:
- Pending Reviews count
- List of surveys with status = `submitted`
- Sorted by date (oldest first)

---

## 🔧 Troubleshooting

### Common Issues

**Issue: Bottom button overlaps phone navigation**
**Fixed!** ✅
- FAB now positioned higher on mobile
- Extra padding added for iOS home indicator
- Safe area respected on all devices

**Issue: Photos not appearing in Excel**
**Fixed!** ✅
- Web photos now use UUID format
- All photos included in reports
- Review photos embedded correctly

**Issue: Form errors only show after submit**
**Fixed!** ✅
- Real-time validation now enabled
- Errors show immediately
- Helper text explains issues

---

## 📞 Support

**Need Help?**
- Email: support@cit-operations.com
- Phone: +967 XXX XXXXX
- In-app: Profile → "Help & Support"

**Bug Reports:**
- GitHub: https://github.com/anthropics/cit-facility-survey/issues

**Training Materials:**
- Video tutorials: https://training.cit-operations.com
- PDF guides: https://docs.cit-operations.com

---

**Last Updated:** March 29, 2026
**App Version:** 1.0.0
**Document Version:** 1.0
