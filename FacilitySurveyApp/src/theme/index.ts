import { MD3LightTheme } from 'react-native-paper';

// CIT Group Ltd — Corporate Brand Theme
// Primary: Dark Maroon (#8B0000) — matches existing Excel report headers
// Light background for professional enterprise readability

export const theme = {
    ...MD3LightTheme,
    dark: false,
    colors: {
        ...MD3LightTheme.colors,

        // Brand primary — CIT maroon
        primary: '#8B0000',
        onPrimary: '#FFFFFF',
        primaryContainer: '#FFD9D9',
        onPrimaryContainer: '#5C0000',

        // Secondary — muted corporate gold
        secondary: '#C0963C',
        onSecondary: '#FFFFFF',
        secondaryContainer: '#FFF0D0',
        onSecondaryContainer: '#7A5C00',

        // Tertiary — neutral slate
        tertiary: '#5C6B7A',
        onTertiary: '#FFFFFF',
        tertiaryContainer: '#D8E5F5',
        onTertiaryContainer: '#1A2D3E',

        // Backgrounds — light enterprise theme
        background: '#F5F5F5',
        onBackground: '#1A1A1A',
        surface: '#FFFFFF',
        onSurface: '#1A1A1A',
        surfaceVariant: '#F0EDED',
        onSurfaceVariant: '#6B7280',

        // Outline
        outline: '#D1D5DB',
        outlineVariant: '#E5E7EB',

        // Error
        error: '#DC2626',
        onError: '#FFFFFF',
        errorContainer: '#FECACA',
        onErrorContainer: '#7F1D1D',

        // Misc
        shadow: '#000000',
        scrim: '#000000',
        inverseSurface: '#2C2C2C',
        inverseOnSurface: '#F5F5F5',
        inversePrimary: '#FFB3B3',

        // Legacy compatibility
        accent: '#C0963C',
        disabled: '#D1D5DB',
        placeholder: '#9CA3AF',
        backdrop: '#00000066',
        notification: '#DC2626',
        text: '#1A1A1A',
    },
    roundness: 12,
};
