import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, IconButton, Surface, useTheme, Avatar, Divider, Portal, Modal, TextInput } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../services/api';

export default function ProfileScreen() {
    const { logout, user } = useAuth();
    const theme = useTheme();
    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [secureTextEntry, setSecureTextEntry] = useState(true);

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

    const handleChangePassword = async () => {
        if (!newPassword || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            if (user?.id) {
                await usersApi.update(user.id, { password: newPassword });
                Alert.alert('Success', 'Password updated successfully');
                setPasswordModalVisible(false);
                setNewPassword('');
                setConfirmPassword('');
            } else {
                Alert.alert('Error', 'User ID not found');
            }
        } catch (error: any) {
            console.error('Failed to update password:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    const handleClearCache = async () => {
        Alert.alert(
            'Clear Cache',
            'This will clear locally cached data (Sites & Assets) and force a fresh fetch from the backend on next load. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        // Import dynamically to avoid cycle if needed, or just use imported
                        const { clearCache } = require('../services/hybridStorage');
                        await clearCache();
                        setLoading(false);
                        Alert.alert('Success', 'Local cache cleared. Data will be fetched from backend now.');
                    }
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
                        Account Actions
                    </Text>

                    <Button
                        mode="outlined"
                        icon="lock-reset"
                        onPress={() => setPasswordModalVisible(true)}
                        style={[styles.actionButton, { borderColor: theme.colors.outline }]}
                        textColor={theme.colors.onSurface}
                    >
                        Change Password
                    </Button>
                </View>

                <View style={[styles.actionSection, { marginTop: 24 }]}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
                        Data Synchronization
                    </Text>
                    <View style={styles.syncContainer}>
                        <View>
                            <Text style={[styles.syncLabel, { color: theme.colors.onSurface }]}>Data & Cache</Text>
                            <Text style={{ color: theme.colors.onSurfaceVariant }}>Manage local data</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <Button
                                mode="outlined"
                                onPress={handleClearCache}
                                disabled={loading}
                                icon="delete-sweep"
                                compact
                            >
                                Clear Cache
                            </Button>
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

            <Portal>
                <Modal
                    visible={passwordModalVisible}
                    onDismiss={() => setPasswordModalVisible(false)}
                    contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
                >
                    <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>Change Password</Text>

                    <TextInput
                        label="New Password"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={secureTextEntry}
                        style={styles.input}
                        right={<TextInput.Icon icon={secureTextEntry ? "eye" : "eye-off"} onPress={() => setSecureTextEntry(!secureTextEntry)} />}
                    />

                    <TextInput
                        label="Confirm Password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={secureTextEntry}
                        style={styles.input}
                    />

                    <View style={styles.modalActions}>
                        <Button onPress={() => setPasswordModalVisible(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button mode="contained" onPress={handleChangePassword} loading={loading} disabled={loading}>
                            Update
                        </Button>
                    </View>
                </Modal>
            </Portal>
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
    },
    actionButton: {
        width: '100%',
        borderRadius: 8,
    },
    modalContent: {
        margin: 20,
        padding: 24,
        borderRadius: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    input: {
        marginBottom: 16,
        backgroundColor: 'transparent',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 8,
    }
});
