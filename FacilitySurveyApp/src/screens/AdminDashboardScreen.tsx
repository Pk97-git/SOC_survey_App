import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Surface, useTheme, Portal, Modal, Button, Avatar, Divider, ActivityIndicator, TouchableRipple } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as hybridStorage from '../services/hybridStorage';
import { dashboardApi } from '../services/api';
import { syncService } from '../services/syncService';
import { Colors, Radius, Typography, Spacing, Layout } from '../constants/design';

export default function AdminDashboardScreen() {
    const theme = useTheme();
    const navigation = useNavigation<any>();
    const [stats, setStats] = useState({
        totalSurveys: 0,
        pendingReviews: 0,
        activeSurveyors: 0,
        completedToday: 0,
    });
    const [statsLoading, setStatsLoading] = useState(true);
    const [surveyorsModalVisible, setSurveyorsModalVisible] = useState(false);
    const [surveyorsList, setSurveyorsList] = useState<any[]>([]);
    const [loadingSurveyors, setLoadingSurveyors] = useState(false);

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadDashboardStats();
        });
        return unsubscribe;
    }, [navigation]);

    const loadDashboardStats = async () => {
        setStatsLoading(true);
        try {
            if (await syncService.getStatus().isOnline) {
                try {
                    const onlineStats = await dashboardApi.getStats();
                    setStats({
                        totalSurveys: onlineStats.totalSurveys,
                        pendingReviews: onlineStats.pendingReviews,
                        activeSurveyors: onlineStats.activeSurveyors,
                        completedToday: onlineStats.completedToday,
                    });
                    return;
                } catch (error: any) {
                    if (error.response?.status !== 401) {
                        console.error('Failed to fetch dashboard stats from backend, falling back to local:', error);
                    }
                }
            }

            const surveys = await hybridStorage.getSurveys();
            const totalSurveys = surveys.length;
            const pendingReviews = surveys.filter((s: any) => s.status === 'submitted').length;
            const uniqueSurveyors = new Set(surveys.map((s: any) => s.surveyor_name).filter(Boolean));
            const activeSurveyors = uniqueSurveyors.size;
            const todayStr = new Date().toISOString().split('T')[0];
            const completedToday = surveys.filter((s: any) =>
                (s.status === 'submitted' || s.status === 'completed') &&
                ((s.submitted_at && s.submitted_at.startsWith(todayStr)) ||
                    (!s.submitted_at && s.updated_at && s.updated_at.startsWith(todayStr)))
            ).length;

            setStats({ totalSurveys, pendingReviews, activeSurveyors, completedToday });
        } catch (error) {
            console.error('Failed to load dashboard stats:', error);
        } finally {
            setStatsLoading(false);
        }
    };

    const showActiveSurveyors = async () => {
        setSurveyorsModalVisible(true);
        setLoadingSurveyors(true);
        try {
            if (await syncService.getStatus().isOnline) {
                const users = await dashboardApi.getUsers();
                const surveyorsOnly = users.filter((u: any) => u.role === 'surveyor');
                setSurveyorsList(surveyorsOnly);
            } else {
                Alert.alert('Offline', 'Must be online to view surveyor details');
                setSurveyorsModalVisible(false);
            }
        } catch (error) {
            console.error('Failed to fetch surveyors:', error);
            Alert.alert('Error', 'Failed to load surveyors');
        } finally {
            setLoadingSurveyors(false);
        }
    };

    const StatCard = ({ title, value, icon, color, iconBg, onPress }: any) => (
        <Surface style={[styles.statCard, { backgroundColor: theme.colors.surface, borderTopColor: color }]} elevation={2}>
            <TouchableRipple onPress={onPress} borderless style={{ borderRadius: Radius.xl, flex: 1 }}>
                <View style={{ flex: 1, padding: Spacing[4], borderRadius: Radius.xl, overflow: 'hidden' }}>
                    <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                        <MaterialCommunityIcons name={icon} size={24} color={color} />
                    </View>
                    <Text style={[Typography.statLg, { color: theme.colors.onSurface, marginBottom: 4 }]}>{value}</Text>
                    <Text style={[Typography.labelSm, { color: theme.colors.onSurfaceVariant }]}>{title}</Text>
                </View>
            </TouchableRipple>
        </Surface>
    );

    const ActionCard = ({ title, description, icon, iconBg, iconColor, onPress }: any) => (
        <Surface style={[styles.actionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={2}>
            <TouchableRipple onPress={onPress} borderless style={{ borderRadius: Radius.lg }}>
                <View style={[styles.actionContent, { borderRadius: Radius.lg, overflow: 'hidden' }]}>
                    <View style={[styles.actionIconBox, { backgroundColor: iconBg }]}>
                        <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
                    </View>
                    <View style={{ flex: 1, paddingHorizontal: Spacing[4] }}>
                        <Text style={[Typography.labelLg, { color: theme.colors.onSurface, marginBottom: 3 }]}>
                            {title}
                        </Text>
                        <Text style={[Typography.bodyXs, { color: theme.colors.onSurfaceVariant, lineHeight: 16 }]}>
                            {description}
                        </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
                </View>
            </TouchableRipple>
        </Surface>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* ── Header ────────────────────────────────────────────── */}
                <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                        <Text style={[Typography.displayMd, { color: theme.colors.onBackground }]}>
                            Admin Dashboard
                        </Text>
                        <Text style={[Typography.bodyMd, { color: theme.colors.onSurfaceVariant, marginTop: 4 }]}>
                            System Overview
                        </Text>
                    </View>
                    <Text style={[Typography.labelXs, { color: theme.colors.onSurfaceVariant, marginTop: 6 }]}>
                        {today.toUpperCase()}
                    </Text>
                </View>

                {/* ── Stats Grid ────────────────────────────────────────── */}
                {statsLoading && <ActivityIndicator style={{ marginBottom: Spacing[4] }} color={theme.colors.primary} />}
                <View style={styles.statsGrid}>
                    <StatCard
                        title="Total Surveys"
                        value={stats.totalSurveys}
                        icon="file-document-multiple-outline"
                        color={theme.colors.primary}
                        iconBg={theme.colors.primaryContainer}
                        onPress={() => navigation.navigate('ReportsTab', { screen: 'Reports' })}
                    />
                    <StatCard
                        title="Pending Reviews"
                        value={stats.pendingReviews}
                        icon="clock-alert-outline"
                        color={theme.colors.error}
                        iconBg={theme.colors.errorContainer}
                        onPress={() => navigation.navigate('ReportsTab', { screen: 'Reports', params: { statusFilter: 'submitted' } })}
                    />
                    <StatCard
                        title="Active Surveyors"
                        value={stats.activeSurveyors}
                        icon="account-group-outline"
                        color={theme.colors.secondary}
                        iconBg={theme.colors.secondaryContainer}
                        onPress={showActiveSurveyors}
                    />
                    <StatCard
                        title="Completed Today"
                        value={stats.completedToday}
                        icon="check-circle-outline"
                        color={theme.colors.tertiary}
                        iconBg={theme.colors.tertiaryContainer}
                        onPress={() => navigation.navigate('ReportsTab', { screen: 'SurveyManagement' })}
                    />
                </View>

                {/* ── Management Actions ────────────────────────────────── */}
                <View style={styles.section}>
                    <Text style={[Typography.h3, { color: theme.colors.onSurface, marginBottom: Spacing[4] }]}>
                        Management
                    </Text>

                    <ActionCard
                        title="User Management"
                        description="Add, edit, or remove users and assign roles"
                        icon="account-cog-outline"
                        iconBg={theme.colors.primaryContainer}
                        iconColor={theme.colors.primary}
                        onPress={() => navigation.navigate('UserManagement')}
                    />
                    <ActionCard
                        title="Site Management"
                        description="Manage sites and asset registers"
                        icon="map-marker-multiple-outline"
                        iconBg={theme.colors.secondaryContainer}
                        iconColor={theme.colors.secondary}
                        onPress={() => navigation.navigate('SitesTab')}
                    />
                    <ActionCard
                        title="Survey Management & Reports"
                        description="View surveys, track progress, and generate Excel reports"
                        icon="file-chart-outline"
                        iconBg={theme.colors.tertiaryContainer}
                        iconColor={theme.colors.tertiary}
                        onPress={() => navigation.navigate('ReportsTab')}
                    />
                    <ActionCard
                        title="Analytics Overview"
                        description="Visual insights on performance and trends"
                        icon="chart-bar"
                        iconBg={Colors.status.infoBg}
                        iconColor={Colors.status.infoBlue}
                        onPress={() => navigation.navigate('Analytics')}
                    />
                </View>
            </ScrollView>

            <Portal>
                <Modal
                    visible={surveyorsModalVisible}
                    onDismiss={() => setSurveyorsModalVisible(false)}
                    contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
                >
                    <Text style={[Typography.h2, { color: theme.colors.onSurface, marginBottom: 4 }]}>Surveyor Activity</Text>
                    <Text style={[Typography.bodyMd, { color: theme.colors.onSurfaceVariant, marginBottom: Spacing[4] }]}>
                        Real-time status from backend
                    </Text>

                    {loadingSurveyors ? (
                        <ActivityIndicator style={{ marginTop: Spacing[5] }} color={theme.colors.primary} />
                    ) : (
                        <ScrollView style={{ maxHeight: 320 }}>
                            {surveyorsList.length === 0 ? (
                                <Text style={[Typography.bodyMd, { padding: Spacing[5], textAlign: 'center', color: theme.colors.onSurfaceVariant }]}>
                                    No data available
                                </Text>
                            ) : (
                                surveyorsList.map((user, index) => (
                                    <View key={user.id}>
                                        <View style={styles.userRow}>
                                            <Avatar.Text
                                                size={40}
                                                label={user.full_name?.substring(0, 2).toUpperCase() || '??'}
                                                style={{ backgroundColor: theme.colors.secondaryContainer }}
                                                color={theme.colors.onSecondaryContainer}
                                            />
                                            <View style={{ marginLeft: Spacing[3], flex: 1 }}>
                                                <Text style={[Typography.labelLg, { color: theme.colors.onSurface }]}>{user.full_name}</Text>
                                                <Text style={[Typography.bodyXs, { color: theme.colors.onSurfaceVariant }]}>
                                                    {user.last_login ? `Last login: ${new Date(user.last_login).toLocaleDateString()}` : 'Never logged in'}
                                                </Text>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={[Typography.statMd, { color: theme.colors.tertiary }]}>{user.survey_count || 0}</Text>
                                                <Text style={[Typography.bodyXs, { color: theme.colors.onSurfaceVariant }]}>Surveys</Text>
                                            </View>
                                        </View>
                                        {index < surveyorsList.length - 1 && <Divider />}
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    )}

                    <Button
                        mode="contained"
                        onPress={() => setSurveyorsModalVisible(false)}
                        style={{ marginTop: Spacing[4], borderRadius: Radius.md }}
                    >
                        Close
                    </Button>
                </Modal>
            </Portal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: Layout.screenPaddingH,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: Spacing[6],
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing[4],
        marginBottom: Spacing[8],
    },
    statCard: {
        width: '47%',
        borderRadius: Radius.xl,
        borderTopWidth: 3,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    iconContainer: {
        borderRadius: Radius.md,
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing[3],
    },
    section: {
        marginBottom: Spacing[6],
    },
    actionCard: {
        marginBottom: Spacing[4],
        borderRadius: Radius.lg,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
    },
    actionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing[4],
    },
    actionIconBox: {
        width: 44,
        height: 44,
        borderRadius: Radius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        margin: 20,
        borderRadius: Radius.xxl,
        padding: Spacing[6],
        maxWidth: 500,
        alignSelf: 'center',
        width: '90%',
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing[3],
    },
});
