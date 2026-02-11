import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Surface, useTheme, Card, IconButton, Portal, Modal, Button, Avatar, Divider, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import * as hybridStorage from '../services/hybridStorage';
import { dashboardApi } from '../services/api';
import { syncService } from '../services/syncService';

export default function AdminDashboardScreen() {
    const theme = useTheme();
    const navigation = useNavigation<any>();
    const [stats, setStats] = useState({
        totalSurveys: 0,
        pendingReviews: 0,
        activeSurveyors: 0,
        completedToday: 0,
    });

    // Active Surveyors Modal State
    const [surveyorsModalVisible, setSurveyorsModalVisible] = useState(false);
    const [surveyorsList, setSurveyorsList] = useState<any[]>([]);
    const [loadingSurveyors, setLoadingSurveyors] = useState(false);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadDashboardStats();
        });
        return unsubscribe;
    }, [navigation]);

    const loadDashboardStats = async () => {
        try {
            // Try fetching from backend if online
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
                } catch (error) {
                    console.error('Failed to fetch dashboard stats from backend, falling back to local:', error);
                }
            }

            // Fallback to local calculation
            const surveys = await hybridStorage.getSurveys();

            // Total Surveys
            const totalSurveys = surveys.length;

            // Pending Reviews (Submitted but not yet processed/synced - simplified logic for now)
            // Assuming 'submitted' status needs review
            const pendingReviews = surveys.filter((s: any) => s.status === 'submitted').length;

            // Active Surveyors (Count unique surveyor names from surveys)
            const uniqueSurveyors = new Set(surveys.map((s: any) => s.surveyor_name).filter(Boolean));
            const activeSurveyors = uniqueSurveyors.size;

            // Completed Today
            const today = new Date().toISOString().split('T')[0];
            const completedToday = surveys.filter((s: any) =>
                s.status === 'submitted' &&
                s.updated_at &&
                s.updated_at.startsWith(today)
            ).length;

            setStats({
                totalSurveys,
                pendingReviews,
                activeSurveyors,
                completedToday,
            });
        } catch (error) {
            console.error('Failed to load dashboard stats:', error);
        }
    };

    const showActiveSurveyors = async () => {
        setSurveyorsModalVisible(true);
        setLoadingSurveyors(true);
        try {
            if (await syncService.getStatus().isOnline) {
                const users = await dashboardApi.getUsers();
                // Filter for those who have logged in recently or have surveys
                // The API returns all users sorted by last_login.
                // We'll show all but highlight active ones?
                // Requirements say "Active Surveyors".
                // Let's filter client side or just show the list with login info/counts.
                // dashboardApi.getUsers returns { id, full_name, email, role, last_login, survey_count }
                setSurveyorsList(users);
            } else {
                // Offline fallback (can't easily get full user list details without cache)
                alert('Must be online to view surveyor details');
                setSurveyorsModalVisible(false);
            }
        } catch (error) {
            console.error('Failed to fetch surveyors:', error);
            alert('Failed to load surveyors');
        } finally {
            setLoadingSurveyors(false);
        }
    };

    const StatCard = ({ title, value, icon, color, onPress }: any) => (
        <Surface style={[styles.statCard, { backgroundColor: theme.colors.surface }]} elevation={2} onTouchEnd={onPress}>
            <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                <IconButton icon={icon} iconColor={color} size={28} style={{ margin: 0 }} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>{value}</Text>
                <Text style={[styles.statTitle, { color: theme.colors.onSurfaceVariant }]}>{title}</Text>
            </View>
        </Surface>
    );

    const ActionCard = ({ title, description, icon, onPress }: any) => (
        <Surface style={[styles.actionCard, { backgroundColor: theme.colors.surface }]} elevation={2} onTouchEnd={onPress}>
            <View style={styles.actionContent}>
                <View style={[styles.actionIconBox, { backgroundColor: theme.colors.secondaryContainer }]}>
                    <IconButton icon={icon} iconColor={theme.colors.onSecondaryContainer} size={24} />
                </View>
                <View style={{ flex: 1, paddingHorizontal: 16 }}>
                    <Text style={[styles.actionTitle, { color: theme.colors.onSurface }]}>
                        {title}
                    </Text>
                    <Text style={[styles.actionDescription, { color: theme.colors.onSurfaceVariant }]}>
                        {description}
                    </Text>
                </View>
                <IconButton icon="chevron-right" iconColor={theme.colors.onSurfaceVariant} size={24} />
            </View>
        </Surface>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.colors.onBackground }]}>
                        Admin Dashboard
                    </Text>
                    <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                        System Overview
                    </Text>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <StatCard
                        title="Total Surveys"
                        value={stats.totalSurveys}
                        icon="file-document-multiple"
                        color={theme.colors.primary}
                        onPress={() => navigation.navigate('ReportsTab', { screen: 'Reports' })}
                    />
                    <StatCard
                        title="Pending Reviews"
                        value={stats.pendingReviews}
                        icon="clock-alert"
                        color={theme.colors.error}
                        onPress={() => navigation.navigate('ReportsTab', { screen: 'Reports', params: { filter: 'pending' } })}
                    />
                    <StatCard
                        title="Active Surveyors"
                        value={stats.activeSurveyors}
                        icon="account-group"
                        color={theme.colors.secondary}
                        onPress={showActiveSurveyors}
                    />
                    <StatCard
                        title="Completed Today"
                        value={stats.completedToday}
                        icon="check-circle"
                        color={theme.colors.tertiary}
                        onPress={() => navigation.navigate('ReportsTab', { screen: 'Reports', params: { filter: 'today' } })}
                    />
                </View>

                {/* Management Actions */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                        Management
                    </Text>

                    <ActionCard
                        title="User Management"
                        description="Add, edit, or remove users and assign roles"
                        icon="account-cog"
                        onPress={() => navigation.navigate('UserManagement')}
                    />

                    <ActionCard
                        title="Site Management"
                        description="Manage sites and asset registers"
                        icon="map-marker-multiple"
                        onPress={() => navigation.navigate('SitesTab')}
                    />

                    <ActionCard
                        title="Survey Management & Reports"
                        description="View surveys, track progress, and generate Excel reports"
                        icon="file-chart"
                        onPress={() => navigation.navigate('ReportsTab')}
                    />

                    <ActionCard
                        title="Analytics Overview"
                        description="Visual insights on performance and trends"
                        icon="chart-bar"
                        onPress={() => navigation.navigate('Analytics')}
                    />
                </View>
            </ScrollView>

            <Portal>
                <Modal
                    visible={surveyorsModalVisible}
                    onDismiss={() => setSurveyorsModalVisible(false)}
                    contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.background }]}
                >
                    <Text style={[styles.modalTitle, { color: theme.colors.onBackground }]}>Surveyor Activity</Text>
                    <Text style={[styles.modalSubtitle, { color: theme.colors.onSurfaceVariant }]}>Real-time status from backend</Text>

                    {loadingSurveyors ? (
                        <ActivityIndicator style={{ marginTop: 20 }} />
                    ) : (
                        <ScrollView style={{ maxHeight: 300 }}>
                            {surveyorsList.length === 0 ? (
                                <Text style={{ padding: 20, textAlign: 'center', color: 'gray' }}>No data available</Text>
                            ) : (
                                surveyorsList.map((user, index) => (
                                    <View key={user.id}>
                                        <View style={styles.userRow}>
                                            <Avatar.Text size={40} label={user.full_name?.substring(0, 2).toUpperCase() || '??'} />
                                            <View style={{ marginLeft: 12, flex: 1 }}>
                                                <Text style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>{user.full_name}</Text>
                                                <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>
                                                    {user.last_login ? `Last login: ${new Date(user.last_login).toLocaleDateString()}` : 'Never logged in'}
                                                </Text>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{user.survey_count || 0}</Text>
                                                <Text style={{ fontSize: 10, color: theme.colors.onSurfaceVariant }}>Surveys</Text>
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
                        style={{ marginTop: 16 }}
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
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 14,
        marginTop: 4,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 32,
    },
    statCard: {
        width: '47%',
        borderRadius: 20,
        padding: 16,
        marginBottom: 0,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    iconContainer: {
        borderRadius: 16,
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    statTitle: {
        fontSize: 12,
        fontWeight: '500',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    actionCard: {
        marginBottom: 16,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    actionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    actionIconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    actionDescription: {
        fontSize: 12,
        lineHeight: 16,
    },
    modalContent: {
        margin: 20,
        borderRadius: 20,
        padding: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 14,
        marginBottom: 16,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
});
