import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Surface, useTheme, IconButton, Searchbar, Avatar, Divider, Button, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { storage } from '../services/storage';
import * as hybridStorage from '../services/hybridStorage';
import { Colors, Radius, Typography, Spacing, Layout } from '../constants/design';

export default function HomeScreen() {
    const navigation = useNavigation<any>();
    const theme = useTheme();

    const [loading, setLoading] = useState(true);
    const [sites, setSites] = useState<any[]>([]);

    // Drill-down state
    const [selectedSite, setSelectedSite] = useState<any | null>(null);
    const [surveys, setSurveys] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedLocations, setExpandedLocations] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadSites();
        });
        return unsubscribe;
    }, [navigation]);

    const loadSites = async () => {
        setLoading(true);
        try {
            const userSites = await hybridStorage.getSites();
            setSites(userSites || []);
        } catch (error) {
            console.error('Error loading sites:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSiteSelect = async (site: any) => {
        setSelectedSite(site);
        setSearchQuery('');
        setExpandedLocations({});
        setLoading(true);
        try {
            const allSurveys = await storage.getSurveys(site.id);
            const siteSurveys = allSurveys.filter((s: any) => s.site_id === site.id);
            setSurveys(siteSurveys);
        } catch (error) {
            console.error('Error loading site surveys:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBackToSites = () => {
        setSelectedSite(null);
        setSurveys([]);
    };

    const toggleLocation = (loc: string) => {
        setExpandedLocations(prev => ({ ...prev, [loc]: !prev[loc] }));
    };

    const handleStartInspection = async (survey: any, locationName: string) => {
        const assets = await storage.getAssets(survey.site_id);
        const surveyAssets = assets.filter((a: any) =>
            (a.site_name || '').trim().toUpperCase() === (survey.site_name || '').trim().toUpperCase() &&
            (!survey.trade || (a.service_line || '').trim().toUpperCase() === survey.trade.trim().toUpperCase()) &&
            (!locationName || (a.building || a.location || '').trim().toUpperCase() === locationName.trim().toUpperCase())
        );

        navigation.navigate('AssetInspection', {
            surveyId: survey.id,
            siteId: survey.site_id,
            siteName: survey.site_name,
            trade: survey.trade,
            location: locationName,
            preloadedAssets: surveyAssets,
            assetOption: 'resume'
        });
    };

    const locationHierarchy = useMemo(() => {
        if (!selectedSite || surveys.length === 0) return [];

        const groups: Record<string, any[]> = {};
        surveys.forEach(survey => {
            const loc = survey.location || 'Unspecified Location';
            if (!groups[loc]) groups[loc] = [];
            groups[loc].push(survey);
        });

        let locNames = Object.keys(groups);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            locNames = locNames.filter(loc => loc.toLowerCase().includes(q));
        }

        return locNames.sort().map(locName => ({
            name: locName,
            surveys: groups[locName]
        }));
    }, [surveys, searchQuery, selectedSite]);


    const renderSiteList = () => (
        <View style={styles.contentContainer}>
            <Text style={[Typography.h2, { color: theme.colors.onSurface, marginBottom: Spacing[4] }]}>
                All Sites
            </Text>

            {sites.length === 0 && !loading ? (
                <View style={styles.emptyContainer}>
                    <Avatar.Icon
                        size={64}
                        icon="domain-off"
                        style={{ backgroundColor: theme.colors.surfaceVariant }}
                        color={theme.colors.onSurfaceVariant}
                    />
                    <Text style={[Typography.bodyMd, { marginTop: Spacing[4], color: theme.colors.onSurfaceVariant, textAlign: 'center' }]}>
                        No sites available.
                    </Text>
                    <Text style={[Typography.bodySm, { color: theme.colors.onSurfaceVariant, marginTop: Spacing[1], textAlign: 'center', opacity: 0.7 }]}>
                        Your admin needs to create a site first.
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
                                {/* Left accent stripe */}
                                <View style={[styles.siteAccent, { backgroundColor: theme.colors.primary }]} />
                                <View style={styles.siteIconBox}>
                                    <Avatar.Icon
                                        size={40}
                                        icon="office-building-marker-outline"
                                        color={theme.colors.primary}
                                        style={{ backgroundColor: theme.colors.primaryContainer }}
                                    />
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
    );

    const renderLocationList = () => (
        <View style={styles.contentContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[4] }}>
                <IconButton
                    icon="arrow-left"
                    size={24}
                    onPress={handleBackToSites}
                    style={{ marginLeft: -12 }}
                    iconColor={theme.colors.primary}
                />
                <Text style={[Typography.h2, { color: theme.colors.onSurface, flex: 1 }]} numberOfLines={1}>
                    {selectedSite?.name}
                </Text>
            </View>

            <Searchbar
                placeholder="Search locations..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={{ backgroundColor: theme.colors.surface, marginBottom: Spacing[4], borderRadius: Radius.md }}
                elevation={1}
            />

            {locationHierarchy.length === 0 && !loading ? (
                <View style={styles.emptyContainer}>
                    <Avatar.Icon
                        size={64}
                        icon="map-search-outline"
                        style={{ backgroundColor: theme.colors.surfaceVariant }}
                        color={theme.colors.onSurfaceVariant}
                    />
                    <Text style={[Typography.bodyMd, { marginTop: Spacing[4], color: theme.colors.onSurfaceVariant, textAlign: 'center' }]}>
                        No locations found for this site.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={locationHierarchy}
                    keyExtractor={(item) => item.name}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    renderItem={({ item }) => {
                        const isExpanded = expandedLocations[item.name];
                        return (
                            <Surface style={[styles.locationCard, {
                                backgroundColor: theme.colors.surface,
                                borderColor: theme.colors.outlineVariant,
                            }]} elevation={1}>
                                <TouchableOpacity
                                    style={styles.locationHeader}
                                    onPress={() => toggleLocation(item.name)}
                                    activeOpacity={0.7}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={[Typography.h4, { color: theme.colors.onSurface }]}>{item.name}</Text>
                                        <Text style={[Typography.bodySm, { color: theme.colors.primary, marginTop: 2 }]}>
                                            {item.surveys.length} Service {item.surveys.length === 1 ? 'Line' : 'Lines'}
                                        </Text>
                                    </View>
                                    <MaterialCommunityIcons
                                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                        size={22}
                                        color={theme.colors.onSurfaceVariant}
                                    />
                                </TouchableOpacity>

                                {isExpanded && (
                                    <View style={[styles.surveysList, { backgroundColor: theme.colors.surfaceVariant }]}>
                                        <Divider />
                                        {item.surveys.map((survey: any, index: number) => {
                                            const isCompleted = survey.status === 'completed' || survey.status === 'submitted';
                                            return (
                                                <View key={survey.id}>
                                                    <View style={styles.surveyRow}>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={[Typography.labelLg, { color: theme.colors.onSurface }]}>
                                                                {survey.trade || 'General Setup'}
                                                            </Text>
                                                            <View style={{ marginTop: 5 }}>
                                                                {isCompleted ? (
                                                                    <Chip
                                                                        compact
                                                                        icon="check-circle"
                                                                        style={{ backgroundColor: Colors.status.successBg, alignSelf: 'flex-start' }}
                                                                        textStyle={{ fontSize: 11, color: Colors.status.successGreen, fontWeight: '600' }}
                                                                    >
                                                                        Completed
                                                                    </Chip>
                                                                ) : (
                                                                    <Chip
                                                                        compact
                                                                        icon="clock-outline"
                                                                        style={{ backgroundColor: Colors.status.warningBg, alignSelf: 'flex-start' }}
                                                                        textStyle={{ fontSize: 11, color: Colors.status.warningAmber, fontWeight: '600' }}
                                                                    >
                                                                        Pending
                                                                    </Chip>
                                                                )}
                                                            </View>
                                                        </View>

                                                        <Button
                                                            mode={isCompleted ? 'contained-tonal' : 'contained'}
                                                            compact
                                                            style={{ borderRadius: Radius.sm }}
                                                            onPress={() => handleStartInspection(survey, item.name)}
                                                        >
                                                            {isCompleted ? 'Edit' : 'Inspect'}
                                                        </Button>
                                                    </View>
                                                    {index < item.surveys.length - 1 && <Divider style={{ marginLeft: Spacing[4] }} />}
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}
                            </Surface>
                        );
                    }}
                />
            )}
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

            {/* ── Header ──────────────────────────────────────────────────── */}
            <Surface style={[styles.header, { backgroundColor: theme.colors.primary }]} elevation={3}>
                <SafeAreaView edges={['top', 'left', 'right']}>
                    <View style={styles.headerContent}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {/* Brand icon */}
                            <View style={[styles.brandIconBox, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                                <MaterialCommunityIcons name="office-building" size={22} color="#FFFFFF" />
                            </View>
                            <View style={{ marginLeft: Spacing[3] }}>
                                <Text style={[Typography.h3, { color: '#FFFFFF', letterSpacing: -0.3 }]}>CIT OPS</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                                    <View style={[styles.onlineDot, { backgroundColor: Colors.status.successGreen }]} />
                                    <View style={[styles.rolePill, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                                        <Text style={[Typography.labelXs, { color: 'rgba(255,255,255,0.9)' }]}>
                                            SURVEYOR PORTAL
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                        <IconButton
                            icon="account-circle-outline"
                            iconColor="#FFFFFF"
                            size={28}
                            style={{ margin: 0 }}
                            onPress={() => navigation.navigate('ProfileTab')}
                        />
                    </View>
                </SafeAreaView>
            </Surface>

            {loading && !selectedSite ? (
                <ActivityIndicator size="large" style={{ marginTop: 40 }} color={theme.colors.primary} />
            ) : selectedSite ? (
                renderLocationList()
            ) : (
                renderSiteList()
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingBottom: Spacing[4],
        paddingHorizontal: Layout.screenPaddingH,
        borderBottomLeftRadius: Radius.xl,
        borderBottomRightRadius: Radius.xl,
        zIndex: 1,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing[2],
    },
    brandIconBox: {
        width: 44,
        height: 44,
        borderRadius: Radius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    onlineDot: {
        width: 7,
        height: 7,
        borderRadius: Radius.full,
        marginRight: 6,
    },
    rolePill: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: Radius.xs,
    },
    contentContainer: {
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
    locationCard: {
        borderRadius: Radius.lg,
        marginBottom: Layout.itemGap,
        overflow: 'hidden',
        borderWidth: 1,
    },
    locationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing[4],
    },
    surveysList: {},
    surveyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing[3],
        paddingHorizontal: Spacing[4],
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 32,
    },
});
