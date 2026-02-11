import { MD3LightTheme, configureFonts } from 'react-native-paper';

export const theme = {
    ...MD3LightTheme,
    colors: {
        ...MD3LightTheme.colors,
        primary: '#800000', // Maroon
        onPrimary: '#FFFFFF',
        primaryContainer: '#FFD7D7', // Light Maroon
        onPrimaryContainer: '#460000',
        secondary: '#1E293B', // Slate 800 (Professional)
        secondaryContainer: '#E2E8F0',
        onSecondaryContainer: '#0F172A',
        tertiary: '#B45309', // Dark Amber / Gold
        onTertiary: '#FFFFFF',
        tertiaryContainer: '#FEF3C7',
        background: '#FAF9F6', // Off-white / Cream
        surface: '#FFFFFF',
        surfaceVariant: '#F3F1ED', // Neutral warm grey
        onSurface: '#1C1917', // Warm black
        onSurfaceVariant: '#57534E',
        outline: '#79747E', // Darker grey for better visibility
        error: '#B91C1C',
        elevation: {
            level0: 'transparent',
            level1: '#F5F5F4',
            level2: '#E7E5E4',
            level3: '#D6D3D1',
            level4: '#A8A29E',
            level5: '#78716C',
        },
    },
    roundness: 10, // Modern but professional
};
