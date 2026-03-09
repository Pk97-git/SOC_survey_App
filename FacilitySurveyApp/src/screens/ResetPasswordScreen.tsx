import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, Surface, useTheme, IconButton } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../services/api';

export default function ResetPasswordScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const theme = useTheme();

    const [token, setToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleResetPassword = async () => {
        if (!token || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await authApi.resetPassword(token, password);
            Alert.alert('Success', 'Your password has been reset successfully. Please sign in with your new password.', [
                { text: 'OK', onPress: () => navigation.navigate('Login') }
            ]);
        } catch (error: any) {
            Alert.alert('Reset Failed', error.response?.data?.error || 'Failed to reset password. The token may be invalid or expired.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                    <View style={styles.header}>
                        <IconButton
                            icon="arrow-left"
                            onPress={() => navigation.goBack()}
                            style={{ marginLeft: -8 }}
                        />
                    </View>

                    <View style={styles.content}>
                        <View style={styles.heroSection}>
                            <Surface style={[styles.iconContainer, { backgroundColor: theme.colors.surfaceVariant }]} elevation={2}>
                                <Text style={{ fontSize: 40 }}>📑</Text>
                            </Surface>
                            <Text style={[styles.title, { color: theme.colors.onSurface }]}>Set New Password</Text>
                            <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
                                Enter the 64-character token sent to your email and choose a strong password.
                            </Text>
                        </View>

                        <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
                            <TextInput
                                label="Reset Token"
                                mode="outlined"
                                value={token}
                                onChangeText={setToken}
                                autoCapitalize="none"
                                left={<TextInput.Icon icon="ticket-confirmation" />}
                                style={styles.input}
                                placeholder="Paste token here"
                            />

                            <TextInput
                                label="New Password"
                                mode="outlined"
                                secureTextEntry={!showPassword}
                                value={password}
                                onChangeText={setPassword}
                                left={<TextInput.Icon icon="lock" />}
                                right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} />}
                                style={styles.input}
                            />

                            <TextInput
                                label="Confirm New Password"
                                mode="outlined"
                                secureTextEntry={!showPassword}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                left={<TextInput.Icon icon="lock-check" />}
                                style={styles.input}
                            />

                            <Button
                                mode="contained"
                                onPress={handleResetPassword}
                                loading={loading}
                                disabled={loading}
                                style={styles.button}
                            >
                                Reset Password
                            </Button>
                        </Surface>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
    },
    card: {
        padding: 24,
        borderRadius: 20,
    },
    input: {
        marginBottom: 16,
    },
    button: {
        marginTop: 8,
        paddingVertical: 5,
    },
});
