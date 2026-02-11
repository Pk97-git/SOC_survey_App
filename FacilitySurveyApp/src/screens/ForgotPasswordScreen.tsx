import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, Surface, useTheme, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../services/api';

export default function ForgotPasswordScreen() {
    const navigation = useNavigation<any>();
    const theme = useTheme();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleRequestReset = async () => {
        if (!email) {
            Alert.alert('Error', 'Please enter your email address');
            return;
        }

        setLoading(true);
        try {
            await authApi.forgotPassword(email);
            setSubmitted(true);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to request password reset');
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
                                <Text style={{ fontSize: 40 }}>🔑</Text>
                            </Surface>
                            <Text style={[styles.title, { color: theme.colors.onSurface }]}>Forgot Password?</Text>
                            <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
                                No worries, we'll send you reset instructions.
                            </Text>
                        </View>

                        <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
                            {!submitted ? (
                                <>
                                    <TextInput
                                        label="Email Address"
                                        mode="outlined"
                                        value={email}
                                        onChangeText={setEmail}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        autoComplete="email"
                                        left={<TextInput.Icon icon="email" />}
                                        style={styles.input}
                                    />

                                    <Button
                                        mode="contained"
                                        onPress={handleRequestReset}
                                        loading={loading}
                                        disabled={loading}
                                        style={styles.button}
                                    >
                                        Send Reset Link
                                    </Button>
                                </>
                            ) : (
                                <View style={styles.successContainer}>
                                    <IconButton icon="check-circle" iconColor={theme.colors.primary} size={48} />
                                    <Text style={styles.successTitle}>Check your email</Text>
                                    <Text style={styles.successMessage}>
                                        If an account exists for {email}, you will receive a password reset link shortly.
                                    </Text>
                                    <Button
                                        mode="contained"
                                        onPress={() => navigation.navigate('ResetPassword', { email })}
                                        style={styles.button}
                                    >
                                        Enter Reset Token
                                    </Button>
                                </View>
                            )}
                        </Surface>

                        <Button
                            mode="text"
                            onPress={() => navigation.navigate('Login')}
                            style={{ marginTop: 20 }}
                        >
                            Back to Sign In
                        </Button>
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
    successContainer: {
        alignItems: 'center',
    },
    successTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 10,
    },
    successMessage: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 20,
        opacity: 0.7,
    },
});
