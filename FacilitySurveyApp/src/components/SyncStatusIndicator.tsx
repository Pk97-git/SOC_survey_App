import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface, useTheme, IconButton, Badge } from 'react-native-paper';
import { syncService } from '../services/syncService';

interface SyncStatusProps {
    compact?: boolean;
}

export default function SyncStatusIndicator({ compact = false }: SyncStatusProps) {
    const theme = useTheme();
    const [syncStatus, setSyncStatus] = React.useState(syncService.getStatus());

    React.useEffect(() => {
        const unsubscribe = syncService.subscribe((status) => {
            setSyncStatus(status);
        });
        return unsubscribe;
    }, []);

    const handleManualSync = async () => {
        try {
            await syncService.manualSync();
        } catch (error: any) {
            console.error('Manual sync failed:', error);
        }
    };

    if (compact) {
        return (
            <View style={styles.compactContainer}>
                <View style={[styles.statusDot, {
                    backgroundColor: syncStatus.isOnline ? '#22c55e' : '#ef4444'
                }]} />
                {syncStatus.pendingUploads > 0 && (
                    <Badge size={16} style={{ backgroundColor: theme.colors.error }}>
                        {syncStatus.pendingUploads}
                    </Badge>
                )}
            </View>
        );
    }

    return (
        <Surface style={[styles.container, { backgroundColor: theme.colors.surfaceVariant }]} elevation={1}>
            <View style={styles.content}>
                <View style={styles.statusRow}>
                    <View style={[styles.statusDot, {
                        backgroundColor: syncStatus.isOnline ? '#22c55e' : '#ef4444'
                    }]} />
                    <Text style={{
                        color: syncStatus.isOnline ? '#22c55e' : '#ef4444',
                        fontWeight: '700',
                        fontSize: 12
                    }}>
                        {syncStatus.isOnline ? 'ONLINE' : 'OFFLINE'}
                    </Text>
                </View>

                {syncStatus.isSyncing && (
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                        Syncing...
                    </Text>
                )}

                {!syncStatus.isSyncing && syncStatus.lastSync && (
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }}>
                        Last sync: {new Date(syncStatus.lastSync).toLocaleTimeString()}
                    </Text>
                )}

                {syncStatus.pendingUploads > 0 && (
                    <View style={styles.pendingBadge}>
                        <Badge size={20} style={{ backgroundColor: theme.colors.error }}>
                            {syncStatus.pendingUploads}
                        </Badge>
                        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, marginLeft: 6 }}>
                            pending
                        </Text>
                    </View>
                )}
            </View>

            {syncStatus.isOnline && !syncStatus.isSyncing && (
                <IconButton
                    icon="sync"
                    size={20}
                    iconColor={theme.colors.primary}
                    onPress={handleManualSync}
                />
            )}
        </Surface>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
    },
    content: {
        flex: 1,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    pendingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    compactContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
});
