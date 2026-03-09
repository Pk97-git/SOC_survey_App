CIT Facility Survey Mobile App 

Technical Specification Document 

For Development Team 

Version: 

1.0 

Date: 

February 5, 2026 

Audience: 

Development Team 

 

1. Project Overview 

Purpose: Build a cross-platform mobile app (iOS/Android) for CIT Operations to conduct facility surveys on-site, capture photos, and generate Excel reports automatically. 

Goal: Eliminate manual post-visit data entry and reduce report generation from 1-2 days to under 1 hour. 

Scope 

In Scope: 

iOS and Android native apps 

Dynamic survey forms with validation 

In-app camera + photo management 

Local SQLite storage with auto-save 

Excel (.xlsx) file generation 

Native file sharing (email, WhatsApp, etc.) 

Fully offline-capable 

Out of Scope (Phase 1): 

Backend server / cloud storage 

User authentication / multi-user accounts 

Web dashboard or admin panel 

Analytics beyond Excel export 

 

2. Technology Stack 

Layer 

Technology 

Framework 

React Native with Expo SDK 52+ 

Language 

TypeScript 

State Management 

React Context API + useReducer OR Zustand 

Navigation 

React Navigation 6.x 

Local Storage 

Expo SQLite (survey data) + Expo File System (photos) 

Camera/Photos 

expo-camera OR expo-image-picker 

Excel Generation 

xlsx (SheetJS) library 

File Sharing 

expo-sharing (native share sheet) 

UI Components 

React Native Paper OR NativeBase 

Form Validation 

React Hook Form + Zod 

 

3. System Architecture 

The application follows an offline-first, modular architecture with four main layers: 

Presentation Layer: React Native screens and components 

Business Logic Layer: Custom hooks and service functions 

Data Layer: SQLite + File System 

Export Layer: Excel generation and sharing utilities 

 

Data Flow 

User selects location, department, project type 

App loads survey template from local config 

User answers questions + captures photos 

All data auto-saved to SQLite (500ms debounce) 

Photos stored in app's document directory with compression 

On submit, data validated against schema 

User triggers Excel generation 

App reads from SQLite, retrieves photos, generates .xlsx 

File saved as: LocationName_Department_YYYY-MM-DD.xlsx 

Native share sheet presented to user 

 

Project Structure 

/src 

  /screens      - UI screens (Home, Survey, Review, Excel) 

  /components   - Reusable UI components 

  /hooks        - Custom React hooks 

  /services     - Business logic (survey, photo, excel) 

  /utils        - Helper functions 

  /config       - Survey templates, constants 

  /types        - TypeScript interfaces 

  /navigation   - React Navigation setup 

  /db           - SQLite database layer 

 

4. Core Features Summary 

4.1 Survey Setup 

Location selection (dropdown or manual entry) 

Department selection (Facility Management, Drilling, Oil Waste, Other) 

Project type selection 

Auto-populated date/time (editable) 

 

4.2 Survey Completion 

Support multiple question types: Yes/No, Multiple Choice, Text, Numeric, Date, Rating 

Progress indicator (Question X of Y) 

Auto-save every 500ms 

Back/Next navigation 

Optional notes per question 

Save & Exit to pause survey 

 

4.3 Photo Capture 

In-app camera access 

Gallery selection option 

Link photos to specific questions (TBD with stakeholders) 

Add caption/label to photos 

Multiple photos per question 

Delete photos with confirmation 

Auto-compress to max 1920x1080 (~500KB per photo) 

 

4.4 Validation & Submission 

Real-time validation for required fields 

Survey summary/review screen 

Highlight incomplete sections 

Submit button (disabled until complete) 

Success confirmation 

 

4.5 Excel Report Generation 

Generate Excel button after submission 

Match existing template structure (stakeholders to provide) 

File naming: LocationName_Department_YYYY-MM-DD.xlsx 

Photos embedded or linked (TBD) 

Progress indicator during generation 

Error handling with retry option 

Target: <10 seconds for typical survey 

 

4.6 File Sharing 

Download to device storage (Downloads folder) 

