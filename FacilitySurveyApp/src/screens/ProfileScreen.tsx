import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, IconButton, Surface, useTheme, Avatar, Divider } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
    const { logout, user } = useAuth();
    const theme = useTheme();

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: logout
                }
            ]
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.screenTitle, { color: theme.colors.onBackground }]}>My Profile</Text>
            <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
                <View style={styles.header}>
                    <Avatar.Text
                        size={80}
                        label={user?.fullName?.substring(0, 2).toUpperCase() || 'US'}
                        style={{ backgroundColor: theme.colors.primary }}
                    />
                    <Text style={[styles.name, { color: theme.colors.onSurface }]}>
                        {user?.fullName || 'User'}
                    </Text>

                    <Text style={[styles.role, { color: theme.colors.primary }]}>
                        {user?.role || 'Role'}
                    </Text>
                </View>

                <Divider style={styles.divider} />

                <View style={styles.actionSection}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
                        Data Synchronization
                    </Text>
                    <View style={styles.syncContainer}>
                        <View>
                            <Text style={[styles.syncLabel, { color: theme.colors.onSurface }]}>Sync Status</Text>
                            <Text style={{ color: theme.colors.onSurfaceVariant }}>Last synced: Just now</Text>
                        </View>
                        <IconButton
                            icon="database-sync"
                            mode="contained"
                            iconColor={theme.colors.primary}
                            containerColor={theme.colors.primaryContainer}
                            size={28}
                            onPress={() => Alert.alert('Sync', 'Syncing data...')}
                        />
                    </View>
                </View>

                <Divider style={styles.divider} />

                <Button
                    mode="outlined"
                    icon="logout"
                    textColor={theme.colors.error}
                    onPress={handleLogout}
                    style={[styles.logoutButton, { borderColor: theme.colors.error }]}
                    contentStyle={{ height: 48 }}
                >
                    Logout
                </Button>
            </Surface>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    screenTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    card: {
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 16,
    },
    role: {
        fontSize: 16,
        marginTop: 4,
        textTransform: 'uppercase',
        fontWeight: '600',
        letterSpacing: 1,
    },
    divider: {
        width: '100%',
        height: 1,
        marginVertical: 24,
    },
    actionSection: {
        width: '100%',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 16,
        textTransform: 'uppercase',
    },
    syncContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    syncLabel: {
        fontSize: 18,
        fontWeight: '500',
        marginBottom: 4,
    },
    logoutButton: {
        width: '100%',
        borderRadius: 8,
        marginTop: 8,
    }
});
