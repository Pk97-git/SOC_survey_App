/**
 * Help text constants for inline field assistance
 * Used with HelpIcon component to provide contextual explanations
 */

export const HELP_TEXT = {
    // ── StartSurveyScreen ──────────────────────────────────────────────────
    SITE_SELECTION: 'Select the facility or building location where the survey will be conducted. This determines which assets will be pre-loaded.',

    LOCATION_BUILDING: 'Optional: Filter assets by specific building or area within the selected site. Leave as "All Locations" to include all areas.',

    SERVICE_LINE: 'The trade or service system being inspected (e.g., HVAC, Plumbing, Electrical). This determines which assets appear in your survey. Choose from the dropdown if assets exist, or enter manually for custom surveys.',

    SURVEYOR_NAME: 'Your name or ID for record-keeping. This helps track who conducted each survey. Defaults to your profile name.',

    GPS_LOCATION: 'Automatically captures your GPS coordinates to verify you are at the correct site location. Helps ensure data accuracy and site authentication.',

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

    ASSET_BUILDING: 'The building, floor, or area where this asset is located (e.g., "Main Building - 2nd Floor", "Rooftop").',

    ASSET_SERVICE_LINE: 'The trade category this asset belongs to (HVAC, Plumbing, Electrical, etc.). Used to group assets in surveys.',

    // ── ProfileScreen ────────────────────────────────────────────────────
    CHANGE_PASSWORD: 'Update your account password. Must be at least 6 characters. You will need to use the new password on your next login.',

    SYNC_DATA: 'Manually synchronize local data with the server. Use this if you have pending changes or want to ensure you have the latest data.',

    // ── General Concepts ─────────────────────────────────────────────────
    LOCK_MODE: 'Surveys lock when status is "Submitted" or "Completed" to prevent accidental changes. Admins can always edit locked surveys.',

    OFFLINE_MODE: 'App works offline! Your changes are saved locally and automatically sync when you reconnect to the internet.',

    DRAFT_VS_SUBMIT: 'Save Draft: Keeps status as "In Progress", you can continue later.\nSubmit: Changes status to "Submitted", generates Excel, and locks survey for review.',
};
