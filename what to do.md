PRD vs Implementation Audit
WHAT'S BEEN DONE (Matching PRD)
PRD Requirement	Status	Implementation
Select Location & Department	Done	CreateSurveyScreen.tsx — text inputs for facility, department, project type
Choose Project Type	Done	Project type field in survey setup
Complete Survey On-Site	Done	SurveyScreen.tsx — section-based Q&A with 5 question types
Generate Excel Report	Done	excelService.ts — generates .xlsx via SheetJS
Download & Share	Done	Uses expo-sharing native share sheet
Full Offline Functionality	Done	SQLite offline-first, no backend dependency
English only	Done	No i18n needed per PRD
Asset Register upload (Excel)	Done	importService.ts — import from Excel file picker
Add assets manually while surveying	Done	AssetFormScreen.tsx — manual asset entry
GPS coordinates per asset	Done	expo-location capture on asset form
React Native + Expo	Done	Expo SDK 54, React Native 0.81.5
WHAT'S WRONG (Bugs & Issues)
1. Photo capture is completely non-functional (PRD: "take photos directly in the app")

SurveyScreen.tsx:192-199 — The "Photo" button is a dead TouchableOpacity with no onPress handler
expo-image-picker is installed but never imported or used anywhere
No photo capture, storage, or display logic exists
This is the #1 gap — photos are core to the entire workflow
2. Excel filename doesn't match PRD format

PRD says: FacilityName_Department_Date.xlsx
Code does: Survey_${survey.location}_${Date.now()}.xlsx (excelService.ts:135)
Uses a Unix timestamp instead of a readable date, and omits department
3. No "Review & Submit" validation screen

PRD says: "App validates responses and flags any missing information"
Code: Submitting goes straight from the last section's "Next Section" button → Alert → complete (SurveyScreen.tsx:76-80)
No review/summary screen, no missing-field highlighting, no validation
4. "Note" button is also non-functional

SurveyScreen.tsx:197-199 — "Note" TouchableOpacity has no onPress
Notes state exists (notes state variable at line 20) but there's no UI to actually enter notes
PRD says: "Optional notes per question" (from tech spec)
5. No auto-save / save & exit

PRD says: auto-save every 500ms, "Save & Exit to pause survey"
Code: Answers are only held in React state (useState). If the app crashes or user navigates away, all data is lost
Survey is only persisted to DB on final submit (handleCompleteSurvey)
6. No resume in-progress surveys

PRD says: "Resume in-progress surveys"
Code: HomeScreen has a "Resume Latest" card but surveys are never saved as in_progress — they go straight to completed on submit
7. Hardcoded "Trade: FM Services" in Excel

excelService.ts:51 — Always writes "Trade:", "FM Services" regardless of what department/project type was selected
8. Excel standard mode uses question_id instead of question text

excelService.ts:103 — Outputs raw IDs like q_1_2 instead of the actual question label, making the Excel unreadable
9. Asset → Survey link is broken

AssetListScreen.tsx:61 — Navigates with templateId: 'default' which doesn't exist — will crash with "Template not found" alert
10. getDb() returns mock object in Expo Go

All SQLite operations silently fail during development, meaning you can't actually test DB features without a dev build
WHAT'S MISSING (Not Implemented)
Critical (required by PRD):

Missing Feature	PRD Reference	Impact
Photo capture & attachment	"Take photos directly in the app"	Core workflow broken — surveyors can't document findings
Photos linked to questions	"only thing is to have more than one photo be attached"	Can't attach multiple photos per question
Photos in Excel output	"Please refer to the same excel"	Excel has placeholder "X Attached" text but no actual photos
Real-time validation	"Catch missing data or errors on-site"	No required-field enforcement during survey
Review/summary screen	"Review & Submit: App validates responses"	No pre-submission review
Central database storage	"Should surveys be stored in a central database? Yes"	100% local-only, no sync capability
Auto-save to SQLite	"Auto-save every 500ms"	Data only saved on final submit
Save & Exit / Resume	"Save & Exit to pause survey"	Can't pause and come back
Search/filter completed surveys	"Search/filter by location, department, date"	Reports screen has no filtering
Delete surveys	"Delete surveys with confirmation"	No delete capability
Important (PRD-adjacent, mentioned in tech spec):

