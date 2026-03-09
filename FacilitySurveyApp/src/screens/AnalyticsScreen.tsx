import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Text, Surface, useTheme, IconButton, ProgressBar, Divider, Avatar, Menu, Button, ActivityIndicator, Chip } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { surveysApi, sitesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../constants/design';

interface SurveyLifecycleStat {
    site_id: string;
    site_name: string;
    draft: number;
    in_progress: number;
    submitted: number;
    total: number;
    completionRate: number;
}

export default function AnalyticsScreen() {
    const theme = useTheme();
    const navigation = useNavigation<any>();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sites, setSites] = useState<any[]>([]);
    const [selectedSite, setSelectedSite] = useState<any | null>(null);
    const [siteMenuVisible, setSiteMenuVisible] = useState(false);

    const [stats, setStats] = useState({
        totalSurveys: 0,
        submitted: 0,
        inProgress: 0,
        draft: 0,
        completionRate: 0,
        byTrade: [] as any[],
        bySite: [] as SurveyLifecycleStat[],
        recentActivity: [] as any[]
    });

    const loadData = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            // Always fetch live from the backend API — no local storage
            const [allSurveys, allSites] = await Promise.all([
                surveysApi.getAll(selectedSite?.id),
                sitesApi.getAll(),
            ]);
            setSites(allSites);

            const total = allSurveys.length;
            const submitted = allSurveys.filter((s: any) => s.status === 'submitted').length;
            const inProgress = allSurveys.filter((s: any) => s.status === 'in_progress').length;
            const draft = allSurveys.filter((s: any) => s.status === 'draft').length;

            // Trade breakdown
            const tradeMap: Record<string, number> = {};
            allSurveys.forEach((s: any) => {
                const t = s.trade || 'General';
                tradeMap[t] = (tradeMap[t] || 0) + 1;
            });
            const byTrade = Object.entries(tradeMap)
                .map(([name, count]) => ({ name, count, percent: total > 0 ? count / total : 0 }))
                .sort((a, b) => b.count - a.count);

            // Per-site lifecycle funnel
            const siteMap: Record<string, SurveyLifecycleStat> = {};
            allSurveys.forEach((s: any) => {
                const siteId = s.site_id || 'unknown';
                const siteName = s.site_name || 'Unknown';
                if (!siteMap[siteId]) {
                    siteMap[siteId] = { site_id: siteId, site_name: siteName, draft: 0, in_progress: 0, submitted: 0, total: 0, completionRate: 0 };
                }
                siteMap[siteId].total++;
                if (s.status === 'draft') siteMap[siteId].draft++;
                else if (s.status === 'in_progress') siteMap[siteId].in_progress++;
                else if (s.status === 'submitted') siteMap[siteId].submitted++;
            });
            const bySite = Object.values(siteMap).map(s => ({
                ...s,
                completionRate: s.total > 0 ? s.submitted / s.total : 0,
            })).sort((a, b) => b.total - a.total);

            setStats({
                totalSurveys: allSurveys.length,
                submitted,
                inProgress,
                draft,
                completionRate: total > 0 ? submitted / total : 0,
                byTrade,
                bySite,
                recentActivity: [...allSurveys].sort((a: any, b: any) =>
                    new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
                ).slice(0, 8),
            });
        } catch (error) {
            console.error('Failed to load analytics:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedSite]);

    // Auto-refresh whenever screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadData(true);
    };

    const statusColor = (status: string) => {
        switch (status) {
            case 'submitted': return Colors.status.successGreen;
            case 'in_progress': return Colors.status.warningAmber;
            default: return Colors.status.neutralGray;
        }
    };

    const statusLabel = (status: string) => {
        switch (status) {
            case 'submitted': return 'Submitted';
            case 'in_progress': return 'In Progress';
            default: return 'Draft';
        }
    };

    const KPICard = ({ title, value, icon, color, subtitle }: any) => (
        <Surface style={[styles.kpiCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
            <View style={[styles.iconContainer, { backgroundColor: color + '18' }]}>
                <IconButton icon={icon} iconColor={color} size={26} style={{ margin: 0 }} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.kpiValue, { color: theme.colors.onSurface }]}>{value}</Text>
                <Text style={[styles.kpiTitle, { color: theme.colors.onSurfaceVariant }]}>{title}</Text>
                {subtitle && <Text style={[styles.kpiSubtitle, { color }]}>{subtitle}</Text>}
            </View>
        </Surface>
    );

    const ChartBar = ({ label, value, color, percent }: any) => (
        <View style={styles.chartRow}>
            <View style={styles.chartLabelContainer}>
                <Text style={[styles.chartLabel, { color: theme.colors.onSurface }]} numberOfLines={1}>{label}</Text>
            </View>
            <View style={styles.chartBarContainer}>
                <View style={[styles.chartBarBg, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <View style={[styles.chartBarFill, { width: `${Math.min(percent * 100, 100)}%`, backgroundColor: color }]} />
                </View>
            </View>
            <Text style={[styles.chartValue, { color: theme.colors.onSurfaceVariant }]}>{value}</Text>
        </View>
    );

    // Per-site lifecycle funnel component
    const SiteLifecycleRow = ({ site }: { site: SurveyLifecycleStat }) => (
        <View style={[styles.siteCard, { backgroundColor: theme.colors.surfaceVariant + '60', borderRadius: 12, padding: 14, marginBottom: 12 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[styles.siteName, { color: theme.colors.onSurface }]} numberOfLines={1}>{site.site_name}</Text>
                <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, fontWeight: '600' }}>
                    {Math.round(site.completionRate * 100)}% done
                </Text>
            </View>

            {/* Lifecycle bar */}
            <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
                {site.submitted > 0 && (
                    <View style={{ flex: site.submitted, backgroundColor: Colors.status.successGreen }} />
                )}
                {site.in_progress > 0 && (
                    <View style={{ flex: site.in_progress, backgroundColor: Colors.status.warningAmber }} />
                )}
                {site.draft > 0 && (
                    <View style={{ flex: site.draft, backgroundColor: theme.colors.surfaceVariant }} />
                )}
            </View>

            {/* Counts row */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
                <Chip compact icon="check-circle" textStyle={{ fontSize: 11 }} style={{ backgroundColor: Colors.status.successGreen + '20' }}>
                    {site.submitted} Submitted
                </Chip>
                <Chip compact icon="progress-clock" textStyle={{ fontSize: 11 }} style={{ backgroundColor: Colors.status.warningAmber + '20' }}>
                    {site.in_progress} In Progress
                </Chip>
                <Chip compact icon="file-outline" textStyle={{ fontSize: 11 }} style={{ backgroundColor: theme.colors.surfaceVariant }}>
                    {site.draft} Draft
                </Chip>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} />
                        <View>
                            <Text style={[styles.title, { color: theme.colors.onBackground }]}>Analytics</Text>
                            <Text style={styles.subtitle}>Live survey lifecycle overview</Text>
                        </View>
                    </View>

                    {/* Site filter */}
                    <Menu
                        visible={siteMenuVisible}
                        onDismiss={() => setSiteMenuVisible(false)}
                        anchor={
                            <Button
                                mode="outlined"
                                onPress={() => setSiteMenuVisible(true)}
                                icon="chevron-down"
                                contentStyle={{ flexDirection: 'row-reverse' }}
                                compact
                            >
                                {selectedSite ? selectedSite.name.slice(0, 14) : 'All Sites'}
                            </Button>
                        }
                    >
                        <Menu.Item onPress={() => { setSelectedSite(null); setSiteMenuVisible(false); }} title="All Sites" />
                        <Divider />
                        {sites.map(site => (
                            <Menu.Item key={site.id} onPress={() => { setSelectedSite(site); setSiteMenuVisible(false); }} title={site.name} />
                        ))}
                    </Menu>
                </View>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" />
                    <Text style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>Loading live data...</Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {/* KPI Row */}
                    <View style={styles.kpiRow}>
                        <KPICard title="Total Surveys" value={stats.totalSurveys} icon="file-document-multiple" color={theme.colors.primary} />
                        <KPICard
                            title="Completion"
                            value={`${Math.round(stats.completionRate * 100)}%`}
                            icon="check-circle"
                            color={Colors.status.successGreen}
                            subtitle={`${stats.submitted} submitted`}
                        />
                    </View>

                    {/* Status Breakdown */}
                    <Surface style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Lifecycle Status</Text>
                        <Divider style={styles.divider} />
                        <View style={styles.statusRow}>
                            <View style={styles.statusItem}>
                                <Text style={[styles.statusCount, { color: Colors.status.successGreen }]}>{stats.submitted}</Text>
                                <Text style={styles.statusLabel}>Submitted</Text>
                                <View style={[styles.miniBar, { backgroundColor: theme.colors.surfaceVariant, overflow: 'hidden' }]}>
                                    <View style={{ height: '100%', backgroundColor: Colors.status.successGreen, width: `${stats.totalSurveys ? (stats.submitted / stats.totalSurveys) * 100 : 0}%` }} />
                                </View>
                            </View>
                            <View style={styles.statusItem}>
                                <Text style={[styles.statusCount, { color: Colors.status.warningAmber }]}>{stats.inProgress}</Text>
                                <Text style={styles.statusLabel}>In Progress</Text>
                                <View style={[styles.miniBar, { backgroundColor: theme.colors.surfaceVariant, overflow: 'hidden' }]}>
                                    <View style={{ height: '100%', backgroundColor: Colors.status.warningAmber, width: `${stats.totalSurveys ? (stats.inProgress / stats.totalSurveys) * 100 : 0}%` }} />
                                </View>
                            </View>
                            <View style={styles.statusItem}>
                                <Text style={[styles.statusCount, { color: theme.colors.onSurfaceVariant }]}>{stats.draft}</Text>
                                <Text style={styles.statusLabel}>Draft</Text>
                                <View style={[styles.miniBar, { backgroundColor: theme.colors.surfaceVariant, overflow: 'hidden' }]}>
                                    <View style={{ height: '100%', backgroundColor: theme.colors.outline, width: `${stats.totalSurveys ? (stats.draft / stats.totalSurveys) * 100 : 0}%` }} />
                                </View>
                            </View>
                        </View>
                    </Surface>

                    {/* Per-Site Lifecycle Funnel */}
                    <Surface style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Site-Level Lifecycle</Text>
                        <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginBottom: 16, marginTop: -8 }}>
                            Submitted · In Progress · Draft
                        </Text>
                        <Divider style={styles.divider} />
                        {stats.bySite.length === 0 ? (
                            <View style={styles.emptyChartContainer}>
                                <Avatar.Icon size={48} icon="office-building-marker" style={{ backgroundColor: theme.colors.surfaceVariant }} color={theme.colors.onSurfaceVariant} />
                                <Text style={styles.emptyText}>No site data available</Text>
                            </View>
                        ) : (
                            stats.bySite.map(site => <SiteLifecycleRow key={site.site_id} site={site} />)
                        )}
                    </Surface>

                    {/* Trade Performance */}
                    <Surface style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Surveys by Trade</Text>
                        <Divider style={styles.divider} />
                        {stats.byTrade.map((item, index) => {
                            const barColors = [theme.colors.primary, theme.colors.tertiary, Colors.status.infoBlue, Colors.status.successGreen, Colors.status.warningAmber];
                            return (
                                <ChartBar key={index} label={item.name} value={item.count} percent={item.percent} color={barColors[index % barColors.length]} />
                            );
                        })}
                        {stats.byTrade.length === 0 && (
                            <View style={styles.emptyChartContainer}>
                                <Avatar.Icon size={48} icon="chart-bar" style={{ backgroundColor: theme.colors.surfaceVariant }} color={theme.colors.onSurfaceVariant} />
                                <Text style={styles.emptyText}>No trade data available</Text>
                            </View>
                        )}
                    </Surface>

                    {/* Recent Activity */}
                    <Surface style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Recent Activity</Text>
                        <Divider style={styles.divider} />
                        {stats.recentActivity.map((survey: any, index: number) => (
                            <View key={index} style={[styles.activityRow, { borderBottomColor: theme.colors.surfaceVariant }]}>
                                <View style={[styles.statusDot, { backgroundColor: statusColor(survey.status) }]} />
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.activityTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
                                        {survey.site_name || 'Unknown Site'} — {survey.trade || 'General'}
                                    </Text>
                                    <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>
                                        {statusLabel(survey.status)} · {new Date(survey.updated_at || survey.created_at).toLocaleDateString()}
                                    </Text>
                                </View>
                            </View>
                        ))}
                        {stats.recentActivity.length === 0 && (
                            <View style={styles.emptyChartContainer}>
                                <Text style={styles.emptyText}>No recent activity</Text>
                            </View>
                        )}
                    </Surface>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 10, paddingVertical: 10 },
    title: { fontSize: 24, fontWeight: 'bold' },
    subtitle: { paddingHorizontal: 20, fontSize: 13, color: Colors.status.neutralGray, marginTop: -3, marginBottom: 4 },
    scrollContent: { padding: 20 },

    kpiRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
    kpiCard: { flex: 1, borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', elevation: 3 },
    iconContainer: { borderRadius: 14, marginRight: 14, width: 46, height: 46, justifyContent: 'center', alignItems: 'center' },
    kpiValue: { fontSize: 28, fontWeight: 'bold', lineHeight: 34 },
    kpiTitle: { fontSize: 12, fontWeight: '500', marginTop: 2 },
    kpiSubtitle: { fontSize: 11, marginTop: 4, fontWeight: '700' },

    sectionCard: { borderRadius: 20, padding: 24, marginBottom: 24, elevation: 3 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
    divider: { marginBottom: 20, height: 1 },

    statusRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    statusItem: { flex: 1, alignItems: 'center' },
    statusCount: { fontSize: 32, fontWeight: 'bold', marginBottom: 4 },
    statusLabel: { fontSize: 12, color: Colors.status.neutralGray, marginBottom: 12, fontWeight: '500' },
    miniBar: { width: '80%', height: 6, borderRadius: 3 },

    chartRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    chartLabelContainer: { width: 110 },
    chartLabel: { fontSize: 13, fontWeight: '600' },
    chartBarContainer: { flex: 1, marginHorizontal: 14 },
    chartBarBg: { height: 10, borderRadius: 5, overflow: 'hidden' },
    chartBarFill: { height: '100%', borderRadius: 5 },
    chartValue: { width: 36, textAlign: 'right', fontSize: 13, fontWeight: '700' },

    siteCard: {},
    siteName: { fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 },

    activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
    statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
    activityTitle: { fontSize: 13, fontWeight: '600' },

    emptyChartContainer: { alignItems: 'center', paddingVertical: 28 },
    emptyText: { fontSize: 15, fontWeight: 'bold', marginTop: 12, color: Colors.status.neutralGray },
});
