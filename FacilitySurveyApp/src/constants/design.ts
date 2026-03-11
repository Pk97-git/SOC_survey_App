import { Platform } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// Gulaid Holding · CIT Operations — Design Token System
// Single source of truth for all visual constants.
// Every screen and component imports from here — no hardcoded values elsewhere.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Brand Color Palette ────────────────────────────────────────────────────

export const Colors = {

    // Green — primary brand color (CIT Official)
    green: {
        50: '#F0F5F2',
        100: '#D9E6DF',
        200: '#B8CDBE',
        300: '#94B39F',
        400: '#739B82',
        500: '#56896E',   // PRIMARY — CIT brand
        600: '#456E58',   // Pressed / active
        700: '#345242',   // Deep
        800: '#22372C',
        900: '#111B16',
    },

    // Gold — corporate accent (Gulaid Holding / CIT)
    gold: {
        50: '#FAFAF5',
        100: '#F2EEDA',
        300: '#DEBB6F',
        400: '#C6A050',   // SECONDARY — CIT gold accent
        500: '#A3813B',
        600: '#7A602B',
    },

    // Navy — depth and professionalism for text
    navy: {
        50: '#F0F4F8',
        100: '#E2E8F0',
        200: '#CBD5E1',
        600: '#334155',
        700: '#1E293B',
        800: '#1A2332',   // Deep navy — primary brand text
        900: '#0F172A',
    },

    // Warm Neutrals — aligned with the off-white background
    neutral: {
        0: '#FFFFFF',
        50: '#FAF9F6',   // App background
        100: '#F5F4F1',
        200: '#E7E5E4',   // Borders, dividers
        300: '#D6D3D1',
        400: '#A8A29E',
        500: '#78716C',
        600: '#57534E',   // Subdued text
        700: '#44403C',
        800: '#1C1917',   // Warm black (primary text)
        900: '#0C0A09',
    },

    // ─── Semantic Status Colors ──────────────────────────────────────────────
    // Replace ALL hardcoded greens, blues, reds, ambers throughout the app

    status: {
        successGreen: '#15803D',   // Replaces #10B981, #22c55e, #4CAF50
        successBg: '#DCFCE7',
        warningAmber: '#B45309',   // Replaces #f59e0b
        warningBg: '#FEF3C7',
        infoBlue: '#1D4ED8',   // Replaces #3b82f6, #1E88E5
        infoBg: '#DBEAFE',
        errorRed: '#B91C1C',   // Replaces #ef4444, #FF5722, #DC2626
        errorBg: '#FEE2E2',
        neutralGray: '#57534E',   // Replaces #64748B, #94A3B8, 'gray'
        neutralBg: '#F5F4F1',
    },

    // ─── Survey / Inspection Status Styles ──────────────────────────────────
    // Used by StatusBadge in Reviewer, Reports, SurveyManagement screens

    surveyStatus: {
        submitted: { bg: '#FEF3C7', text: '#B45309', border: '#D4A843' },  // Gold = pending review
        under_review: { bg: '#DBEAFE', text: '#1D4ED8', border: '#93C5FD' },  // Blue = being reviewed
        completed: { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC' },  // Green = approved
        in_progress: { bg: '#F0F5F2', text: '#56896E', border: '#B8CDBE' },  // Green = in progress
        draft: { bg: '#F5F4F1', text: '#57534E', border: '#D6D3D1' },  // Gray = draft
        approved: { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC' },  // Alias for completed
        rejected: { bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' },  // Red = rejected
    } as Record<string, { bg: string; text: string; border: string }>,

    // ─── Condition Rating Colors (AssetInspectionCard A–G) ──────────────────
    conditionRating: {
        A: '#15803D',   // New — deep green
        B: '#4D7C0F',   // Excellent — lime green
        C: '#A16207',   // Good — yellow-green
        D: '#B45309',   // Average — amber
        E: '#C2410C',   // Poor — orange
        F: '#B91C1C',   // Very Poor — red
        G: '#57534E',   // TBD / Unknown — neutral grey
    },
};

// ─── Spacing Scale (8pt grid) ────────────────────────────────────────────────

export const Spacing = {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
    20: 80,
    24: 96,
};

// Named layout aliases used across screens
export const Layout = {
    screenPaddingH: Spacing[5],    // 20 — horizontal screen edge padding
    screenPaddingV: Spacing[5],    // 20 — vertical screen edge padding
    cardPadding: Spacing[6],    // 24 — inside card padding
    cardGap: Spacing[4],    // 16 — gap between cards
    sectionGap: Spacing[8],    // 32 — gap between major sections
    itemGap: Spacing[3],    // 12 — gap between list items
    headerHeight: 56,            // Standard header height
};

// ─── Border Radius Scale ─────────────────────────────────────────────────────

export const Radius = {
    xs: 4,     // Badges, chips, tight elements
    sm: 8,     // Compact buttons, input corners
    md: 12,    // Standard cards, dropdowns — theme roundness
    lg: 16,    // Site cards, survey cards
    xl: 20,    // Dashboard stat cards, form cards
    xxl: 24,    // Modal sheets, large cards
    full: 9999,  // Pills, status dots
};

// ─── Shadow / Elevation Presets ──────────────────────────────────────────────

export const Shadows = {
    none: {
        elevation: 0,
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
    },
    card: {
        elevation: 2,
        shadowColor: '#1C1917',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
    },
    header: {
        elevation: 3,
        shadowColor: '#1C1917',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
    },
    fab: {
        elevation: 6,
        shadowColor: Colors.green[600],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
    },
    modal: {
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
    },
};

// ─── Typography Scale ────────────────────────────────────────────────────────

export const Typography = {
    // Display (hero sections, login)
    displayLg: { fontSize: 32, fontWeight: '900' as const, letterSpacing: -1 },
    displayMd: { fontSize: 28, fontWeight: '900' as const, letterSpacing: -0.5 },
    displaySm: { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.3 },

    // Headings
    h1: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.3 },
    h2: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.2 },
    h3: { fontSize: 18, fontWeight: '700' as const },
    h4: { fontSize: 16, fontWeight: '700' as const },

    // Body text
    bodyLg: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
    bodyMd: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
    bodySm: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
    bodyXs: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },

    // Labels / UI text
    labelLg: { fontSize: 14, fontWeight: '600' as const },
    labelMd: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.3 },
    labelSm: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.5 },
    labelXs: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const },

    // Monospace (GPS coords, codes)
    mono: {
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },

    // Stat numbers (dashboard KPIs)
    statXl: { fontSize: 32, fontWeight: '800' as const },
    statLg: { fontSize: 24, fontWeight: '800' as const },
    statMd: { fontSize: 20, fontWeight: '700' as const },
};