Native share sheet (email, WhatsApp, cloud storage) 

Regenerate Excel from completed surveys 

 

4.7 Survey Management 

Home screen with survey list (In Progress, Completed, All) 

Display: Location, Department, Date, Status 

Resume in-progress surveys 

Delete surveys with confirmation 

Search/filter by location, department, date 

 

5. Database Schema (SQLite) 

surveys table 

CREATE TABLE surveys ( 

  id TEXT PRIMARY KEY, 

  location TEXT NOT NULL, 

  department TEXT NOT NULL, 

  project_type TEXT NOT NULL, 

  survey_date TEXT NOT NULL, 

  status TEXT NOT NULL, -- 'in_progress' or 'completed' 

  created_at TEXT NOT NULL, 

  updated_at TEXT NOT NULL 

); 

 

responses table 

CREATE TABLE responses ( 

  id TEXT PRIMARY KEY, 

  survey_id TEXT NOT NULL, 

  question_id TEXT NOT NULL, 

  answer TEXT, -- JSON string or plain text 

  notes TEXT, 

  created_at TEXT NOT NULL, 

  updated_at TEXT NOT NULL, 

  FOREIGN KEY (survey_id) REFERENCES surveys(id) 

); 

 

photos table 

CREATE TABLE photos ( 

  id TEXT PRIMARY KEY, 

  survey_id TEXT NOT NULL, 

  question_id TEXT, -- NULL if general photo 

  file_path TEXT NOT NULL, 

  caption TEXT, 

  created_at TEXT NOT NULL, 

  FOREIGN KEY (survey_id) REFERENCES surveys(id) 

); 

 

6. Non-Functional Requirements 

Category 

Requirement 

Performance 

App launch <2s. Screen navigation <300ms. Excel generation <10s for typical survey (20-30 questions, 10-15 photos). Photo capture: real-time. 

Offline 

Fully functional offline. All data and photos stored locally. Excel generation works without internet. 

Reliability 

No data loss on crash/restart. Auto-save every 500ms. Crash recovery restores last saved state. 

Usability 

Intuitive UI, minimal training. Touch targets min 44x44pts. Clear feedback. Support portrait and landscape. 

Storage 

Photo compression to ~500KB each. Estimate: 50 surveys x 15 photos = ~375MB. Warn if device storage <500MB free. 

Security 

Data stored locally only (no cloud in Phase 1). SQLite encryption optional. Photos in app's private directory. 

Compatibility 

iOS 14.0+, Android API 24+ (7.0+). Excel files compatible with Excel 2016+ and Google Sheets. 

Localization 

Phase 1: English only. Arabic support as future enhancement. 

 

7. Open Questions for Stakeholders 

CRITICAL: The following must be answered before development begins: 

Survey Template: Please provide current Excel template(s). Are questions standardized or vary by project type? 

Photo Integration: Should photos be embedded in Excel cells, or provided as separate files/hyperlinks? 

Question Types: Confirm all needed types. Any conditional logic between questions? 

Validation Rules: Which fields are mandatory? Any specific validation (numeric ranges, date constraints)? 

Photo Requirements: Should photos link to specific questions or be general? Min/max photos per survey? 

Offline Requirement: Do facilities typically have internet? Is full offline mode essential? 

Arabic Language: Required for Phase 1 or future enhancement? 

 

8. Development Notes 

Key Implementation Considerations 

SQLite Encryption: If required, use SQLCipher or similar. Confirm with stakeholders. 

Photo Compression: Use expo-image-manipulator to resize to 1920x1080 max, quality 0.8. 

Excel Photos: If embedding, use base64 encoding. If linking, create Photos/ subfolder. 

Survey Templates: Store as JSON config files in /config. Design for easy updates without code changes. 

Error Logging: Implement local error logging (Sentry optional for production). 

Testing: Unit tests for services, integration tests for critical flows (survey save, Excel generation). 

 

Deployment 

iOS: TestFlight for internal testing, then App Store 

Android: Google Play Internal Testing, then Production 

Use Expo EAS Build for CI/CD 

 

END OF DOCUMENT 