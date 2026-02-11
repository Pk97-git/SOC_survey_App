import { MD3LightTheme, configureFonts } from 'react-native-paper';

export const theme = {
    ...MD3LightTheme,
    colors: {
        ...MD3LightTheme.colors,
        primary: '#2563EB', // Royal Blue
        onPrimary: '#FFFFFF',
        primaryContainer: '#DBEAFE',
        onPrimaryContainer: '#1E40AF',
        secondary: '#10B981', // Emerald Green
        secondaryContainer: '#D1FAE5',
        onSecondaryContainer: '#065F46',
        tertiary: '#F59E0B', // Amber
        background: '#F8FAFC', // Very light grey/blue
        surface: '#FFFFFF',
        surfaceVariant: '#F1F5F9', // Slate 100
        error: '#EF4444',
        onSurface: '#1E293B', // Slate 800
        elevation: {
            level0: 'transparent',
            level1: '#F1F5F9',
            level2: '#E2E8F0',
            level3: '#CBD5E1',
            level4: '#94A3B8',
            level5: '#64748B',
        },
    },
    roundness: 12,
};
