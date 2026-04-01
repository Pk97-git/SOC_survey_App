import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, Surface, useTheme, IconButton, HelperText } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../services/api';
import { Radius, Typography, Spacing } from '../constants/design';

// Password strength calculation (0-4)
const getPasswordStrength = (password: string): number => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;
    return Math.min(score, 4);
};

const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColors = ['#FF0000', '#FF6600', '#FFCC00', '#99CC00', '#00CC00'];

export default function ChangePasswordScreen() {
    const navigation = useNavigation<any>();
    const theme = useTheme();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    const passwordStrength = getPasswordStrength(newPassword);
    const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

    const handleChangePassword = async () => {
        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'New passwords do not match');
            return;
        }

        if (newPassword === currentPassword) {
            Alert.alert('Error', 'New password must be different from current password');
            return;
        }

        if (newPassword.length < 8) {
            Alert.alert('Error', 'Password must be at least 8 characters long');
            return;
        }

        if (!/[A-Z]/.test(newPassword)) {
            Alert.alert('Error', 'Password must contain at least one uppercase letter');
            return;
        }

        if (!/[a-z]/.test(newPassword)) {
            Alert.alert('Error', 'Password must contain at least one lowercase letter');
            return;
        }

        if (!/\d/.test(newPassword)) {
            Alert.alert('Error', 'Password must contain at least one number');
            return;
        }

        setLoading(true);
        try {
            await authApi.changePassword(currentPassword, newPassword);
            Alert.alert('Success', 'Your password has been changed successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || error.message || 'Failed to change password';
            Alert.alert('Error', errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                    {/* Header */}
                    <View style={styles.header}>
                        <IconButton
                            icon="arrow-left"
                            onPress={() => navigation.goBack()}
                            style={{ marginLeft: -8 }}
                            iconColor={theme.colors.onBackground}
                        />
                    </View>

                    <View style={styles.content}>
                        {/* Hero Section */}
                        <View style={styles.heroSection}>
                            <Surface style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]} elevation={2}>
                                <Text style={{ fontSize: 40 }}>🔐</Text>
                            </Surface>
                            <Text style={[Typography.headlineMd, { color: theme.colors.onSurface, textAlign: 'center' }]}>
                                Change Password
                            </Text>
                            <Text style={[Typography.bodyMd, { color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: Spacing[2] }]}>
                                Keep your account secure with a strong password
                            </Text>
                        </View>

                        {/* Form Card */}
                        <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
                            {/* Current Password */}
                            <TextInput
                                label="Current Password"
                                mode="outlined"
                                secureTextEntry={!showCurrentPassword}
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                left={<TextInput.Icon icon="lock-outline" />}
                                right={
                                    <TextInput.Icon
                                        icon={showCurrentPassword ? "eye-off" : "eye"}
                                        onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                                    />
                                }
                                style={styles.input}
                                autoComplete="password"
                            />

                            {/* New Password */}
                            <TextInput
                                label="New Password"
                                mode="outlined"
                                secureTextEntry={!showNewPassword}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                left={<TextInput.Icon icon="lock-reset" />}
                                right={
                                    <TextInput.Icon
                                        icon={showNewPassword ? "eye-off" : "eye"}
                                        onPress={() => setShowNewPassword(!showNewPassword)}
                                    />
                                }
                                style={styles.input}
                                autoComplete="password-new"
                            />

                            {/* Password Strength Meter */}
                            {newPassword.length > 0 && (
                                <View style={{ marginTop: -Spacing[2], marginBottom: Spacing[3] }}>
                                    <Text style={[Typography.labelSm, { color: theme.colors.onSurfaceVariant, marginBottom: Spacing[1] }]}>
                                        Password Strength
                                    </Text>
                                    <View style={{ flexDirection: 'row', gap: 4 }}>
                                        {[0, 1, 2, 3, 4].map((level) => (
                                            <View
                                                key={level}
                                                style={{
                                                    flex: 1,
                                                    height: 4,
                                                    borderRadius: Radius.xs,
                                                    backgroundColor: passwordStrength > level
                                                        ? strengthColors[passwordStrength]
                                                        : theme.colors.surfaceVariant
                                                }}
                                            />
                                        ))}
                                    </View>
                                    <Text
                                        style={[
                                            Typography.labelSm,
                                            {
                                                color: strengthColors[passwordStrength],
                                                marginTop: Spacing[1]
                                            }
                                        ]}
                                    >
                                        {strengthLabels[passwordStrength]}
                                    </Text>
                                </View>
                            )}

                            {/* Confirm Password */}
                            <TextInput
                                label="Confirm New Password"
                                mode="outlined"
                                secureTextEntry={!showNewPassword}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                left={<TextInput.Icon icon="lock-check" />}
                                style={styles.input}
                                autoComplete="password-new"
                            />

                            {/* Password Match Indicator */}
                            {confirmPassword.length > 0 && (
                                <HelperText type={passwordsMatch ? "info" : "error"} visible>
                                    {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                                </HelperText>
                            )}

                            {/* Requirements */}
                            <View style={[styles.requirementsBox, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
                                <Text style={[Typography.labelSm, { color: theme.colors.onSurfaceVariant, marginBottom: Spacing[2] }]}>
                                    Password must contain:
                                </Text>
                                <RequirementRow
                                    met={newPassword.length >= 8}
                                    text="At least 8 characters"
                                    theme={theme}
                                />
                                <RequirementRow
                                    met={/[A-Z]/.test(newPassword)}
                                    text="One uppercase letter (A-Z)"
                                    theme={theme}
                                />
                                <RequirementRow
                                    met={/[a-z]/.test(newPassword)}
                                    text="One lowercase letter (a-z)"
                                    theme={theme}
                                />
                                <RequirementRow
                                    met={/\d/.test(newPassword)}
                                    text="One number (0-9)"
                                    theme={theme}
                                />
                            </View>

                            {/* Buttons */}
                            <Button
                                mode="contained"
                                onPress={handleChangePassword}
                                loading={loading}
                                disabled={loading || !passwordsMatch || passwordStrength < 2}
                                style={{ marginTop: Spacing[4], borderRadius: Radius.md }}
                                contentStyle={{ height: 48 }}
                            >
                                Change Password
                            </Button>

                            <Button
                                mode="text"
                                onPress={() => navigation.goBack()}
                                style={{ marginTop: Spacing[2] }}
                                textColor={theme.colors.onSurfaceVariant}
                            >
                                Cancel
                            </Button>
                        </Surface>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// Helper component for requirement checkmarks
const RequirementRow = ({ met, text, theme }: { met: boolean; text: string; theme: any }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[1] }}>
        <Text style={{ fontSize: 16, marginRight: Spacing[2], color: met ? '#00CC00' : theme.colors.onSurfaceVariant }}>
            {met ? '✓' : '○'}
        </Text>
        <Text style={[Typography.bodyXs, { color: theme.colors.onSurfaceVariant }]}>
            {text}
        </Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: Spacing[4],
        paddingTop: Spacing[2],
    },
    content: {
        flex: 1,
        padding: Spacing[5],
        justifyContent: 'center',
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: Spacing[8],
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: Radius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing[4],
    },
    card: {
        padding: Spacing[5],
        borderRadius: Radius.xl,
        maxWidth: 480,
        width: '100%',
        alignSelf: 'center',
    },
    input: {
        marginBottom: Spacing[3],
    },
    requirementsBox: {
        padding: Spacing[3],
        borderRadius: Radius.md,
        borderWidth: 1,
        marginTop: Spacing[2],
    },
});