Missing Feature	Details
Photo compression	Tech spec: "resize to 1920x1080 max, quality 0.8" — not implemented
Crash recovery	Tech spec: "No data loss on crash/restart" — state is in-memory only
Multiple choice questions	Tech spec lists it as a question type — not implemented
Date question type	Tech spec lists it — not implemented
Conditional logic	Open question in PRD — not addressed
Error boundaries	App can crash silently on any unhandled error
Storage warnings	Tech spec: "Warn if device storage <500MB free"
SUMMARY SCORECARD
Category	Score	Notes
Survey Setup Flow	7/10	Works but missing dropdowns (uses free text instead)
Survey Completion	3/10	Questions render, but no photos, no notes, no auto-save, no validation
Photo Management	0/10	Completely non-functional despite being core to the product
Excel Generation	4/10	Generates files but wrong naming, hardcoded values, no photos embedded
Asset Register	6/10	CRUD works, GPS works, Excel import works, but asset→survey link is broken
Offline Support	5/10	SQLite is there but no auto-save means data loss risk
Data Management	2/10	No resume, no delete, no search/filter, no central storage
Overall PRD Compliance	~35%	Core scaffolding exists but critical workflows are incomplete
The app has a solid structural foundation (navigation, screens, DB schema, theming) but the core user workflow — walk through a facility, answer questions, take photos, generate a complete Excel — is broken at several critical points, most importantly photo capture and data persistence during survey-taking.

first I need to understand what is the expectation in terms of asset related thing...

so fo a site there are multiple assets .. which needs to have single excel file for each asset surveyed is it?

I have got the team share one excel file for reference

Location: Historical well-2 Location no 26
Trade: FM Services
Date: 02/08/26
Condition Rating Overall Condition
Ref Service Line Floor Area Age Description A >> NEW B >> Excellent C >> Good D>>Average E>>Poor F >> Very Poor G >> T.B.D "- Satisfactory

Unsatisfactory
Satisfactory with Comment
" Quantity Installed Quantity Working Photos Remarks MAG Comments MAG Pictures CIT Verification/ Comments DGDA Comments
1 Civil GF External Mud Wall 26HW2/GF/CIVIL/WALLEXT/001 B >> Excellent Satisfactory Picture The heritage is in excellent condition
2 Civil GF External Tiles 26HW2/GF/CIVIL/TILEEXT/001 B >> Excellent Satisfactory Picture The heritage is in excellent condition
3 Civil GF Stone Wall External 26HW2/GF/CIVIL/STONEWALLEXT/001 B >> Excellent Satisfactory Picture The heritage is in excellent condition
Show more


This Excel template is very revealing. Let me break down what I see:

The Structure
One Excel file = One site/location survey. Each row is a different asset at that site.

Location: Historical well-2 Location no 26    ← The SITE
Trade:    FM Services                          ← The service trade
Date:     02/08/26

