import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Text, Surface, useTheme, Searchbar, List, Chip, Divider, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Colors, Radius, Typography, Spacing, Layout } from '../constants/design';

interface HelpSection {
    id: string;
    title: string;
    icon: string;
    content: string;
    roles: string[]; // Which roles can see this section
}

const HELP_CONTENT: HelpSection[] = [
    // ═══════════════════════════════════════════════════════════
    // SURVEYOR SECTIONS
    // ═══════════════════════════════════════════════════════════
    {
        id: 'surveyor-start',
        title: 'How to Start a Survey',
        icon: 'play-circle',
        roles: ['surveyor', 'admin'],
        content: `**Step-by-Step Guide:**

1. Go to **Home** tab
2. Tap on a **Site** (e.g., "Parklands Site")
3. Find your assigned survey or tap **"+ New Survey"**
4. Select:
   • **Site/Location** - Where you're conducting the survey
   • **Service Line** - Trade you're inspecting (HVAC, Plumbing, etc.)
   • **Surveyor Name** - Your name (pre-filled)
   • **GPS Location** - Auto-captured for verification
5. Tap **"Start Survey"**

**What Happens:**
• Survey status changes to **"In Progress"**
• You'll see a list of pre-loaded assets to inspect
• Your progress is auto-saved as you work

**Tips:**
✓ GPS helps verify you're at the correct site
✓ If no assets appear, contact your admin
✓ You can add custom assets using the **"+ Add Asset"** button`
    },
    {
        id: 'surveyor-inspect',
        title: 'How to Inspect Assets',
        icon: 'clipboard-check',
        roles: ['surveyor', 'admin'],
        content: `**For Each Asset, Fill Out:**

1. **Condition Rating** (Required)
   • A = NEW (brand new)
   • B = Excellent (like new)
   • C = Good (minor wear)
   • D = Average (moderate wear)
   • E = Poor (needs repair)
   • F = Very Poor (critical)
   • G = T.B.D (to be determined)

2. **Overall Condition** (Required)
   • **Satisfactory** - Works as intended
   • **Unsatisfactory** - Needs repair/replacement
   • **Satisfactory with Comment** - Works but has issues

3. **Quantities**
   • **Qty Installed** - Total number at location
   • **Qty Working** - How many are functional
   • Must be: Working ≤ Installed

4. **Photos** (Up to 10)
   • Tap **"Add Photo"** to capture or upload
   • Tap photo to view full-screen and zoom
   • Swipe to view multiple photos
   • Delete from lightbox if needed

5. **Remarks** (Required if Unsatisfactory)
   • Explain the issue or concern
   • Be specific: "Water leak from pipe joint"

**Progress Tracking:**
• Progress bar shows completion (e.g., "5/12 assets inspected")
• Green checkmark appears when asset is complete
• All changes auto-save instantly`
    },
    {
        id: 'surveyor-photos',
        title: 'Working with Photos',
        icon: 'camera',
        roles: ['surveyor', 'admin'],
        content: `**Adding Photos:**

1. Tap **"Add Photo"** button
2. Choose:
   • **Take Photo** - Use camera (mobile only)
   • **Choose from Gallery** - Pick existing photo

**Photo Features:**

📸 **Lightbox Viewer** (Tap any thumbnail)
• Full-screen view
• Pinch to zoom (2x-10x)
• Swipe left/right to view more
• Delete button in header
• Shows "Photo 1 of 5" counter

📏 **Auto-Compression** (Mobile)
• Photos compressed to max 1920px width
• Saves data and speeds up upload
• Quality: 80% (good balance)

☁️ **Smart Upload:**
• Mobile: Photos saved locally, uploaded when you submit
• Web: Photos uploaded immediately
• Offline: Photos queue for upload when online

**Best Practices:**
✓ Take clear, well-lit photos
✓ Capture the issue from multiple angles
✓ Include asset nameplate/label if visible
✓ Max 10 photos per asset (usually 2-3 is enough)`
    },
    {
        id: 'surveyor-save-submit',
        title: 'Save vs Submit - What\'s the Difference?',
        icon: 'help-circle',
        roles: ['surveyor', 'admin'],
        content: `**Save & Exit:**
• Saves all progress automatically
• Status stays **"In Progress"**
• Survey remains editable
• You can resume anytime
• No Excel report generated
• Not sent to reviewers

**Submit Survey:**
• Changes status to **"Submitted"**
• Generates Excel report with photos
• 🔒 **Survey LOCKS** (you can't edit anymore)
• Sent to reviewers for approval
• Only Admin can unlock/edit

**When to Use Each:**

Use **Save & Exit** if:
• You need to continue tomorrow
• You're waiting for more information
• Survey is not complete yet

Use **Submit** when:
• All assets are inspected
• All photos uploaded
• All remarks added
• You're ready for review

**Important:**
⚠️ Once you submit, you CANNOT edit unless Admin unlocks it
✓ Review everything before submitting
✓ Check validation errors (red text)`
    },
    {
        id: 'surveyor-validation',
        title: 'Understanding Validation Errors',
        icon: 'alert-circle',
        roles: ['surveyor', 'admin'],
        content: `**Real-Time Validation:**

Red error messages appear instantly when:

1. **Quantity Working > Quantity Installed**
   • Error: "Cannot exceed installed qty (10)"
   • Fix: Reduce working quantity

2. **Negative Numbers**
   • Error: "Must be a positive number"
   • Fix: Enter 0 or positive value

3. **Missing Remarks** (when condition is Unsatisfactory)
   • Error: "Remarks required for this condition"
   • Fix: Add explanation of the issue

4. **Missing Required Fields**
   • Condition Rating - Must select A-G
   • Overall Condition - Must select one

**Before Submitting:**

App validates ALL assets and shows:
• "3 of 10 assets are incomplete"
• List of missing fields
• Option to "Review" or "Submit Anyway"

**Tips:**
✓ Fix errors as you go (easier than at the end)
✓ Look for red text under fields
✓ Required fields marked with *`
    },

    // ═══════════════════════════════════════════════════════════
    // ADMIN SECTIONS
    // ═══════════════════════════════════════════════════════════
    {
        id: 'admin-dashboard',
        title: 'Admin Dashboard Overview',
        icon: 'view-dashboard',
        roles: ['admin'],
        content: `**Survey Management Tab:**

**Site Stats:**
• Total Assets count
• Number of Locations
• Number of Service Lines
• Workbooks available

**Survey Status Breakdown:**
• Draft - Created but not started
• In Progress - Currently being filled
• Submitted - Awaiting review
• Under Review - Being reviewed
• Completed - Finalized

**Quick Actions:**
• 📊 **Generate Survey** - Create new survey
• 📥 **Import Assets** - Upload Excel with assets
• 📤 **Export All** - Download ZIP of all surveys
• 👥 **Manage Users** - Add/edit surveyors

**What You Can Do:**
✓ View all surveys (regardless of status)
✓ Edit locked surveys (override lock mode)
✓ Delete surveys
✓ Generate reports
✓ Monitor sync status`
    },
    {
        id: 'admin-surveys',
        title: 'Creating & Managing Surveys',
        icon: 'file-document-plus',
        roles: ['admin'],
        content: `**Option 1: Generate Surveys Automatically**

1. Go to **Survey Management** tab
2. Select a **Site**
3. Tap **"Generate Survey"**
4. System creates surveys for each Location + Service Line combo
5. Assign to surveyors (optional)

**Option 2: Manual Creation**

1. Go to **Home** tab
2. Select site
3. Tap **"+ New Survey"**
4. Fill in:
   • Site/Location
   • Service Line
   • Surveyor Name
5. Tap **"Start Survey"**

**Managing Surveys:**

**Edit Locked Survey:**
1. Find submitted/completed survey
2. Tap survey card
3. Tap **"Edit"** (Admin only)
4. Make changes
5. Status reverts to "In Progress"

**Delete Survey:**
1. Long-press survey card
2. Select **"Delete"**
3. Confirm deletion
⚠️ This cannot be undone

**Bulk Operations:**
• Export All: Download ZIP of all surveys
• Delete All: Clear all surveys for a site
• Import: Upload survey data from Excel`
    },
    {
        id: 'admin-users',
        title: 'Managing Users',
        icon: 'account-multiple',
        roles: ['admin'],
        content: `**User Management Screen:**

**Creating Users:**

1. Go to **User Management** tab
2. Tap **"+ Add User"**
3. Fill in:
   • Email (must be unique)
   • Password (min 6 characters)
   • Name
   • Role: Surveyor / Reviewer / Admin
   • Organization (for reviewers: MAG/CIT/DGDA)
4. Tap **"Create User"**

**User Roles:**

👷 **Surveyor**
• Can create and fill surveys
• Cannot edit after submission
• Sees only their assigned surveys (optional)

👁️ **Reviewer** (MAG/CIT/DGDA)
• Can review submitted surveys
• Can add comments and photos
• Can approve or return surveys

👨‍💼 **Admin**
• Full access to everything
• Can edit locked surveys
• Can manage users and sites
• Can generate reports

**Editing Users:**
1. Find user in list
2. Tap user card
3. Edit details
4. Tap **"Save"**

**Deleting Users:**
1. Long-press user card
2. Select **"Delete"**
3. Confirm
⚠️ Surveys created by this user will remain`
    },
    {
        id: 'admin-excel',
        title: 'Excel Import & Export',
        icon: 'microsoft-excel',
        roles: ['admin'],
        content: `**Importing Assets from Excel:**

1. Go to **Survey Management**
2. Select site
3. Tap **"Import Assets"**
4. Select Excel file with columns:
   • ref_code
   • asset_name
   • building / location
   • service_line
   • description (optional)
5. System validates and imports

**Exporting Surveys to Excel:**

**Single Survey:**
1. Find survey in list
2. Tap **"Export"** button
3. Excel downloads with:
   • All asset data
   • Condition ratings (color-coded)
   • Photos embedded in cells
   • Review comments (MAG/CIT/DGDA)

**All Surveys (ZIP):**
1. Go to **Survey Management**
2. Select site
3. Tap **"Export All to ZIP"**
4. ZIP file structure:
   \`\`\`
   SiteName/
     Location1/
       HVAC.xlsx
       Plumbing.xlsx
     Location2/
       ...
   \`\`\`

**Excel Format:**

Photos appear in:
• Column S - Surveyor photos
• Column V - Audit photos (MAG/CIT/DGDA)

Multiple photos stack vertically in one cell`
    },

    // ═══════════════════════════════════════════════════════════
    // REVIEWER SECTIONS
    // ═══════════════════════════════════════════════════════════
    {
        id: 'reviewer-dashboard',
        title: 'Reviewer Dashboard',
        icon: 'magnify',
        roles: ['reviewer', 'admin'],
        content: `**Your Dashboard:**

**Stats Cards:**
• Pending Review - Surveys waiting for you
• In Review - Surveys you're working on
• Completed - Surveys you approved

**Survey List:**

Filters:
• All / Pending / In Review / Completed
• Search by location, trade, or surveyor

**What You See:**
• Survey details (site, location, trade)
• Surveyor name
• Date submitted
• Current status
• Quick actions (Review, Approve)

**Your Review Type:**

Your organization determines your review column:
• **MAG** → Comments in "MAG Comments" column
• **CIT** → Comments in "CIT Verification/Comments" column
• **DGDA** → Comments in "DGDA Comments" column

**Starting a Review:**
1. Tap survey card
2. Review opens automatically
3. Status may change to "Under Review"`
    },
    {
        id: 'reviewer-review',
        title: 'How to Review Surveys',
        icon: 'clipboard-text',
        roles: ['reviewer', 'admin'],
        content: `**Review Process:**

1. **Open Survey**
   • Tap survey from Reviewer Dashboard
   • You'll see all inspected assets

2. **Review Each Asset**
   • Check condition ratings
   • View photos (tap to zoom)
   • Read surveyor remarks
   • Verify quantities

3. **Add Your Comments**
   • Tap **"Add Review"** button
   • Select your reviewer type (MAG/CIT/DGDA)
   • Enter comments:
     - Note any issues
     - Request clarifications
     - Add observations
   • Upload photos (optional)

4. **Make Decision**

   **Option A: Approve**
   • Tap **"Approve"** button
   • Status → "Completed"
   • Survey locks for everyone

   **Option B: Request Changes**
   • Add comments explaining what needs fixing
   • Tap **"Return to Surveyor"**
   • Status → "In Progress" (unlocked)
   • Surveyor can edit and re-submit

**Multi-Stage Review:**

If multiple reviewer types are involved:
• Each reviewer adds comments independently
• All comments appear in Excel export
• Final approval can be by any reviewer`
    },
    {
        id: 'reviewer-photos',
        title: 'Adding Review Photos',
        icon: 'camera-plus',
        roles: ['reviewer', 'admin'],
        content: `**Why Add Review Photos?**

• Document issues found during review
• Show additional angles/perspectives
• Provide visual evidence of concerns
• Help surveyors understand what to fix

**How to Add:**

1. Tap **"Add Review"** on asset
2. Scroll to **"Photos"** section
3. Tap **"Add Photo"**
4. Choose camera or gallery
5. Upload up to 5 photos
6. Photos appear in your review section

**Where They Appear:**

In Excel export:
• Your photos go to Column V ("MAG Pictures")
• Separated from surveyor photos (Column S)
• Labeled by reviewer type

**Best Practices:**
✓ Only add photos if they add value
✓ Caption photos in comments section
✓ Keep file sizes reasonable (auto-compressed)
✓ Show the issue clearly`
    },

    // ═══════════════════════════════════════════════════════════
    // COMMON / FAQ SECTIONS
    // ═══════════════════════════════════════════════════════════
    {
        id: 'faq-offline',
        title: 'Working Offline',
        icon: 'wifi-off',
        roles: ['surveyor', 'reviewer', 'admin'],
        content: `**The App Works Offline! ✓**

**What Works Offline:**
• Create surveys
• Fill inspections
• Capture photos
• Save progress
• View existing data

**What Requires Internet:**
• Initial login
• Downloading assets from server
• Uploading photos to server
• Submitting surveys (for sync)
• Generating Excel (backend API)

**How It Works:**

1. **Work Offline:**
   • Fill surveys normally
   • Photos saved locally
   • Data stored on device

2. **Auto-Sync When Online:**
   • App detects internet connection
   • Automatically uploads all changes
   • Photos sent to backend
   • UUIDs replace local file paths

3. **Manual Sync:**
   • Go to **Profile** tab
   • Tap **"Sync Data"** button
   • Watch sync progress

**Sync Indicators:**

• 🟢 Green: All synced
• 🟡 Yellow: Sync in progress
• 🔴 Red: Sync failed (will retry)

**Tips:**
✓ Sync before going to remote sites
✓ Download all assets in advance
✓ Submit surveys when back online`
    },
    {
        id: 'faq-troubleshooting',
        title: 'Troubleshooting Common Issues',
        icon: 'tools',
        roles: ['surveyor', 'reviewer', 'admin'],
        content: `**Issue: Photos Not Uploading**

Fix:
1. Check internet connection
2. Go to Profile → Tap "Sync Data"
3. Wait for sync to complete
4. If still failing, try again later (queued for retry)

---

**Issue: Can't Submit Survey**

Possible Causes:
• Missing required fields (Condition Rating, Overall Condition)
• Validation errors (red text)
• No internet (for web platform)

Fix:
1. Scroll through all assets
2. Look for red error text
3. Fill in missing fields
4. Try submitting again

---

**Issue: Survey Locked, Can't Edit**

This is NORMAL if:
• Status = "Submitted" or "Completed"
• You're not an Admin

Fix:
• Contact Admin to unlock survey
• Admin can edit and change status back to "In Progress"

---

**Issue: Photos Missing in Excel**

Possible Causes:
• Photos not synced yet
• Photo files deleted from server
• Network error during upload

Fix:
1. Check photos display in app (tap thumbnail)
2. If showing, trigger sync: Profile → "Sync Data"
3. Wait for upload to complete
4. Re-export Excel

---

**Issue: Excel Download Fails**

Fix:
1. Check internet connection
2. Try smaller export (single survey instead of ZIP)
3. Wait a few minutes and retry
4. Contact support if persists`
    },
    {
        id: 'faq-status',
        title: 'Understanding Survey Statuses',
        icon: 'information',
        roles: ['surveyor', 'reviewer', 'admin'],
        content: `**Status Meanings:**

🟡 **Draft**
• Survey created but not started
• No inspections yet
• Admin can delete

🔵 **In Progress**
• Surveyor is working on it
• Can be saved and resumed
• NOT locked, fully editable

🟠 **Submitted**
• Surveyor finished and submitted
• 🔒 LOCKED for surveyor
• Awaiting reviewer
• Admin can still edit

🟣 **Under Review**
• Reviewer is working on it
• Reviewer can add comments
• Admin can still edit

🟢 **Completed**
• Approved by reviewer
• Final state
• 🔒 LOCKED for everyone except Admin
• Ready for archive/export

🔴 **Returned** (if applicable)
• Reviewer sent back for changes
• Status changed back to "In Progress"
• Unlocked for surveyor to edit

**Status Flow:**

\`\`\`
Draft → In Progress → Submitted → Under Review → Completed
           ↑              ↓
           └──── Returned ───┘
\`\`\``
    },
];

