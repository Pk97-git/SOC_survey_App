import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter, StyleSheet } from 'react-native';
import { Snackbar, useTheme, Text } from 'react-native-paper';

export const SyncToast = () => {
    const [visible, setVisible] = useState(false);
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<'syncing' | 'online' | 'offline' | 'error' | 'synced'>('online');
    const theme = useTheme();

    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener('syncStatus', (event) => {
            setMessage(event.message);
            setStatus(event.status);
            setVisible(true);
        });

        return () => {
            subscription.remove();
        };
    }, []);

    const onDismissSnackBar = () => setVisible(false);

    // Dynamic styles based on status
    const getBackgroundColor = () => {
        switch (status) {
            case 'error': return theme.colors.error;
            case 'syncing': return theme.colors.primary;
            case 'offline': return theme.colors.secondary;
            case 'synced': return theme.colors.primaryContainer; // Success-ish
            default: return theme.colors.inverseSurface;
        }
    };

    const getTextColor = () => {
        switch (status) {
            case 'synced': return theme.colors.onPrimaryContainer;
            default: return theme.colors.inverseOnSurface;
        }
    };

    return (
        <Snackbar
            visible={visible}
            onDismiss={onDismissSnackBar}
            duration={3000}
            style={{ backgroundColor: getBackgroundColor(), marginBottom: 60 }} // Lift up slightly for bottom tabs
            action={{
                label: 'Dismiss',
                onPress: () => {
                    setVisible(false);
                },
                textColor: getTextColor()
            }}
        >
            <Text style={{ color: getTextColor() }}>{message}</Text>
        </Snackbar>
    );
};
