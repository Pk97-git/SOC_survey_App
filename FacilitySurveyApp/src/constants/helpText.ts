/**
 * Help text constants for inline field assistance
 * Used with HelpIcon component to provide contextual explanations
 */

export const HELP_TEXT = {
    // ── HomeScreen / Dashboard ────────────────────────────────────────────
    ACTIVE_SURVEYS: 'Shows all surveys currently in progress that you are working on. Tap a survey to continue where you left off.',

    START_NEW_SURVEY: 'Create a new facility condition survey. You will select a site, service line, and begin inspecting assets. Your progress auto-saves as you work.',

    SYNC_STATUS: 'Indicates whether your local data is synchronized with the server. Green = synced, Yellow = pending changes, Red = sync failed.',

    RECENT_SURVEYS: 'Quick access to your recently viewed or edited surveys. Tap to jump back into any survey.',

    // ── StartSurveyScreen ──────────────────────────────────────────────────
    SITE_SELECTION: 'Select the facility or building location where the survey will be conducted. This determines which assets will be pre-loaded.',

    LOCATION_BUILDING: 'Optional: Filter assets by specific building or area within the selected site. Leave as "All Locations" to include all areas.',

    SERVICE_LINE: 'The trade or service system being inspected (e.g., HVAC, Plumbing, Electrical). This determines which assets appear in your survey. Choose from the dropdown if assets exist, or enter manually for custom surveys.',

    SURVEYOR_NAME: 'Your name or ID for record-keeping. This helps track who conducted each survey. Defaults to your profile name.',

    GPS_LOCATION: 'Automatically captures your GPS coordinates to verify you are at the correct site location. Helps ensure data accuracy and site authentication.',

    EXISTING_SURVEYS_WARNING: 'Found existing surveys for this site and service line. You can continue an existing survey or create a new one. Creating duplicates may cause confusion during review.',

    // ── AssetInspectionCard ──────────────────────────────────────────────
    CONDITION_RATING: 'Rate the asset condition on a 1-5 scale:\n1 = Excellent (new/like-new)\n2 = Good (minor wear)\n3 = Fair (moderate wear)\n4 = Poor (needs repair)\n5 = Failed (critical)',

    OVERALL_CONDITION: 'Summary assessment of the asset:\n• Satisfactory: Works as intended\n• Satisfactory with Comment: Works but has minor issues\n• Unsatisfactory: Needs repair or replacement',

    QUANTITY_INSTALLED: 'Total number of this asset type installed at the location (e.g., 10 light fixtures, 5 pumps). Enter 0 if none.',

    QUANTITY_WORKING: 'How many of the installed assets are currently functional. Must be less than or equal to quantity installed.',

    REMARKS_FIELD: 'Additional notes or observations about the asset. Required when condition is "Unsatisfactory" or "Satisfactory with Comment" - explain the issue or concern.',

    PHOTOS: 'Upload up to 5 photos documenting the asset condition. Photos are helpful for reviewers to verify issues. Tap a photo to view full-screen and zoom.',

    // ── ReviewSurveyScreen ────────────────────────────────────────────────
    REVIEWER_TYPE: 'Your review type is automatically set based on your organization (MAG, CIT, or DGDA). This determines which review column your comments appear in.',

    REVIEW_COMMENTS: 'Enter your review notes, approval conditions, or requested changes. These comments will be shared with the surveyor and admin.',

    REVIEW_PHOTOS: 'Optional: Upload photos to support your review comments or document additional issues found during review.',

    // ── AssetFormScreen ──────────────────────────────────────────────────
    ASSET_NAME: 'Descriptive name for the asset (e.g., "Main Lobby AC Unit", "Rooftop Water Tank #3"). Make it identifiable.',

    REF_CODE: 'Optional: Internal reference code or asset tag number from your inventory system.',

    ASSET_TAG: 'Optional: Physical tag or label number attached to the asset for easy identification during inspections.',

    ASSET_BUILDING: 'The building, floor, or area where this asset is located (e.g., "Main Building - 2nd Floor", "Rooftop").',

    ASSET_SERVICE_LINE: 'The trade category this asset belongs to (HVAC, Plumbing, Electrical, etc.). Used to group assets in surveys.',

    ASSET_ZONE: 'Optional: The zone or sector within the facility where this asset is located (e.g., "North Wing", "Zone A").',

    ASSET_AREA: 'Optional: The physical area or space this asset serves or occupies, measured in square meters (m²).',

    ASSET_AGE: 'Optional: The age of the asset in years since installation or manufacture. Helps estimate remaining useful life.',

    ASSET_GPS: 'Capture the GPS coordinates of the asset location. Useful for outdoor assets or mapping facility equipment.',

    // ── UserManagementScreen ─────────────────────────────────────────────
    USER_ROLE: 'Surveyor: Conducts surveys and inspects assets.\nAdmin: Full access to manage users, sites, and all surveys.\nReviewer: Reviews submitted surveys and provides approval.',

    USER_ORGANIZATION: 'The organization the reviewer belongs to (MAG, CIT, or DGDA). This determines which review column their comments appear in when reviewing surveys.',

    // ── AssetsScreen ─────────────────────────────────────────────────────
    ASSET_IMPORT: 'Import multiple assets at once from an Excel file. Download the template first to see the required format. Each row in the Excel becomes one asset.',

    ASSET_SEARCH: 'Search assets by name, reference code, or asset tag. Use this to quickly find specific equipment.',

    ASSET_FILTER: 'Filter assets by service line/trade (HVAC, Plumbing, etc.) or building location to narrow down the list.',

    // ── SiteManagementScreen ─────────────────────────────────────────────
    SITE_LOCATION: 'The physical address or GPS coordinates of the site. You can enter manually, use your current GPS location, or select from the map.',

    // ── ProfileScreen ────────────────────────────────────────────────────
    CHANGE_PASSWORD: 'Update your account password. Must be at least 6 characters. You will need to use the new password on your next login.',

    SYNC_DATA: 'Manually synchronize local data with the server. Use this if you have pending changes or want to ensure you have the latest data.',

    // ── SurveyManagementScreen ────────────────────────────────────────────
    SURVEY_ANALYTICS: 'View summary statistics for all surveys at the selected site: total surveys, completion rates, assets inspected, and overall condition distribution.',

    WORKBOOK_MANAGEMENT: 'Manage survey workbooks (collections of surveys). Create new workbooks, view existing ones, or export to Excel for reporting.',

    EXPORT_REPORTS: 'Generate Excel reports for surveys. Select individual surveys or batch export all surveys for a site.',

    FILTER_BY_STATUS: 'Filter surveys by their current status: In Progress, Submitted, Under Review, or Completed.',

    // ── AdminDashboardScreen ──────────────────────────────────────────────
    TOTAL_SITES: 'Total number of facility sites in the system. Tap to view and manage all sites.',

    TOTAL_ASSETS: 'Total number of assets across all sites in the database. Includes equipment, systems, and infrastructure.',

    TOTAL_SURVEYS: 'Total number of condition surveys conducted. Includes all statuses (draft, submitted, completed).',

    PENDING_REVIEWS: 'Number of surveys awaiting review or approval. These surveys have been submitted by surveyors and need review.',

    SYSTEM_HEALTH: 'Overall system status showing sync status, database health, and any critical alerts that need attention.',

    // ── ReviewerDashboardScreen ───────────────────────────────────────────
    SURVEYS_TO_REVIEW: 'List of all surveys assigned to you for review. Filter by status, site, or date submitted.',

    REVIEW_PRIORITY: 'Surveys are prioritized by submission date. Older submissions appear first to ensure timely reviews.',

    BATCH_REVIEW: 'Review multiple surveys from the same site together for consistency and efficiency.',

    // ── General Concepts ─────────────────────────────────────────────────
    LOCK_MODE: 'Surveys lock when status is "Submitted" or "Completed" to prevent accidental changes. Admins can always edit locked surveys.',

    OFFLINE_MODE: 'App works offline! Your changes are saved locally and automatically sync when you reconnect to the internet.',

    DRAFT_VS_SUBMIT: 'Save Draft: Keeps status as "In Progress", you can continue later.\nSubmit: Changes status to "Submitted", generates Excel, and locks survey for review.',

    // ── Workflow Explanation ──────────────────────────────────────────────
    SURVEY_WORKFLOW: '1. Create Survey → 2. Inspect Assets → 3. Submit for Review → 4. Reviewer Approves → 5. Generate Final Report\n\nEach step auto-saves your progress.',

    ASSET_INSPECTION_FLOW: 'For each asset: Check condition → Rate 1-5 → Note working/installed quantities → Add photos → Write remarks if needed → Move to next asset.',

    STATUS_MEANINGS: 'In Progress = Still editing\nSubmitted = Ready for review\nUnder Review = Being reviewed\nCompleted = Approved and finalized',
};
