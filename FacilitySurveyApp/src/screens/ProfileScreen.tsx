import React, { useState } from 'react';
import { View, StyleSheet, Alert, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Surface, useTheme, Avatar, Divider, Portal, Modal, TextInput, Chip, TouchableRipple } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../services/api';
import { syncService } from '../services/hybridStorage';
import { Colors, Spacing, Typography, Radius } from '../constants/design';

export default function ProfileScreen() {
    const { logout, user } = useAuth();
    const theme = useTheme();
    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [secureTextEntry, setSecureTextEntry] = useState(true);

    const handleLogout = () => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm('Are you sure you want to logout?');
            if (confirmed) logout();
        } else {
            Alert.alert('Logout', 'Are you sure you want to logout?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: logout }
            ]);
        }
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

    const roleColor = () => {
        const r = user?.role?.toLowerCase();
        if (r === 'admin') return { bg: theme.colors.primaryContainer, text: theme.colors.onPrimaryContainer };
        if (r === 'reviewer') return { bg: theme.colors.secondaryContainer, text: theme.colors.onSecondaryContainer };
        return { bg: theme.colors.tertiaryContainer, text: theme.colors.onTertiaryContainer };
    };
    const { bg: roleBg, text: roleText } = roleColor();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <ScrollView contentContainerStyle={{ paddingBottom: Spacing[8] }}>

                {/* Maroon hero band */}
                <View style={[styles.heroBand, { backgroundColor: theme.colors.primary }]}>
                    <Avatar.Text
                        size={80}
                        label={user?.fullName?.substring(0, 2).toUpperCase() || 'US'}
                        style={{ backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: Spacing[3] }}
                        labelStyle={{ color: '#FFFFFF', fontWeight: '800' }}
                    />
                    <Text style={[Typography.h2, { color: '#FFFFFF', textAlign: 'center' }]}>
                        {user?.fullName || 'User'}
                    </Text>
                    <Text style={[Typography.bodyXs, { color: 'rgba(255,255,255,0.7)', marginTop: 4, marginBottom: Spacing[3] }]}>
                        {user?.email}
                    </Text>
                    <Chip
                        style={{ backgroundColor: roleBg }}
                        textStyle={{ color: roleText, fontWeight: '700', fontSize: 11, letterSpacing: 0.5 }}
                    >
                        {(user?.role || 'USER').toUpperCase()}
                    </Chip>
                </View>

                {/* Content card */}
                <Surface style={[styles.card, { backgroundColor: theme.colors.surface, marginTop: -Spacing[4] }]} elevation={3}>

                    {/* Account Actions */}
                    <Text style={[Typography.labelXs, { color: theme.colors.onSurfaceVariant, marginBottom: Spacing[3] }]}>
                        Account Actions
                    </Text>

                    <TouchableRipple
                        onPress={() => setPasswordModalVisible(true)}
                        borderless
                        style={{ borderRadius: Radius.sm, marginBottom: Spacing[2] }}
                    >
                        <View style={styles.actionRow}>
                            <View style={[styles.actionIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                                <MaterialCommunityIcons name="lock-reset" size={20} color={theme.colors.primary} />
                            </View>
                            <View style={{ flex: 1, marginLeft: Spacing[3] }}>
                                <Text style={[Typography.labelMd, { color: theme.colors.onSurface }]}>Change Password</Text>
                                <Text style={[Typography.bodyXs, { color: theme.colors.onSurfaceVariant }]}>Update your account password</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
                        </View>
                    </TouchableRipple>

                    <Divider style={{ marginVertical: Spacing[4] }} />

                    {/* Data Sync */}
                    <Text style={[Typography.labelXs, { color: theme.colors.onSurfaceVariant, marginBottom: Spacing[3] }]}>
                        Data Synchronization
                    </Text>

                    <TouchableRipple
                        onPress={async () => {
                            setLoading(true);
                            try {
                                await syncService.syncAll();
                                Alert.alert('Sync', 'Data synced successfully.');
                            } catch (e) {
                                Alert.alert('Sync', 'Sync failed. Check your connection.');
                            } finally {
                                setLoading(false);
                            }
                        }}
                        disabled={loading}
                        borderless
                        style={{ borderRadius: Radius.sm, marginBottom: Spacing[2] }}
                    >
                        <View style={styles.actionRow}>
                            <View style={[styles.actionIcon, { backgroundColor: theme.colors.secondaryContainer }]}>
                                <MaterialCommunityIcons name="database-sync" size={20} color={theme.colors.secondary} />
                            </View>
                            <View style={{ flex: 1, marginLeft: Spacing[3] }}>
                                <Text style={[Typography.labelMd, { color: theme.colors.onSurface }]}>Sync Data</Text>
                                <Text style={[Typography.bodyXs, { color: theme.colors.onSurfaceVariant }]}>Sync local data with server</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
                        </View>
                    </TouchableRipple>

                    <Divider style={{ marginVertical: Spacing[4] }} />

                    {/* Logout */}
                    <Button
                        mode="contained"
                        icon="logout"
                        onPress={handleLogout}
                        buttonColor={theme.colors.errorContainer}
                        textColor={theme.colors.error}
                        style={[styles.logoutButton, { borderRadius: Radius.md }]}
                        contentStyle={{ height: 48 }}
                        labelStyle={{ fontWeight: '700' }}
                    >
                        Logout
                    </Button>
                </Surface>
            </ScrollView>

            <Portal>
                <Modal
                    visible={passwordModalVisible}
                    onDismiss={() => setPasswordModalVisible(false)}
                    contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
                >
                    <Text style={[Typography.h3, { color: theme.colors.onSurface, marginBottom: Spacing[4] }]}>
                        Change Password
                    </Text>
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
                        <Button onPress={() => setPasswordModalVisible(false)} disabled={loading}>Cancel</Button>
                        <Button mode="contained" onPress={handleChangePassword} loading={loading} disabled={loading}>Update</Button>
                    </View>
                </Modal>
            </Portal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    heroBand: {
        paddingTop: Spacing[8],
        paddingBottom: Spacing[8] + Spacing[4],
        alignItems: 'center',
        paddingHorizontal: Spacing[6],
    },
    card: {
        marginHorizontal: Spacing[4],
        borderRadius: Radius.xl,
        padding: Spacing[6],
        borderWidth: 1,
        borderColor: Colors.neutral[200],
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing[3],
        paddingHorizontal: Spacing[2],
    },
    actionIcon: {
        width: 40,
        height: 40,
        borderRadius: Radius.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoutButton: {
        width: '100%',
    },
    input: {
        marginBottom: Spacing[4],
        backgroundColor: 'transparent',
    },
    modalContent: {
        margin: Spacing[5],
        padding: Spacing[6],
        borderRadius: Radius.xl,
        maxWidth: 500,
        alignSelf: 'center',
        width: '100%',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: Spacing[2],
        marginTop: Spacing[2],
    },
});
