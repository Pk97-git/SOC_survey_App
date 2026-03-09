import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { Text, Surface, useTheme, Searchbar, Chip, IconButton, Avatar, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as hybridStorage from '../services/hybridStorage';
import { Colors, Radius, Typography, Spacing, Layout } from '../constants/design';

export default function ReviewerDashboardScreen() {
    const theme = useTheme();
    const navigation = useNavigation<any>();

    const [sites, setSites] = useState<any[]>([]);
    const [selectedSite, setSelectedSite] = useState<any | null>(null);
    const [surveys, setSurveys] = useState<any[]>([]);
    const [filteredSurveys, setFilteredSurveys] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    const [stats, setStats] = useState({ total: 0, pending: 0, inReview: 0, completed: 0 });

    useFocusEffect(
        React.useCallback(() => {
            if (!selectedSite) {
                loadSites();
            } else {
                loadSiteSurveys(selectedSite.id);
            }
        }, [selectedSite])
    );

    useEffect(() => {
        filterSurveys();
    }, [surveys, searchQuery, statusFilter]);

    const loadSites = async () => {
        try {
            setLoading(true);
            const userSites = await hybridStorage.getSites();
            setSites(userSites || []);
        } catch (error) {
            console.error('Failed to load sites:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadSiteSurveys = async (siteId: string) => {
        try {
            setLoading(true);
            const allSurveys = await hybridStorage.getSurveys(siteId);
            const pending = allSurveys.filter((s: any) => s.status === 'submitted').length;
            const inReview = allSurveys.filter((s: any) => s.status === 'under_review').length;
            const completed = allSurveys.filter((s: any) => s.status === 'completed').length;
            setStats({ total: allSurveys.length, pending, inReview, completed });
            const reviewableSurveys = allSurveys.filter((s: any) =>
                s.status === 'submitted' || s.status === 'under_review' || s.status === 'completed'
            );
            setSurveys(reviewableSurveys);
        } catch (error) {
            console.error('Failed to load surveys:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSiteSelect = (site: any) => {
        setSearchQuery('');
        setStatusFilter('all');
        setSelectedSite(site);
    };

    const handleBackToSites = () => {
        setSelectedSite(null);
        setSurveys([]);
    };

    const filterSurveys = () => {
        let filtered = [...surveys];
        if (searchQuery) {
            filtered = filtered.filter(s =>
                s.trade?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.surveyor_name?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        if (statusFilter !== 'all') {
            filtered = filtered.filter(s => s.status === statusFilter);
        }
        setFilteredSurveys(filtered);
    };

    // Status badge using design tokens — no hardcoded colors
    const StatusBadge = ({ status }: { status: string }) => {
        const style = Colors.surveyStatus[status] ?? Colors.surveyStatus['draft'];
        return (
            <View style={{
                backgroundColor: style.bg,
                borderColor: style.border,
                borderWidth: 1,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: Radius.full,
            }}>
                <Text style={[Typography.labelXs, { color: style.text }]}>
                    {status?.toUpperCase().replace('_', ' ') || 'UNKNOWN'}
                </Text>
            </View>
        );
    };

    // ── VIEW 1: SITE SELECTION ────────────────────────────────────────────────
    if (!selectedSite) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

                {/* Header band */}
                <Surface style={[styles.headerBand, { backgroundColor: theme.colors.primary }]} elevation={3}>
                    <View style={styles.headerBandContent}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={[styles.brandIconBox, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                                <MaterialCommunityIcons name="file-document-check-outline" size={22} color="#FFFFFF" />
                            </View>
                            <View style={{ marginLeft: Spacing[3] }}>
                                <Text style={[Typography.h3, { color: '#FFFFFF' }]}>All Sites</Text>
                                <View style={[styles.rolePill, { backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 3 }]}>
                                    <Text style={[Typography.labelXs, { color: 'rgba(255,255,255,0.9)' }]}>REVIEWER PORTAL</Text>
                                </View>
                            </View>
                        </View>
                        <IconButton
                            icon="account-circle-outline"
                            iconColor="#FFFFFF"
                            size={26}
                            style={{ margin: 0 }}
                            onPress={() => navigation.navigate('ProfileTab')}
                        />
                    </View>
                </Surface>

                <View style={styles.siteListContent}>
                    <Text style={[Typography.bodyMd, { color: theme.colors.onSurfaceVariant, marginBottom: Spacing[4] }]}>
                        Select a site to review surveys
                    </Text>

                    {sites.length === 0 && !loading ? (
                        <View style={styles.emptyContainer}>
                            <Avatar.Icon size={64} icon="domain-off" style={{ backgroundColor: theme.colors.surfaceVariant }} color={theme.colors.onSurfaceVariant} />
                            <Text style={[Typography.bodyMd, { marginTop: Spacing[4], color: theme.colors.onSurfaceVariant, textAlign: 'center' }]}>
                                No sites available.
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={sites}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 100 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity onPress={() => handleSiteSelect(item)} activeOpacity={0.7}>
                                    <Surface style={[styles.siteCard, {
                                        backgroundColor: theme.colors.surface,
                                        borderColor: theme.colors.outlineVariant,
                                    }]} elevation={2}>
                                        <View style={[styles.siteAccent, { backgroundColor: theme.colors.primary }]} />
                                        <View style={styles.siteIconBox}>
                                            <Avatar.Icon size={40} icon="office-building-marker-outline" color={theme.colors.primary} style={{ backgroundColor: theme.colors.primaryContainer }} />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: Spacing[4] }}>
                                            <Text style={[Typography.h4, { color: theme.colors.onSurface }]}>{item.name}</Text>
                                            <Text style={[Typography.bodySm, { color: theme.colors.onSurfaceVariant, marginTop: 3 }]}>
                                                {item.location || 'Location not set'}
                                            </Text>
                                        </View>
                                        <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
                                    </Surface>
                                </TouchableOpacity>
                            )}
                        />
                    )}
                </View>
            </View>
        );
    }

    // ── VIEW 2: SURVEYS DRILL-DOWN ────────────────────────────────────────────
    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

            {/* Header band */}
            <Surface style={[styles.headerBand, { backgroundColor: theme.colors.primary }]} elevation={3}>
                <View style={styles.headerBandContent}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <IconButton icon="arrow-left" iconColor="#FFFFFF" size={24} onPress={handleBackToSites} style={{ margin: 0, marginLeft: -8 }} />
                        <View style={{ flex: 1, marginLeft: Spacing[2] }}>
                            <Text style={[Typography.h3, { color: '#FFFFFF' }]} numberOfLines={1}>
                                {selectedSite.name}
                            </Text>
                            <Text style={[Typography.bodyXs, { color: 'rgba(255,255,255,0.75)', marginTop: 2 }]}>
                                {filteredSurveys.length} surveys
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.rolePill, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                        <Text style={[Typography.labelXs, { color: 'rgba(255,255,255,0.9)' }]}>REVIEWER</Text>
                    </View>
                </View>
            </Surface>

            {/* KPI Cards */}
            <View style={{ marginBottom: Spacing[4], paddingHorizontal: Layout.screenPaddingH }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing[3], paddingVertical: Spacing[4], paddingRight: Spacing[5] }}>
                    {[
                        { label: 'Total', value: stats.total, color: theme.colors.primary },
                        { label: 'Pending', value: stats.pending, color: Colors.status.warningAmber },
                        { label: 'In Review', value: stats.inReview, color: Colors.status.infoBlue },
                        { label: 'Approved', value: stats.completed, color: Colors.status.successGreen },
                    ].map((kpi) => (
                        <Surface key={kpi.label} style={[styles.kpiCard, {
                            backgroundColor: theme.colors.surface,
                            borderTopColor: kpi.color,
                            borderColor: theme.colors.outlineVariant,
                        }]} elevation={1}>
                            <Text style={[Typography.statMd, { color: kpi.color }]}>{kpi.value}</Text>
                            <Text style={[Typography.labelSm, { color: theme.colors.onSurfaceVariant, marginTop: 2 }]}>{kpi.label}</Text>
                        </Surface>
                    ))}
                </ScrollView>
            </View>

            {/* Search + Filters */}
            <View style={{ paddingHorizontal: Layout.screenPaddingH }}>
                <Searchbar
                    placeholder="Search location, trade, surveyor..."
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}
                    elevation={1}
                />
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterRow}
                    data={[
                        { key: 'all', label: 'All' },
                        { key: 'submitted', label: 'Pending' },
                        { key: 'under_review', label: 'In Review' },
                        { key: 'completed', label: 'Completed' },
                    ]}
                    renderItem={({ item }) => (
                        <Chip
                            selected={statusFilter === item.key}
                            onPress={() => setStatusFilter(item.key)}
                            style={[styles.chip, statusFilter === item.key && {
                                backgroundColor: theme.colors.primaryContainer,
                            }]}
                        >
                            {item.label}
                        </Chip>
                    )}
                />
            </View>

            {/* Survey List */}
            <FlatList
                data={filteredSurveys}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[styles.listContent, { paddingHorizontal: Layout.screenPaddingH }]}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <Surface style={[styles.card, {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.outlineVariant,
                        borderLeftColor: Colors.surveyStatus[item.status]?.border ?? theme.colors.outlineVariant,
                    }]} elevation={1}>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('ReviewSurvey', { surveyId: item.id })}
                            style={styles.cardContent}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={[Typography.h4, { color: theme.colors.onSurface, marginBottom: 3 }]}>
                                    {item.trade || 'General'}
                                </Text>
                                <Text style={[Typography.bodyMd, { color: theme.colors.onSurfaceVariant, marginBottom: 2 }]}>
                                    {item.location || 'Building'} · {item.surveyor_name || 'Unassigned'}
                                </Text>
                                <Text style={[Typography.bodyXs, { color: theme.colors.onSurfaceVariant }]}>
                                    Submitted: {new Date(item.submitted_at || item.created_at).toLocaleDateString()}
                                </Text>
                            </View>
                            <StatusBadge status={item.status} />
                        </TouchableOpacity>
                    </Surface>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Avatar.Icon size={56} icon="file-search-outline" style={{ backgroundColor: theme.colors.surfaceVariant }} color={theme.colors.onSurfaceVariant} />
                        <Text style={[Typography.bodyMd, { color: theme.colors.onSurfaceVariant, marginTop: Spacing[4], textAlign: 'center' }]}>
                            No surveys found matching the criteria.
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerBand: {
        paddingBottom: Spacing[4],
        paddingHorizontal: Layout.screenPaddingH,
        borderBottomLeftRadius: Radius.xl,
        borderBottomRightRadius: Radius.xl,
        zIndex: 1,
    },
    headerBandContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing[2],
        paddingTop: Spacing[3],
    },
    brandIconBox: {
        width: 44,
        height: 44,
        borderRadius: Radius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rolePill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: Radius.xs,
    },
    siteListContent: {
        flex: 1,
        paddingHorizontal: Layout.screenPaddingH,
        paddingTop: Spacing[5],
    },
    siteCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing[4],
        borderRadius: Radius.lg,
        marginBottom: Layout.itemGap,
        borderWidth: 1,
        overflow: 'hidden',
    },
    siteAccent: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        borderTopLeftRadius: Radius.lg,
        borderBottomLeftRadius: Radius.lg,
    },
    siteIconBox: {
        marginLeft: Spacing[3],
    },
    kpiCard: {
        padding: Spacing[4],
        borderRadius: Radius.lg,
        minWidth: 90,
        alignItems: 'center',
        borderTopWidth: 3,
        borderWidth: 1,
    },
    searchBar: {
        marginBottom: Spacing[3],
        borderRadius: Radius.md,
    },
    filterRow: {
        paddingBottom: Spacing[4],
        gap: Spacing[2],
    },
    chip: {
        marginRight: Spacing[2],
    },
    listContent: {
        paddingBottom: 20,
    },
    card: {
        marginBottom: Spacing[3],
        borderRadius: Radius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderLeftWidth: 4,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing[4],
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
    },
});
