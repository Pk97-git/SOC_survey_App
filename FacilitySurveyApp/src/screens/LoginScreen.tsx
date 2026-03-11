import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { Text, TextInput, Button, Surface, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Radius, Typography, Spacing } from '../constants/design';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const discovery: AuthSession.DiscoveryDocument = {
    authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
};

export default function LoginScreen() {
    const { login, loginWithMicrosoft } = useAuth();
    const navigation = useNavigation<any>();
    const theme = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Microsoft Auth Session Hook
    // In production, EXPO_PUBLIC_MICROSOFT_CLIENT_ID should be set in .env
    const clientId = process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID || 'your-client-id-here';

    const [request, response, promptAsync] = AuthSession.useAuthRequest(
        {
            clientId,
            scopes: ['openid', 'profile', 'email'],
            redirectUri: AuthSession.makeRedirectUri({
                scheme: 'facilitysurveyapp'
            }),
            responseType: 'id_token',
            extraParams: { nonce: 'nonce', response_mode: 'fragment' }
        },
        discovery
    );

    React.useEffect(() => {
        if (response?.type === 'success') {
            const { id_token } = response.params;
            if (id_token) {
                handleMicrosoftLogin(id_token);
            }
        } else if (response?.type === 'error') {
            Alert.alert('Microsoft Login Failed', response.error?.message || 'Authentication with Microsoft failed.');
        }
    }, [response]);

    const handleMicrosoftLogin = async (idToken: string) => {
        setLoading(true);
        try {
            await loginWithMicrosoft(idToken);
        } catch (error: any) {
            Alert.alert('Login Failed', error.message || 'Validation failed');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }
        setLoading(true);
        try {
            await login(email, password);
        } catch (error: any) {
            Alert.alert('Login Failed', error.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.primary }]} edges={['top']}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                    {/* ── Hero band (maroon) ──────────────────────────────── */}
                    <View style={styles.heroBand}>
                        {/* Company label */}
                        <Text style={[Typography.labelXs, { color: theme.colors.tertiary, marginBottom: Spacing[3] }]}>
                            GULAID HOLDING
                        </Text>

                        {/* Logo ring */}
                        <View style={[styles.logoRing, { borderColor: 'rgba(255,255,255,0.25)' }]}>
                            <View style={[styles.logoInner, { backgroundColor: 'transparent' }]}>
                                <Image
                                    source={require('../../assets/cit-logo.png')}
                                    style={{ width: 64, height: 64, resizeMode: 'contain' }}
                                />
                            </View>
                        </View>

                        {/* Brand title */}
                        <Text style={[Typography.displaySm, styles.heroTitle]}>
                            CIT Operations
                        </Text>
                        <Text style={styles.heroSubtitle}>
                            Asset Condition Survey Platform
                        </Text>
                    </View>

                    {/* ── Form card (white, overlaps hero band) ────────────── */}
                    <View style={[styles.cardWrapper, { backgroundColor: theme.colors.background }]}>
                        <Surface
                            style={[styles.formCard, {
                                backgroundColor: theme.colors.surface,
                                borderColor: theme.colors.outlineVariant,
                            }]}
                            elevation={2}
                        >
                            <Text style={[Typography.h2, { color: theme.colors.onSurface, marginBottom: Spacing[5] }]}>
                                Sign In
                            </Text>

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
                                left={<TextInput.Icon icon="email-outline" color={theme.colors.onSurfaceVariant} />}
                            />

                            <TextInput
                                label="Password"
                                mode="outlined"
                                secureTextEntry
                                style={{ backgroundColor: theme.colors.surface, marginTop: Spacing[4] }}
                                textColor={theme.colors.onSurface}
                                value={password}
                                onChangeText={setPassword}
                                autoComplete="password"
                                left={<TextInput.Icon icon="lock-outline" color={theme.colors.onSurfaceVariant} />}
                            />

                            <Button
                                mode="contained"
                                onPress={handleLogin}
                                loading={loading}
                                disabled={loading}
                                style={{ marginTop: Spacing[6], borderRadius: Radius.lg }}
                                contentStyle={{ height: 52 }}
                                buttonColor={theme.colors.primary}
                                textColor={theme.colors.onPrimary}
                                labelStyle={{ fontSize: 16, fontWeight: 'bold', letterSpacing: 0.3 }}
                            >
                                Sign In
                            </Button>

                            <Button
                                mode="contained"
                                icon="microsoft"
                                onPress={() => promptAsync()}
                                disabled={!request || loading}
                                style={{ marginTop: Spacing[3], borderRadius: Radius.lg, borderWidth: 1, borderColor: '#2F2F2F' }}
                                contentStyle={{ height: 52 }}
                                buttonColor="#2F2F2F"
                                textColor="#FFFFFF"
                                labelStyle={{ fontSize: 16, fontWeight: 'bold', letterSpacing: 0.3 }}
                            >
                                Sign in with Microsoft
                            </Button>

                            <Button
                                mode="text"
                                onPress={() => navigation.navigate('ForgotPassword')}
                                style={{ marginTop: Spacing[2] }}
                                textColor={theme.colors.primary}
                                labelStyle={{ fontSize: 13 }}
                            >
                                Forgot Password?
                            </Button>

                            {/* Info hint */}
                            <View style={styles.hintRow}>
                                <MaterialCommunityIcons name="information-outline" size={14} color={theme.colors.onSurfaceVariant} />
                                <Text style={[Typography.bodyXs, { color: theme.colors.onSurfaceVariant, marginLeft: 6, flex: 1 }]}>
                                    Use your registered email and password
                                </Text>
                            </View>
                        </Surface>

                        {/* Version footer */}
                        <Text style={[Typography.bodyXs, styles.versionText, { color: theme.colors.onSurfaceVariant }]}>
                            v1.0.0 · CIT Group Ltd · Gulaid Holding
                        </Text>
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
    heroBand: {
        alignItems: 'center',
        paddingTop: Spacing[8],
        paddingBottom: Spacing[12],
        paddingHorizontal: Spacing[6],
    },
    logoRing: {
        width: 96,
        height: 96,
        borderRadius: Radius.full,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing[5],
    },
    logoInner: {
        width: 80,
        height: 80,
        borderRadius: Radius.full,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroTitle: {
        color: '#FFFFFF',
        marginBottom: Spacing[2],
    },
    heroSubtitle: {
        fontSize: 14,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.75)',
        letterSpacing: 0.2,
    },
    cardWrapper: {
        flex: 1,
        marginTop: -Spacing[8],
        borderTopLeftRadius: Radius.xxl,
        borderTopRightRadius: Radius.xxl,
        paddingTop: Spacing[6],
        paddingHorizontal: Spacing[5],
        paddingBottom: Spacing[8],
    },
    formCard: {
        padding: Spacing[6],
        borderRadius: Radius.xl,
        borderWidth: 1,
        width: '100%',
        maxWidth: 440,
        alignSelf: 'center',
    },
    hintRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing[4],
        paddingHorizontal: Spacing[1],
    },
    versionText: {
        textAlign: 'center',
        marginTop: Spacing[6],
    },
});
