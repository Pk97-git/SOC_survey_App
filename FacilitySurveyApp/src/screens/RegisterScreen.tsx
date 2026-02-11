import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, Surface, useTheme, SegmentedButtons } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../services/api';

export default function RegisterScreen() {
    const navigation = useNavigation();
    const theme = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('surveyor');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!email || !password || !fullName) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            await authApi.register({ email, password, fullName, role });
            Alert.alert(
                'Success',
                'Account created successfully! Please login.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error: any) {
            Alert.alert('Registration Failed', error.response?.data?.error || 'Failed to create account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content}>

                    <View style={styles.heroSection}>
                        <Surface style={[styles.logoContainer, { backgroundColor: theme.colors.surfaceVariant }]} elevation={4}>
                            <Text style={{ fontSize: 40 }}>🏗️</Text>
                        </Surface>
                        <Text style={{ color: theme.colors.onSurface, fontWeight: 'bold', fontSize: 28, marginTop: 20 }}>Create Account</Text>
                        <Text style={{ color: theme.colors.secondary, marginTop: 5 }}>Join the team</Text>
                    </View>

                    <Surface style={[styles.formCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
                        <TextInput
                            label="Full Name"
                            mode="outlined"
                            style={{ backgroundColor: theme.colors.surface }}
                            textColor={theme.colors.onSurface}
                            value={fullName}
                            onChangeText={setFullName}
                            autoCapitalize="words"
                            left={<TextInput.Icon icon="account" iconColor={theme.colors.secondary} />}
                        />

                        <TextInput
                            label="Email"
                            mode="outlined"
                            style={{ backgroundColor: theme.colors.surface, marginTop: 15 }}
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

                        <Text style={{ color: theme.colors.onSurface, marginTop: 20, marginBottom: 10, fontWeight: '600' }}>Role</Text>
                        <SegmentedButtons
                            value={role}
                            onValueChange={setRole}
                            buttons={[
                                { value: 'surveyor', label: 'Surveyor' },
                                { value: 'admin', label: 'Admin' },
                            ]}
                        />

                        <Button
                            mode="contained"
                            onPress={handleRegister}
                            loading={loading}
                            disabled={loading}
                            style={{ marginTop: 25, paddingVertical: 5 }}
                            buttonColor={theme.colors.primary}
                            textColor={theme.colors.onPrimary}
                        >
                            Create Account
                        </Button>

                        <Button
                            mode="text"
                            onPress={() => navigation.goBack()}
                            style={{ marginTop: 10 }}
                            textColor={theme.colors.secondary}
                        >
                            Already have an account? Sign In
                        </Button>
                    </Surface>

                    <Text style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant, marginTop: 30, fontSize: 12 }}>
                        v1.0.0 • Backend Integrated • CIT Ops
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: 40
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