Row 1: External Mud Wall       (asset #1 at this site)
Row 2: External Tiles          (asset #2 at this site)
Row 3: Stone Wall External     (asset #3 at this site)
... potentially dozens more

So the workflow is:
Surveyor arrives at a site (e.g., "Historical well-2 Location no 26")
Asset register is loaded — either pre-uploaded from Excel or added one-by-one on site
For each asset, the surveyor fills in:
Condition Rating (A-G scale, one selection)
Overall Condition (Satisfactory / Unsatisfactory / Satisfactory with Comment)
Quantity Installed
Quantity Working
Photos (one or more)
Remarks
One Excel file is generated for the entire site, with all assets as rows
The last 4 columns (MAG Comments, MAG Pictures, CIT Verification, DGDA Comments) are left blank — filled in later by other teams downstream
My questions to confirm:
One Excel per site — not per asset, correct? The surveyor walks through the whole site, surveys every asset, and gets one report out.

The asset description follows a naming convention like 26HW2/GF/CIVIL/WALLEXT/001 — is this auto-generated from the asset register, or does the surveyor type it?

The "pre-loaded" asset register — when you said "if asset register available, upload it before survey" — does that mean someone provides an Excel with all the assets (Ref, Service Line, Floor, Area, Description) pre-filled, and the surveyor just needs to fill in the condition/photos/remarks columns?

Can new assets be added during survey? — if the surveyor finds something not on the register, can they add a row on the spot?

These answers will determine exactly how the app flow should work. The current implementation has some of this structure in excelService.ts (the grid mode) but the connection between the asset register and the survey is broken.

Additional Requirement:

If asset register availalbe, need the option to upload the asset register prior to start of survey.

If asset register is not available, we add manually one by one while surveying.

Accurate Location coordinates need to be added for each assets.

what is the understanding from this



Looking at this PRD requirement alongside the Excel template you just shared, here's the clear picture:

Two Scenarios for Asset Handling
Scenario A: Asset Register Available (Pre-Survey)

Before going to site, someone has an Excel file listing all known assets at that location
That Excel contains the static columns: Ref, Service Line, Floor, Area, Age, Description
This gets uploaded into the app before the survey starts
The surveyor then goes on-site and just fills in the survey columns for each asset: Condition Rating, Overall Condition, Qty, Photos, Remarks
Think of it as: the left side of the spreadsheet is pre-populated, the surveyor fills in the right side
Scenario B: No Asset Register (During Survey)

Surveyor arrives at site with no pre-existing asset list
They discover assets as they walk through the facility
For each asset found, they create it on the spot: enter Service Line, Floor, Area, Description
Then immediately fill in the condition/photos/remarks
GPS coordinates are captured per asset as they go
The asset register is essentially built during the survey
What This Means for the App Flow
Start Survey
  ├── Select Location, Trade, Date
  ├── Got an asset register?
  │     ├── YES → Upload Excel → Assets pre-loaded as rows
  │     └── NO  → Start with empty list
  │
  ├── Survey Screen (the main work)
  │     ├── Shows list of assets (pre-loaded or empty)
  │     ├── For each asset:
  │     │     ├── Condition Rating (pick A-G)
  │     │     ├── Overall Condition (Satisfactory/Unsatisfactory/Satisfactory with Comment)
  │     │     ├── Qty Installed / Qty Working
  │     │     ├── Photos (multiple, with GPS)
  │     │     └── Remarks
  │     ├── + "Add New Asset" button (always available)
  │     └── GPS captured per asset
  │
  └── Submit → Generate single Excel for entire site

What's Wrong in Current Implementation
The current code treats assets and surveys as separate disconnected features:

AssetListScreen and AssetFormScreen are standalone admin screens on their own tab
SurveyScreen is a generic question-answer form driven by templates
There is no link between them — assets aren't loaded as rows in the survey
The survey uses section-based Q&A (like a generic form) instead of an asset-by-asset inspection grid which is what the Excel template actually shows
What It Should Be
The survey IS the asset list. Each asset is a row. The surveyor's job is to go asset by asset and rate each one. The entire output is one Excel that matches your template exactly — assets as rows, condition/photos/remarks as columns.

Want me to rebuild the app flow around this corrected understanding?

so what is the use of admin here?



Great question. Let me think about this based on the PRD and the actual workflow:

What the PRD Says About Roles
The PRD mentions two groups who access reports:

Mobilisation Team — downloads reports
SOC Team — downloads reports
And the stakeholder answers say:

"Surveys stored in a central database? Yes"
Asset register uploaded prior to survey start
So Who Does What?
The Surveyor (on-site person):

Goes to site
Uploads asset register OR adds assets manually
Does the actual inspection — rates conditions, takes photos
Generates the Excel
Shares it
The "Admin" in our current app:

Can access Templates tab
Can access Assets tab
Can create/edit survey templates
The Problem: Admin Role Doesn't Match the PRD
The PRD never mentions an admin role. It describes a single workflow:

Surveyor selects location
Surveyor uploads or creates asset register
Surveyor completes inspection
Surveyor generates Excel
The current app gates Templates and Assets behind admin-only access — but according to the PRD, the surveyor needs access to both. They need to upload the asset register themselves. They need to pick a template.

What Admin Should Actually Mean
Looking at the PRD's "Out of Scope (Phase 1)" list:

Backend server / cloud storage
User authentication / multi-user accounts
Web dashboard or admin panel
Admin doesn't exist in Phase 1. The PRD explicitly says auth is out of scope. Every user is essentially a surveyor who can do everything.

When a backend comes in Phase 2, the roles would likely be:

Role	Responsibility
Admin/Manager	Manages templates, views all surveys in central DB, reviews reports
Surveyor	Uploads asset register, does inspections, generates Excel
What We Should Do Now
For Phase 1 (current scope):

Remove the role-based gating — every user gets full access
Remove the fake login — or keep it as a simple name entry (to stamp who did the survey) without role logic
Templates and Assets should be accessible to everyone
The login is just "Who are you?" not "What can you do?"
The current admin/surveyor split is premature and actually blocks the surveyor from doing their job — they can't upload an asset register because that tab is admin-only.

Does this align with your understanding? Should I restructure the app to remove the role separation and give everyone full access for Phase 1?

leave the prd and leave the current implemtentiation.. What do you think is the right way the app should work..
I want different roles in the app



Here's how I think the app should actually work, from scratch:

Roles
1. Admin
The system manager. Sits in the office.

Creates and manages survey templates (defines what columns/fields surveyors see)
Manages master asset registers — uploads the known asset list per site/project before survey begins
Manages users (adds surveyors, assigns sites)
Has a dashboard — sees all surveys across all sites, their status, can download any Excel
Does NOT go to the field
2. Surveyor
The field person. On-site with a tablet/phone.

Sees their assigned sites or can start a new survey
Selects a site → asset register is already loaded (by Admin) OR starts empty
Goes asset by asset:
Condition Rating (A-G)
Overall Condition (Satisfactory / Unsatisfactory / Satisfactory with Comment)
Qty Installed / Qty Working
Takes photos (multiple per asset, with GPS)
Adds remarks
Can add new assets discovered on-site (Scenario B)
Can save and exit mid-survey (offline, auto-save)
Submits when done → Excel generated automatically
Shares Excel via WhatsApp/email/download
3. Reviewer (the downstream teams)
The people who fill in those last 4 columns.

Gets submitted surveys assigned to them
Opens a completed survey in read-only + comment mode
Fills in their specific columns:
MAG Comments + MAG Pictures
CIT Verification/Comments
DGDA Comments
Marks review as complete
Updated Excel can be re-generated with all comments included
App Flow
┌─────────────────────────────────────────────────────────┐
│                        LOGIN                            │
│         Real auth (username + password)                  │
│         Role determines what you see                    │
└──────────────┬──────────────┬──────────────┬────────────┘
               │              │              │
         ┌─────▼─────┐ ┌─────▼─────┐ ┌──────▼──────┐
         │   ADMIN   │ │ SURVEYOR  │ │  REVIEWER   │
         └─────┬─────┘ └─────┬─────┘ └──────┬──────┘
               │              │              │

Admin Flow
Admin Home
  ├── Templates
  │     ├── Create new template (define columns, rating scales)
  │     ├── Edit existing
  │     └── Delete
  │
  ├── Sites & Asset Registers
  │     ├── Create a site (name, location)
  │     ├── Upload asset register Excel for a site
  │     ├── View/edit assets under a site
  │     └── Assign site to surveyors
  │
  ├── Users (Phase 2 with backend)
  │     └── Add/remove surveyors and reviewers
  │
  └── All Surveys Dashboard
        ├── Filter by site, surveyor, status, date
        ├── View any survey
        ├── Download any Excel
        └── Status: Draft → Submitted → Under Review → Completed

Surveyor Flow
Surveyor Home
  ├── "My Surveys" list
  │     ├── In Progress (tap to resume)
  │     ├── Submitted
  │     └── Reviewed (final)
  │
  ├── Start New Survey
  │     ├── Select Site (from assigned sites)
  │     ├── Select Template
  │     ├── Date auto-filled
  │     ├── GPS auto-captured
  │     │
  │     └── Asset register loaded?
  │           ├── YES → Show pre-loaded asset list
  │           └── NO  → Empty list, "Add Asset" button
  │
  ├── Survey Screen (THE MAIN SCREEN)
  │     ├── Header: Site name, Trade, Date, Progress
  │     │
  │     ├── Asset List (scrollable cards)
  │     │     ├── Asset Card #1: "External Mud Wall"
  │     │     │     ├── Condition: [A] [B] [C] [D] [E] [F] [G]
  │     │     │     ├── Overall: [Satisfactory ▼]
  │     │     │     ├── Qty Installed: [___]  Qty Working: [___]
  │     │     │     ├── Photos: [📷 +Add]  (thumbnails shown)
  │     │     │     ├── Remarks: [___________]
  │     │     │     └── GPS: 24.4539, 54.3773 ✓
  │     │     │
  │     │     ├── Asset Card #2: "External Tiles"
  │     │     │     └── ... same fields ...
  │     │     │
  │     │     └── [+ Add New Asset]
  │     │
  │     ├── Auto-saves every change to SQLite
  │     ├── [Save & Exit] → resume later
  │     └── [Submit Survey] → validation → Excel generated
  │
  └── Generated Excel matches the template exactly

Reviewer Flow
Reviewer Home
  ├── "Pending Reviews" list
  │     └── Surveys submitted and assigned to them
  │
  ├── Review Screen
  │     ├── Read-only view of surveyor's data
  │     ├── Photos viewable
  │     ├── For each asset, can fill in:
  │     │     ├── MAG Comments
  │     │     ├── MAG Pictures
  │     │     ├── CIT Verification/Comments
  │     │     └── DGDA Comments
  │     └── [Complete Review]
  │
  └── Final Excel regenerated with all columns filled

Survey Lifecycle
Draft ──→ Submitted ──→ Under Review ──→ Completed
  │           │              │               │
Surveyor   Surveyor      Reviewer(s)      Final Excel
working    done, Excel   adding their     with all
on-site    generated     comments         columns filled

Key Design Decisions
Decision	Rationale
Asset = Row, not Question	The survey IS the asset inspection. Each asset is a row in the Excel. Not a generic Q&A form.
Site-centric, not template-centric	Surveyor picks a site, not a template. Template defines the columns/format.
One Excel per site survey	Matches the actual deliverable format exactly
Reviewer is a separate role	Those last 4 columns (MAG, CIT, DGDA) are filled by different teams post-survey
Admin prepares, Surveyor executes	Clean separation — Admin sets up sites/assets, Surveyor focuses on inspection
Auto-save always	No data loss. Surveyor can close app, lose battery, come back tomorrow
Phase 1 vs Phase 2
Phase 1 (offline-first, no backend):

Admin + Surveyor roles (local, simple login)
Asset register upload/manual entry
Asset-by-asset survey with photos + GPS
Excel generation matching the template exactly
Save/resume surveys
All data on-device
Phase 2 (with backend):

Real authentication
Reviewer role
Central database sync
Survey assignment workflow
Cross-device access
The full lifecycle (Draft → Submitted → Reviewed → Completed)
Does this match what you're envisioning? Should I start rebuilding the app around this flow?

hey I feel the surveryor should have the option to add excel file to add the asset register - later during the saruvey if they find more assets they can addd them also.. also have the option to indicidaully add asset any time.. just the way you told..
a



Makes total sense. The Surveyor is the one on-site — they're the ones who know what's in front of them. Here's the refined take:

Asset Management — Surveyor Has Full Control
Before Survey (Preparation)
Surveyor starts a new survey for a site
  │
  ├── Upload asset register Excel?
  │     ├── YES → Bulk import, assets pre-loaded as rows
  │     └── NO  → Start with empty list, add as you go
  │
  └── Can also manually add individual assets at this point

During Survey (On-site)
Survey Screen (asset-by-asset inspection)
  │
  ├── Pre-loaded assets listed as cards
  │     └── Surveyor fills in condition/photos/remarks per asset
  │
  ├── Found something new?
  │     └── [+ Add Asset] → quick form → appears as new row
  │
  └── All assets (imported + manually added) end up in the same Excel

Any Time (Standalone)
Asset Register tab (accessible to Surveyor too)
  │
  ├── View all assets across sites
  ├── Upload Excel to bulk import
  ├── Add individual asset manually
  └── Edit/delete existing assets

So What Changes from What I Proposed Earlier
What I Said Before	What Changes
Admin uploads asset registers	Surveyor can too — whoever has the Excel file uploads it
Assets tab is Admin-only	Assets tab available to all roles
Admin prepares, Surveyor executes	Surveyor is self-sufficient — can prepare AND execute
What Admin Still Does
Admin's role becomes more about system-level management:

Create/edit survey templates (the column structure, rating scales)
Dashboard — overview of all surveys across all surveyors/sites
Download/view any survey's Excel
User management (Phase 2)
The Admin doesn't gatekeep assets. They manage the structure and have visibility over everything.

Updated Role Summary
Capability	Admin	Surveyor	Reviewer
Create/edit templates	Yes	No	No
Upload asset register (Excel)	Yes	Yes	No
Add individual assets	Yes	Yes	No
Conduct survey on-site	No	Yes	No
Add new assets during survey	No	Yes	No
Generate/share Excel	Yes	Yes	No
View all surveys (dashboard)	Yes	Own only	Assigned only
Add review comments	No	No	Yes
This way the Surveyor is completely self-sufficient in the field — no dependency on Admin to set things up. Admin is for oversight and template management.

Want me to start rebuilding the app around this?

implement all that we spoke now