export default function HelpScreen() {
    const theme = useTheme();
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

    // Filter help content by user role
    const userRole = user?.role || 'surveyor';
    const filteredContent = HELP_CONTENT.filter(section =>
        section.roles.includes(userRole) &&
        (searchQuery === '' ||
         section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
         section.content.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Group by category
    const surveyorSections = filteredContent.filter(s => s.id.startsWith('surveyor-'));
    const adminSections = filteredContent.filter(s => s.id.startsWith('admin-'));
    const reviewerSections = filteredContent.filter(s => s.id.startsWith('reviewer-'));
    const faqSections = filteredContent.filter(s => s.id.startsWith('faq-'));

    const toggleSection = (id: string) => {
        setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const renderMarkdown = (content: string) => {
        // Simple markdown-like rendering
        return content.split('\n').map((line, index) => {
            // Headers
            if (line.startsWith('**') && line.endsWith('**')) {
                const text = line.replace(/\*\*/g, '');
                return (
                    <Text key={index} style={[Typography.labelLg, { color: theme.colors.primary, marginTop: 12, marginBottom: 4 }]}>
                        {text}
                    </Text>
                );
            }
            // Bold
            if (line.includes('**')) {
                const parts = line.split('**');
                return (
                    <Text key={index} style={[Typography.bodyMd, { color: theme.colors.onSurface, marginBottom: 4 }]}>
                        {parts.map((part, i) => i % 2 === 1 ? <Text key={i} style={{ fontWeight: '700' }}>{part}</Text> : part)}
                    </Text>
                );
            }
            // Bullets
            if (line.trim().startsWith('•') || line.trim().startsWith('✓') || line.trim().startsWith('⚠️') || line.trim().startsWith('🔒')) {
                return (
                    <Text key={index} style={[Typography.bodyMd, { color: theme.colors.onSurface, marginLeft: 16, marginBottom: 2 }]}>
                        {line.trim()}
                    </Text>
                );
            }
            // Code blocks
            if (line.trim().startsWith('```')) {
                return null; // Skip code fence
            }
            // Empty line
            if (line.trim() === '') {
                return <View key={index} style={{ height: 8 }} />;
            }
            // Regular text
            return (
                <Text key={index} style={[Typography.bodyMd, { color: theme.colors.onSurface, marginBottom: 4 }]}>
                    {line}
                </Text>
            );
        });
    };

    const renderSection = (section: HelpSection) => (
        <List.Accordion
            key={section.id}
            title={section.title}
            left={props => <List.Icon {...props} icon={section.icon} color={theme.colors.primary} />}
            expanded={expandedSections[section.id]}
            onPress={() => toggleSection(section.id)}
            style={{ backgroundColor: theme.colors.surface }}
            titleStyle={[Typography.labelLg, { color: theme.colors.onSurface }]}
        >
            <View style={{ padding: 16, backgroundColor: theme.colors.surfaceVariant }}>
                {renderMarkdown(section.content)}
            </View>
        </List.Accordion>
    );

    const renderCategory = (title: string, sections: HelpSection[], icon: string) => {
        if (sections.length === 0) return null;
        return (
            <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 }}>
                    <MaterialCommunityIcons name={icon as any} size={24} color={theme.colors.primary} />
                    <Text style={[Typography.h3, { color: theme.colors.onSurface, marginLeft: 8 }]}>{title}</Text>
                </View>
                <Surface style={{ backgroundColor: theme.colors.surface }} elevation={1}>
                    {sections.map(renderSection)}
                </Surface>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="help-circle" size={28} color={theme.colors.primary} />
                    <Text style={[Typography.h2, { color: theme.colors.onSurface, marginLeft: 12 }]}>
                        How to Use
                    </Text>
                </View>
                <Chip mode="outlined" style={{ borderColor: theme.colors.primary }}>
                    {userRole === 'admin' ? '👨‍💼 Admin' : userRole === 'reviewer' ? '👁️ Reviewer' : '👷 Surveyor'}
                </Chip>
            </View>

            {/* Search */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                <Searchbar
                    placeholder="Search help topics..."
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={{ backgroundColor: theme.colors.surface, borderRadius: Radius.md }}
                    elevation={1}
                />
            </View>

            {/* Content */}
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {searchQuery === '' && (
                    <View style={{ padding: 16, marginBottom: 8 }}>
                        <Surface style={[styles.infoCard, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
                            <MaterialCommunityIcons name="lightbulb" size={24} color={theme.colors.primary} />
                            <Text style={[Typography.bodyMd, { color: theme.colors.onSurface, marginLeft: 12, flex: 1 }]}>
                                Tap any topic below to expand and view step-by-step instructions
                            </Text>
                        </Surface>
                    </View>
                )}

                {surveyorSections.length > 0 && renderCategory('For Surveyors', surveyorSections, 'clipboard-check')}
                {adminSections.length > 0 && renderCategory('For Admins', adminSections, 'shield-account')}
                {reviewerSections.length > 0 && renderCategory('For Reviewers', reviewerSections, 'magnify')}
                {faqSections.length > 0 && renderCategory('Common Questions', faqSections, 'frequently-asked-questions')}

                {filteredContent.length === 0 && (
                    <View style={{ padding: 32, alignItems: 'center' }}>
                        <MaterialCommunityIcons name="text-search" size={64} color={theme.colors.onSurfaceVariant} />
                        <Text style={[Typography.h3, { color: theme.colors.onSurface, marginTop: 16, textAlign: 'center' }]}>
                            No Results Found
                        </Text>
                        <Text style={[Typography.bodyMd, { color: theme.colors.onSurfaceVariant, marginTop: 8, textAlign: 'center' }]}>
                            Try a different search term
                        </Text>
                    </View>
                )}

                {/* Contact Support */}
                <View style={{ padding: 16, marginTop: 16, marginBottom: 32 }}>
                    <Surface style={[styles.contactCard, { backgroundColor: theme.colors.tertiaryContainer }]} elevation={1}>
                        <MaterialCommunityIcons name="email" size={32} color={theme.colors.tertiary} />
                        <View style={{ marginLeft: 16, flex: 1 }}>
                            <Text style={[Typography.labelLg, { color: theme.colors.onSurface }]}>
                                Still Need Help?
                            </Text>
                            <Text style={[Typography.bodyMd, { color: theme.colors.onSurfaceVariant, marginTop: 4 }]}>
                                Contact your administrator or IT support for assistance
                            </Text>
                        </View>
                    </Surface>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    scrollView: {
        flex: 1,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: Radius.md,
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: Radius.lg,
    },
});
