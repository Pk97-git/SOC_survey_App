import { DefaultTheme } from 'react-native-paper';

export const theme = {
    ...DefaultTheme,
    dark: true,
    colors: {
        ...DefaultTheme.colors,
        primary: '#FFFFFF', // White for high contrast
        accent: '#FBBF24', // Gold Accent
        background: '#000000', // Pure Black
        surface: '#121212', // Slightly Lighter Black for Cards
        text: '#FFFFFF',
        disabled: '#666666',
        placeholder: '#A3A3A3',
        backdrop: '#000000CC',
        onSurface: '#FFFFFF',
        notification: '#CF6679',
    },
    roundness: 12,
};
