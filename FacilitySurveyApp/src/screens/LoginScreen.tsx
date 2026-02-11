import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Surface, useTheme } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
    const { login } = useAuth();
    const theme = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        setLoading(true);
        try {
            await login(email, password);
            // Navigation will happen automatically via AuthContext
        } catch (error: any) {
            Alert.alert('Login Failed', error.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View style={styles.content}>

                    <View style={styles.heroSection}>
                        <Surface style={[styles.logoContainer, { backgroundColor: theme.colors.surfaceVariant }]} elevation={4}>
                            <Text style={{ fontSize: 40 }}>🏗️</Text>
                        </Surface>
                        <Text style={{ color: theme.colors.onSurface, fontWeight: 'bold', fontSize: 28, marginTop: 20 }}>Facility Survey App</Text>
                        <Text style={{ color: theme.colors.secondary, marginTop: 5 }}>Operations Excellence</Text>
                    </View>

                    <Surface style={[styles.formCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
                        <Text style={{ marginBottom: 20, textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: theme.colors.onSurface }}>Sign In</Text>

                        <TextInput
                            label="Email"
                            mode="outlined"
                            style={{ backgroundColor: theme.colors.surface }}
                            textColor={theme.colors.onSurface}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            autoComplete="email"
                            left={<TextInput.Icon icon="email" iconColor={theme.colors.secondary} />}
                        />

                        <TextInput
                            label="Password"
                            mode="outlined"
                            secureTextEntry
                            style={{ backgroundColor: theme.colors.surface, marginTop: 15 }}
                            textColor={theme.colors.onSurface}
                            value={password}
                            onChangeText={setPassword}
                            autoComplete="password"
                            left={<TextInput.Icon icon="lock" iconColor={theme.colors.secondary} />}
                        />

                        <Button
                            mode="contained"
                            onPress={handleLogin}
                            loading={loading}
                            disabled={loading}
                            style={{ marginTop: 25, paddingVertical: 5 }}
                            buttonColor={theme.colors.primary}
                            textColor={theme.colors.onPrimary}
                        >
                            Sign In
                        </Button>

                        <Text style={{ textAlign: 'center', color: theme.colors.secondary, marginTop: 15, fontSize: 11 }}>
                            💡 Use your registered email and password
                        </Text>
                    </Surface>

                    <Text style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant, marginTop: 30, fontSize: 12 }}>
                        v1.0.0 • Backend Integrated • CIT Ops
                    </Text>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: 50
    },
    logoContainer: {
        width: 100,
        height: 100,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    formCard: {
        padding: 24,
        borderRadius: 20,
    },
});
