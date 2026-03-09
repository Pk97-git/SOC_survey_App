# Survey Tab Specification

## 1. Current State (ReportsScreen.tsx)

The current implementation acts as a hybrid between a survey management tool and an export utility.

### Features:
*   **Site Selection**: Uses a dropdown to filter surveys by site.
*   **Survey List**: Displays a list of existing survey records from the backend.
*   **Filters**: Horizontal chips for Trade (System) and Status (Draft/Submitted).
*   **Manual Creation**: Floating Action Button (FAB) to manually start a survey by choosing site/trade.
*   **Batch Export Logic (Complexity)**: 
    *   Analyzes assets to find unique location × trade combinations.
    *   Offers "Proceed" (add missing) or "Recreate All" (delete and restart).
    *   Creates surveys on the backend.
    *   Downloads and saves Excel files locally in organized folders.
*   **Saved Reports Viewer**: A separate modal/screen to view previously downloaded Excel files.

### Limitations:
*   UI feels cluttered with list items and multiple buttons per row (Resume, Export).
*   The "Batch" process is hidden behind a small icon.
*   No clear "Setup Overview" or high-level analytics for the site.
*   Navigation to the actual Excel file requires multiple steps.

---

## 2. Proposed Simplified State (Admin Command Center)

The goal is to transform the tab into a simple Setup & Review dashboard.

### Phase A: Setup & Analytics
When a site is selected, the screen should immediately show the "State of the Site":

*   **Analytics Header**:
    *   "Total Asset Count found: 103,598"
    *   "Unique Locations identified: 12"
    *   "Unique Service Lines identified: 6"
    *   "Total Potential Survey Workbooks: 72"
*   **Primary Action (Conditional)**:
    *   **Case 1: No Surveys Exist** -> Action: **[Generate All Surveys]**
    *   **Case 2: Surveys Already Exist** -> Action: **[Recreate Surveys & Sync Assets]** (Refreshes the checklists with any new assets uploaded to the register).

### Phase B: Organized Selection Flow
Instead of a flat list, use a directed selection flow to view work:

1.  **Select Location** (e.g., Building A, B, C):
    *   Display as a grid or a clean vertical list of buildings.
2.  **Select Service Line** (within that location):
    *   Once a building is tapped, show the trades available (Mechanical, Electrical, etc.).
3.  **View Report**:
    *   Direct button to "View Excel".
    *   The app should allow opening the generated spreadsheet directly within the interface (or via system viewer) for immediate review.

### UI Principles:
*   **Cleanliness**: Remove the long scrolling list of IDs. Focus on "Site -> Building -> Trade".
*   **Visibility**: Always show the counts (How many surveys exist vs. how many should exist).
*   **Directness**: One button to "Recreate" everything if the Asset Register changes.
