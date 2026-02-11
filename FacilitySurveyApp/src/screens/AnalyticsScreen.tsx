import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Text, Surface, useTheme, IconButton, ProgressBar, Divider, Avatar, Menu, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as hybridStorage from '../services/hybridStorage';

const screenWidth = Dimensions.get('window').width;

export default function AnalyticsScreen() {
    const theme = useTheme();
    const navigation = useNavigation<any>();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalSurveys: 0,
        completed: 0,
        inProgress: 0,
        draft: 0,
        completionRate: 0,
        byTrade: [] as any[],
        bySite: [] as any[],
        recentActivity: [] as any[]
    });

    // Site Filter
    const [sites, setSites] = useState<any[]>([]);
    const [selectedSite, setSelectedSite] = useState<any | null>(null);
    const [siteMenuVisible, setSiteMenuVisible] = useState(false);

    useEffect(() => {
        loadSites();
    }, []);

    useEffect(() => {
        loadData();
    }, [selectedSite]);

    const loadSites = async () => {
        const allSites = await hybridStorage.getSites();
        setSites(allSites);
    };

    const loadData = async () => {
        setLoading(true);
        let surveys = await hybridStorage.getSurveys();

        if (selectedSite) {
            surveys = surveys.filter((s: any) => s.site_name === selectedSite.name);
        }

        // Basic Counts
        const total = surveys.length;
        const completed = surveys.filter((s: any) => s.status === 'submitted').length;
        const inProgress = surveys.filter((s: any) => s.status === 'in_progress').length;
        const draft = surveys.filter((s: any) => s.status === 'draft').length;

        // Trades Breakdown
        const trades: { [key: string]: number } = {};
        surveys.forEach((s: any) => {
            const trade = s.trade || 'General';
            trades[trade] = (trades[trade] || 0) + 1;
        });

        const tradeData = Object.keys(trades).map(key => ({
            name: key,
            count: trades[key],
            percent: total > 0 ? trades[key] / total : 0
        })).sort((a, b) => b.count - a.count);

        // Sites Breakdown
        const sites: { [key: string]: { total: number, completed: number } } = {};
        surveys.forEach((s: any) => {
            const site = s.site_name || 'Unknown';
            if (!sites[site]) sites[site] = { total: 0, completed: 0 };
            sites[site].total++;
            if (s.status === 'submitted') sites[site].completed++;
        });

        const siteData = Object.keys(sites).map(key => ({
            name: key,
            total: sites[key].total,
            completed: sites[key].completed,
            rate: sites[key].total > 0 ? sites[key].completed / sites[key].total : 0
        })).sort((a, b) => b.total - a.total).slice(0, 5); // Top 5

        setStats({
            totalSurveys: total,
            completed,
            inProgress,
            draft,
            completionRate: total > 0 ? completed / total : 0,
            byTrade: tradeData,
            bySite: siteData,
            recentActivity: surveys.slice(0, 5)
        });
        setLoading(false);
    };

    const KPICard = ({ title, value, icon, color, subtitle }: any) => (
        <Surface style={[styles.kpiCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
            <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                <IconButton icon={icon} iconColor={color} size={28} style={{ margin: 0 }} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.kpiValue, { color: theme.colors.onSurface }]}>{value}</Text>
                <Text style={[styles.kpiTitle, { color: theme.colors.onSurfaceVariant }]}>{title}</Text>
                {subtitle && <Text style={[styles.kpiSubtitle, { color: color }]}>{subtitle}</Text>}
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
                    <View style={[styles.chartBarFill, { width: `${percent * 100}%`, backgroundColor: color }]} />
                </View>
            </View>
            <Text style={[styles.chartValue, { color: theme.colors.onSurfaceVariant }]}>{value}</Text>
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
                            <Text style={styles.subtitle}>Overview Performance</Text>
                        </View>
                    </View>
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
                                {selectedSite ? selectedSite.name : "All Sites"}
                            </Button>
                        }
                    >
                        <Menu.Item
                            onPress={() => {
                                setSelectedSite(null);
                                setSiteMenuVisible(false);
                            }}
                            title="All Sites"
                        />
                        <Divider />
                        {sites.map(site => (
                            <Menu.Item
                                key={site.id}
                                onPress={() => {
                                    setSelectedSite(site);
                                    setSiteMenuVisible(false);
                                }}
                                title={site.name}
                            />
                        ))}
                    </Menu>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* KPI Row */}
                <View style={styles.kpiRow}>
                    <KPICard
                        title="Total Surveys"
                        value={stats.totalSurveys}
                        icon="file-document-multiple"
                        color={theme.colors.primary}
                    />
                    <KPICard
                        title="Completion"
                        value={`${Math.round(stats.completionRate * 100)}%`}
                        icon="check-circle"
                        color={theme.colors.tertiary}
                        subtitle={`${stats.completed} done`}
                    />
                </View>

                {/* Status Breakdown */}
                <Surface style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Status Breakdown</Text>
                    <Divider style={styles.divider} />

                    <View style={styles.statusRow}>
                        <View style={styles.statusItem}>
                            <Text style={[styles.statusCount, { color: theme.colors.tertiary }]}>{stats.completed}</Text>
                            <Text style={styles.statusLabel}>Submitted</Text>
                            <ProgressBar progress={stats.totalSurveys ? stats.completed / stats.totalSurveys : 0} color={theme.colors.tertiary} style={styles.miniBar} />
                        </View>
                        <View style={styles.statusItem}>
                            <Text style={[styles.statusCount, { color: theme.colors.secondary }]}>{stats.inProgress}</Text>
                            <Text style={styles.statusLabel}>In Progress</Text>
                            <ProgressBar progress={stats.totalSurveys ? stats.inProgress / stats.totalSurveys : 0} color={theme.colors.secondary} style={styles.miniBar} />
                        </View>
                        <View style={styles.statusItem}>
                            <Text style={[styles.statusCount, { color: theme.colors.outline }]}>{stats.draft}</Text>
                            <Text style={styles.statusLabel}>Draft</Text>
                            <ProgressBar progress={stats.totalSurveys ? stats.draft / stats.totalSurveys : 0} color={theme.colors.outline} style={styles.miniBar} />
                        </View>
                    </View>
                </Surface>

                {/* Trade Performance */}
                <Surface style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Surveys by Trade</Text>
                    <Divider style={styles.divider} />
                    {stats.byTrade.map((item, index) => (
                        <ChartBar
                            key={index}
                            label={item.name}
                            value={item.count}
                            percent={item.percent}
                            color={theme.colors.primary}
                        />
                    ))}
                    {stats.byTrade.length === 0 && (
                        <View style={styles.emptyChartContainer}>
                            <Avatar.Icon size={48} icon="chart-bar" style={{ backgroundColor: theme.colors.surfaceVariant }} color={theme.colors.onSurfaceVariant} />
                            <Text style={styles.emptyText}>No trade data available</Text>
                            <Text style={styles.emptySubText}>Start surveys to see breakdown</Text>
                        </View>
                    )}
                </Surface>

                {/* Site Performance */}
                <Surface style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Top Sites Activity</Text>
                    <Divider style={styles.divider} />
                    {stats.bySite.map((site, index) => (
                        <View key={index} style={styles.siteRow}>
                            <Avatar.Icon size={36} icon="office-building" style={{ backgroundColor: theme.colors.secondaryContainer }} color={theme.colors.onSecondaryContainer} />
                            <View style={{ marginLeft: 12, flex: 1 }}>
                                <Text style={[styles.siteName, { color: theme.colors.onSurface }]}>{site.name}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                    <View style={{ flex: 1, height: 4, backgroundColor: theme.colors.surfaceVariant, borderRadius: 2, marginRight: 8 }}>
                                        <View style={{ width: `${site.rate * 100}%`, height: '100%', backgroundColor: theme.colors.tertiary, borderRadius: 2 }} />
                                    </View>
                                    <Text style={{ fontSize: 10, color: theme.colors.onSurfaceVariant }}>{site.completed}/{site.total}</Text>
                                </View>
                            </View>
                        </View>
                    ))}
                    {stats.bySite.length === 0 && (
                        <View style={styles.emptyChartContainer}>
                            <Avatar.Icon size={48} icon="office-building-marker" style={{ backgroundColor: theme.colors.surfaceVariant }} color={theme.colors.onSurfaceVariant} />
                            <Text style={styles.emptyText}>No site activity yet</Text>
                            <Text style={styles.emptySubText}>Complete surveys to track performance</Text>
                        </View>
                    )}
                </Surface>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 10, paddingVertical: 10 },
    title: { fontSize: 24, fontWeight: 'bold' },
    subtitle: { paddingHorizontal: 20, fontSize: 14, color: 'gray', marginTop: -5, marginBottom: 10 },
    scrollContent: { padding: 20 },

    kpiRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
    kpiCard: { flex: 1, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
    iconContainer: { borderRadius: 16, marginRight: 16, width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
    kpiValue: { fontSize: 28, fontWeight: 'bold', lineHeight: 34 },
    kpiTitle: { fontSize: 13, fontWeight: '500', marginTop: 2 },
    kpiSubtitle: { fontSize: 11, marginTop: 4, fontWeight: '700' },

    sectionCard: { borderRadius: 20, padding: 24, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
    divider: { marginBottom: 20, backgroundColor: '#f0f0f0', height: 1 },

    statusRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    statusItem: { flex: 1, alignItems: 'center' },
    statusCount: { fontSize: 32, fontWeight: 'bold', marginBottom: 4 },
    statusLabel: { fontSize: 13, color: 'gray', marginBottom: 12, fontWeight: '500' },
    miniBar: { width: '80%', height: 6, borderRadius: 3 },

    chartRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    chartLabelContainer: { width: 110 },
    chartLabel: { fontSize: 14, fontWeight: '600' },
    chartBarContainer: { flex: 1, marginHorizontal: 16 },
    chartBarBg: { height: 10, borderRadius: 5, overflow: 'hidden' },
    chartBarFill: { height: '100%', borderRadius: 5 },
    chartValue: { width: 40, textAlign: 'right', fontSize: 13, fontWeight: '700' },

    siteRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    siteName: { fontSize: 15, fontWeight: '700', marginBottom: 6 },

    emptyChartContainer: { alignItems: 'center', paddingVertical: 32 },
    emptyText: { fontSize: 16, fontWeight: 'bold', marginTop: 16, color: 'gray' },
    emptySubText: { fontSize: 13, color: '#9ca3af', marginTop: 4 },
});
