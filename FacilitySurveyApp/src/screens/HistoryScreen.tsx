import React from 'react';
import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

export default function HistoryScreen() {
    const theme = useTheme();
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
            <Text variant="headlineMedium" style={{ color: theme.colors.onSurface }}>Survey History</Text>
            <Text style={{ color: theme.colors.secondary, marginTop: 10 }}>Past surveys and drafts will appear here.</Text>
        </View>
    );
}
