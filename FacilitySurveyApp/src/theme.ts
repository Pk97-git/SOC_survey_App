import { MD3LightTheme } from 'react-native-paper';
import { Colors, Radius } from './constants/design';

// Gulaid Holding · CIT Operations — App Theme
// Built on MD3 Light with the Gulaid brand palette.
// All color values reference design tokens — do not hardcode here.

export const theme = {
    ...MD3LightTheme,
    roundness: Radius.md, // 12 — clean, professional cards

    colors: {
        ...MD3LightTheme.colors,

        // Primary: CIT Green — brand primary
        primary: Colors.green[500],             // '#56896E'
        onPrimary: Colors.neutral[0],           // '#FFFFFF'
        primaryContainer: Colors.green[100],    // '#D9E6DF'
        onPrimaryContainer: Colors.green[800],  // '#22372C'

        // Secondary: Deep Navy — brand depth
        secondary: Colors.navy[800],            // '#1A2332'
        onSecondary: Colors.neutral[0],
        secondaryContainer: Colors.navy[100],   // '#E2E8F0'
        onSecondaryContainer: Colors.navy[900], // '#0F172A'

        // Tertiary: CIT Gold — brand accent
        tertiary: Colors.gold[400],             // '#C6A050'
        onTertiary: Colors.neutral[0],
        tertiaryContainer: Colors.gold[100],    // '#F2EEDA'
        onTertiaryContainer: Colors.gold[600],  // '#7A602B'

        // Backgrounds
        background: Colors.neutral[50],         // '#FAF9F6' — warm off-white
        onBackground: Colors.neutral[800],      // '#1C1917'
        surface: Colors.neutral[0],             // '#FFFFFF'
        onSurface: Colors.neutral[800],         // '#1C1917'
        surfaceVariant: Colors.neutral[100],    // '#F5F4F1'
        onSurfaceVariant: Colors.neutral[600],  // '#57534E'

        // Borders
        outline: Colors.neutral[400],           // '#A8A29E' — removes purple-grey tint
        outlineVariant: Colors.neutral[200],    // '#E7E5E4' — subtle card borders

        // Error
        error: Colors.status.errorRed,          // '#B91C1C'
        onError: Colors.neutral[0],
        errorContainer: Colors.status.errorBg,  // '#FEE2E2'
        onErrorContainer: Colors.status.errorRed,

        // Elevation tones — warm neutral scale
        elevation: {
            level0: 'transparent',
            level1: Colors.neutral[50],          // '#FAF9F6'
            level2: Colors.neutral[100],         // '#F5F4F1'
            level3: Colors.neutral[200],         // '#E7E5E4'
            level4: Colors.neutral[300],         // '#D6D3D1'
            level5: Colors.neutral[400],         // '#A8A29E'
        },
    },
};
