import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, StatusBar, SafeAreaView, Platform } from 'react-native';
import { Text, FAB, useTheme, Surface, Avatar, IconButton, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { storage } from '../services/storage';

export default function HomeScreen() {
    const navigation = useNavigation<any>();
    const theme = useTheme();
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [inProgressSurveys, setInProgressSurveys] = useState<any[]>([]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadDashboardData();
        });
        return unsubscribe;
    }, [navigation]);

    const loadDashboardData = async () => {
        const allSurveys = await storage.getSurveys();

        // Filter in-progress surveys
        const inProgress = allSurveys.filter((s: any) => s.status === 'in_progress' || s.status === 'draft');
        inProgress.sort((a: any, b: any) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
        setInProgressSurveys(inProgress);

        // Recent activity (all surveys)
        const recent = [...allSurveys];
        recent.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setRecentActivity(recent.slice(0, 5));
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const isCompleted = status === 'completed';
        const color = isCompleted ? '#800000' : '#B45309'; // Maroon or Gold
        const bg = isCompleted ? '#FFD7D7' : '#FEF3C7';
        return (
            <View style={{ backgroundColor: bg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: color + '40' }}>
                <Text style={{ color: color, fontSize: 11, fontWeight: '800' }}>{status.toUpperCase()}</Text>
            </View>
        );
    }

    const StatCard = ({ title, count, icon, color }: any) => (
        <Surface style={[styles.statCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
            <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
                <Avatar.Icon size={32} icon={icon} style={{ backgroundColor: 'transparent' }} color={color} />
            </View>
            <View>
                <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, fontWeight: '600' }}>{title}</Text>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.colors.onSurface, lineHeight: 28 }}>{count}</Text>
            </View>
        </Surface>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />

            {/* Header / Banner */}
            <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]} elevation={1}>
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Surface style={{ backgroundColor: theme.colors.primary, width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 }} elevation={2}>
                                <Text style={{ fontSize: 26 }}>🏗️</Text>
                            </Surface>
                            <View>
                                <Text style={{ color: theme.colors.primary, fontSize: 22, fontWeight: '900', letterSpacing: -0.5 }}>CIT OPS</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#800000', marginRight: 6 }} />
                                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>CONNECTED</Text>
                                </View>
                            </View>
                        </View>
                        <IconButton
                            icon="account-circle-outline"
                            iconColor={theme.colors.primary}
                            size={28}
                            style={{ margin: 0 }}
                            onPress={() => navigation.navigate('ProfileTab')}
                        />
                    </View>
                </SafeAreaView>
            </Surface>

            {/* Main Content Area */}
            <View style={styles.contentContainer}>

                {/* Main Action - Start Survey */}
                <Button
                    mode="contained"
                    icon="plus"
                    style={{ borderRadius: 12, marginBottom: 16 }}
                    contentStyle={{ height: 56, justifyContent: 'flex-start' }}
                    labelStyle={{ fontSize: 18, fontWeight: 'bold' }}
                    buttonColor={theme.colors.primary}
                    textColor={theme.colors.onPrimary}
                    onPress={() => navigation.navigate('StartSurvey')}
                >
                    Start New Survey
                </Button>

                {/* In-Progress Surveys */}
                {inProgressSurveys.length > 0 && (
                    <View style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                            In Progress ({inProgressSurveys.length})
                        </Text>
                        {inProgressSurveys.slice(0, 3).map((survey) => (
                            <Surface
                                key={survey.id}
                                style={[styles.resumeCard, { backgroundColor: theme.colors.secondaryContainer, marginBottom: 8 }]}
                                elevation={1}
                            >
                                <View style={{ borderRadius: 16, overflow: 'hidden' }}>
                                    <TouchableOpacity
                                        style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
                                        onPress={async () => {
                                            // Load assets and navigate to AssetInspectionScreen
                                            const assets = await storage.getAssets();
                                            const surveyAssets = assets.filter((a: any) =>
                                                a.site_name === survey.site_name &&
                                                (!survey.trade || a.service_line === survey.trade) &&
                                                (!survey.location || a.floor === survey.location || a.area === survey.location)
                                            );

                                            navigation.navigate('AssetInspection', {
                                                surveyId: survey.id,
                                                siteName: survey.site_name,
                                                trade: survey.trade,
                                                location: survey.location, // Pass location too
                                                preloadedAssets: surveyAssets,
                                                assetOption: 'resume'
                                            });
                                        }}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: theme.colors.onSecondaryContainer, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>RESUME</Text>
                                            <Text style={{ color: theme.colors.onSecondaryContainer, fontSize: 16, fontWeight: 'bold' }}>
                                                {survey.site_name || 'Unnamed Site'}
                                            </Text>
                                            <Text style={{ color: theme.colors.onSecondaryContainer, fontSize: 12 }}>
                                                {survey.trade || 'No Trade'} • {new Date(survey.updated_at || survey.created_at).toLocaleDateString()}
                                            </Text>
                                        </View>
                                        <Avatar.Icon size={40} icon="chevron-right" style={{ backgroundColor: theme.colors.primary }} color={theme.colors.onPrimary} />
                                    </TouchableOpacity>
                                </View>
                            </Surface>
                        ))}
                        {inProgressSurveys.length > 3 && (
                            <TouchableOpacity
                                onPress={() => navigation.navigate('Reports')}
                                style={{ alignItems: 'center', paddingVertical: 8 }}
                            >
                                <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
                                    View all {inProgressSurveys.length} in-progress surveys
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Recent Activity List */}
                <View style={styles.sectionHeader}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.onSurface }}>Recent Reports</Text>
                    <TouchableOpacity>
                        <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>View All</Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={recentActivity}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <Surface style={[styles.listCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                            <View style={{ borderRadius: 16, overflow: 'hidden' }}>
                                <TouchableOpacity
                                    onPress={() => navigation.navigate('Survey', { surveyId: item.id, templateId: item.template_id })}
                                    style={styles.listCardInner}
                                >
                                    <View style={[styles.listIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
                                        <Avatar.Icon size={24} icon="file-document-check-outline" color={theme.colors.onSurfaceVariant} style={{ backgroundColor: 'transparent' }} />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 16 }}>
                                        <Text style={{ fontWeight: '700', fontSize: 16, color: theme.colors.onSurface, marginBottom: 2 }}>{item.location}</Text>
                                        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>{item.department} • {new Date(item.created_at).toLocaleDateString()}</Text>
                                    </View>
                                    <StatusBadge status={item.status} />
                                </TouchableOpacity>
                            </View>
                        </Surface>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Avatar.Icon size={64} icon="clipboard-text-off-outline" style={{ backgroundColor: theme.colors.surfaceVariant }} color={theme.colors.secondary} />
                            <Text style={{ marginTop: 16, color: '#64748B', fontSize: 16 }}>No inspections found.</Text>
                            <Text style={{ color: '#94A3B8', marginTop: 4 }}>Start your first inspection above.</Text>
                        </View>
                    }
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: Platform.OS === 'android' ? 20 : 0,
        paddingBottom: 20, // Reduced from 40 to avoid awkward gap if we remove negative margin
        paddingHorizontal: 20,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        zIndex: 1,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 20,
        marginTop: 20, // Changed from negative margin to positive spacing
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    statCard: {
        flex: 0.48,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
    },
    resumeCard: {
        borderRadius: 16,
        marginBottom: 24,
        // overflow: 'hidden' // Moved to inner View
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    actionRow: {
        flexDirection: 'row',
        marginBottom: 24
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    listCard: {
        marginBottom: 12,
        borderRadius: 16,
        // overflow: 'hidden', // Moved to inner View
    },
    listCardInner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16
    },
    listIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center'
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
    },
});
