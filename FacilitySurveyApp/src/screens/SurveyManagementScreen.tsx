import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Text, Button, Surface, ActivityIndicator, IconButton, useTheme, Menu, Divider, Portal, Dialog } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { sitesApi, assetsApi, surveysApi, usersApi, dashboardApi } from '../services/api';
import { downloadSurveyReport, downloadAllSurveysZip } from '../services/excelService';
import * as FileSystem from 'expo-file-system/legacy';
import { SiteSelector } from '../components/SiteSelector';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../constants/design';

// Interfaces
interface Asset {
    id: string;
    project_site?: string;
    building?: string;
    building_name?: string;
    location?: string;
    service_line?: string;
    trade?: string; // sometimes used interchangeably
    [key: string]: any;
}

interface SiteStats {
    totalAssets: number;
    uniqueLocations: number;
    uniqueServiceLines: number;
    potentialWorkbooks: number;
}

interface HierarchyNode {
    name: string; // Building Name
    trades: {
        name: string; // Service Line
        assetCount: number;
        surveyId?: string;
        surveyStatus?: string;
    }[];
}

export default function SurveyManagementScreen() {
    const theme = useTheme();
    const navigation = useNavigation<any>();
    const { user } = useAuth();

    // State
    const [selectedSite, setSelectedSite] = useState<any | null>(null);

    const [loading, setLoading] = useState(false);
    const [operationLoading, setOperationLoading] = useState(false); // for generate/export
    const [operationMessage, setOperationMessage] = useState('');

    const [assets, setAssets] = useState<Asset[]>([]);
    const [surveys, setSurveys] = useState<any[]>([]);
    const [siteStats, setSiteStats] = useState({
        draft: 0,
        in_progress: 0,
        submitted: 0,
        under_review: 0,
        completed: 0,
        total: 0
    });

    const [expandedBuildings, setExpandedBuildings] = useState<Record<string, boolean>>({});

    // Filter menu state (replaced Alert.alert dialogs — broken on web)
    const [locationFilterMenuVisible, setLocationFilterMenuVisible] = useState(false);
    const [serviceLineFilterMenuVisible, setServiceLineFilterMenuVisible] = useState(false);
    const [statusFilterMenuVisible, setStatusFilterMenuVisible] = useState(false);

    // Batch-create dialog state (replaced 3-button Alert — broken on web)
    const [batchDialogVisible, setBatchDialogVisible] = useState(false);
    const [fullResetConfirmVisible, setFullResetConfirmVisible] = useState(false);

    // Load Sites on Mount
    useFocusEffect(
        React.useCallback(() => {
            loadSites();
        }, [user])
    );

    const loadSites = async () => {
        try {
            await sitesApi.getAll(); // warms up the SiteSelector's cache
        } catch (error) {
            console.error("Failed to load sites", error);
        }
    };

    // Load Data when Site Selected or Screen is Focused
    useFocusEffect(
        useCallback(() => {
            // Reset all per-site UI state when the site changes
            setExpandedBuildings({});
            setSelectedLocation('');
            setSelectedServiceLine('');
            setSelectedStatus('');

            if (selectedSite) {
                loadSiteData(selectedSite);
            } else {
                setAssets([]);
                setSurveys([]);
            }
        }, [selectedSite])
    );

    const loadSiteData = async (site: any) => {
        setLoading(true);
        try {
            // 1. Fetch backend surveys — use surveysApi (role-aware: surveyors see own + unassigned)
            //    dashboardApi.getSurveys requires admin; non-admins got 403 → empty surveys list
            const siteSurveys = await surveysApi.getAll(site.id);
            setSurveys(siteSurveys);

            // 2. Fetch all assets to compute stats & hierarchy
            // We need full asset list to know what *should* exist
            const siteAssets = await assetsApi.getAll(site.id);
            setAssets(siteAssets);

            // 3. Fetch per-site survey status stats
            try {
                const stats = await dashboardApi.getSiteStats(site.id);
                setSiteStats(stats);
            } catch (statsError) {
                console.error("Failed to load site stats", statsError);
                // Don't fail the whole load if stats fail
            }

        } catch (error) {
            console.error("Failed to load site data", error);
            Alert.alert("Error", "Failed to load dashboard data. Check internet.");
        } finally {
            setLoading(false);
        }
    };

    // --- Analytics Computation ---
    const stats: SiteStats = useMemo(() => {
        if (!selectedSite || assets.length === 0) {
            return { totalAssets: 0, uniqueLocations: 0, uniqueServiceLines: 0, potentialWorkbooks: 0 };
        }

        const locations = new Set<string>();
        const serviceLines = new Set<string>();
        const workbookKeys = new Set<string>(); // Location + ServiceLine

        assets.forEach(a => {
            const loc = a.building || a.building_name || a.location || 'Unknown Building';
            const sl = a.service_line || a.trade || 'General';

            locations.add(loc);
            serviceLines.add(sl);
            workbookKeys.add(`${loc}::${sl}`);
        });

        return {
            totalAssets: assets.length,
            uniqueLocations: locations.size,
            uniqueServiceLines: serviceLines.size,
            potentialWorkbooks: workbookKeys.size
        };
    }, [assets, selectedSite]);

    const [selectedServiceLine, setSelectedServiceLine] = useState<string | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

    const STATUS_OPTIONS = ['Missing', 'draft', 'in_progress', 'submitted', 'under_review', 'completed'];

    // --- Filter Options ---
    const filterOptions = useMemo(() => {
        if (!selectedSite || assets.length === 0) return { serviceLines: [], locations: [] };

        const sls = new Set<string>();
        const locs = new Set<string>();

        assets.forEach(a => {
            if (a.service_line || a.trade) sls.add(a.service_line || a.trade || 'General');
            if (a.building || a.location) locs.add(a.building || a.building_name || a.location || 'Unknown');
        });

        return {
            serviceLines: Array.from(sls).sort(),
            locations: Array.from(locs).sort()
        };
    }, [assets, selectedSite]);


    // --- Hierarchy Computation ---
    const hierarchy: HierarchyNode[] = useMemo(() => {
        if (!selectedSite) return [];

        const groups: Record<string, Record<string, number>> = {}; // Building -> Trade -> Count

        assets.forEach(a => {
            const loc = a.building || a.building_name || a.location || 'Unknown Building';
            const sl = a.service_line || a.trade || 'General';

            // Filter Check
            if (selectedLocation && loc !== selectedLocation) return;
            if (selectedServiceLine && sl !== selectedServiceLine) return;

            if (!groups[loc]) groups[loc] = {};
            if (!groups[loc][sl]) groups[loc][sl] = 0;
            groups[loc][sl]++;
        });

        // Map to array and attach existing surveys
        const nodes: HierarchyNode[] = Object.keys(groups).sort().map(buildingName => {
            const tradesObj = groups[buildingName];
            const trades = Object.keys(tradesObj).sort().map(tradeName => {
                // Match survey by both trade AND building (location) — surveys are now per building×trade
                // Crucial fix: Normalize casing and trim whitespace since the DB data has slight trailing space anomalies 
                // like "Golf Car Parking "
                const survey = surveys.find(s =>
                    (s.trade || '').trim().toUpperCase() === tradeName.trim().toUpperCase() &&
                    (s.location || '').trim().toUpperCase() === buildingName.trim().toUpperCase()
                );

                const surveyStatus = survey?.status || 'Missing';
                
                // Status Filter Check
                if (selectedStatus && surveyStatus !== selectedStatus) {
                    return null;
                }

                return {
                    name: tradeName,
                    assetCount: tradesObj[tradeName],
                    surveyId: survey?.id,
                    surveyStatus: survey?.status
                };
            }).filter(Boolean);

            if (trades.length === 0) return null;

            return { name: buildingName, trades };
        }).filter(Boolean) as HierarchyNode[];

        return nodes;
    }, [assets, surveys, selectedSite, selectedLocation, selectedServiceLine, selectedStatus]);


    // --- Actions ---

    const handleBatchCreate = () => {
        if (!selectedSite) return;
        // Open a proper Dialog — Alert.alert with 3 buttons is broken on web
        setBatchDialogVisible(true);
    };

    const performBatchCreate = async (isReset: boolean) => {
        setOperationLoading(true);
        setOperationMessage(isReset ? 'Deleting & Recreating...' : 'Analyzing & Creating Surveys...');

        try {
            if (isReset) {
                // Delete all surveys first
                console.log(`[Batch] Deleting all surveys for site ${selectedSite!.id}`);
                await surveysApi.deleteAllBySite(selectedSite!.id);
                // Clear local state immediately to avoid stale data during creation
                setSurveys([]);
            }

            // Identify unique (building, trade) pairs needed
            const neededPairs = new Map<string, Set<string>>(); // building → Set<trade>
            assets.forEach(a => {
                const building = a.building || a.building_name || a.location || 'Unknown Building';
                const trade = a.service_line || a.trade || 'General';
                if (!neededPairs.has(building)) neededPairs.set(building, new Set());
                neededPairs.get(building)!.add(trade);
            });

            // Flatten to array of {building, trade} objects
            const allPairs: { building: string; trade: string }[] = [];
            neededPairs.forEach((trades, building) => {
                trades.forEach(trade => allPairs.push({ building, trade }));
            });

            // If syncing, skip pairs that already have a survey
            const pairsToCreate = isReset
                ? allPairs
                : allPairs.filter(pair =>
                    !surveys.find(s =>
                        (s.trade || '').trim().toUpperCase() === pair.trade.trim().toUpperCase() &&
                        (s.location || '').trim().toUpperCase() === pair.building.trim().toUpperCase()
                    )
                );

            if (pairsToCreate.length === 0) {
                Alert.alert("Sync Complete", "All required surveys already exist.");
            } else {
                let createdCount = 0;
                const total = pairsToCreate.length;
                for (const { building, trade } of pairsToCreate) {
                    setOperationMessage(`Creating survey ${createdCount + 1} of ${total}: ${building} – ${trade}...`);
                    await surveysApi.create({
                        siteId: selectedSite!.id,
                        trade,
                        location: building
                    });
                    createdCount++;
                }
                await loadSiteData(selectedSite!);
                Alert.alert("Success", `Created ${createdCount} survey${createdCount !== 1 ? 's' : ''} successfully.`);
            }

        } catch (error) {
            console.error("Batch Create Error", error);
            Alert.alert("Error", "Failed to generate surveys.\n" + (error as any).message);
        } finally {
            setOperationLoading(false);
        }
    };

    const handleViewReport = async (tradeItem: any, buildingName: string) => {
        if (!tradeItem.surveyId) {
            Alert.alert("No Survey", "No survey record exists for this trade yet. Please run 'Generate All'.");
            return;
        }

        setOperationLoading(true);
        setOperationMessage(`Generating Report for ${buildingName}...`);
        try {
            // Naming convention: Site_Building_Trade.xlsx
            const safeSite = selectedSite!.name.replace(/[^a-zA-Z0-9]/g, '_');
            const safeBuilding = buildingName.replace(/[^a-zA-Z0-9]/g, '_');
            const safeTrade = tradeItem.name.replace(/[^a-zA-Z0-9]/g, '_');
            const filename = `${safeSite}_${safeBuilding}_${safeTrade}.xlsx`;

            // On web FileSystem is unavailable; download is triggered by the browser directly
            const destination = Platform.OS !== 'web' && FileSystem.documentDirectory
                ? `${FileSystem.documentDirectory}SavedReports/${filename}`
                : undefined;

            console.log(`📊 Requesting Export: SurveyID=${tradeItem.surveyId}, Building=${buildingName}`);

            const fileUri = await downloadSurveyReport(
                tradeItem.surveyId,
                buildingName,
                destination
            );

            // On web the browser already downloaded the file — no sharing dialog needed
            if (Platform.OS !== 'web') {
                const Sharing = require('expo-sharing');
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(fileUri);
                } else {
                    Alert.alert("Saved", `Report saved to: ${fileUri}`);
                }
            }

        } catch (error: any) {
            console.error("Report Gen Error", error);
            Alert.alert("Error", error.message || "Failed to generate report.");
        } finally {
            setOperationLoading(false);
        }
    };

    const handleExportAll = async () => {
        if (!selectedSite) return;

        if (surveys.length === 0) {
            Alert.alert('No Surveys', 'No surveys have been generated yet. Use "Generate All Surveys" first.');
            return;
        }

        setOperationLoading(true);
        setOperationMessage(`Building ZIP of ${surveys.length} survey${surveys.length !== 1 ? 's' : ''}...`);

        try {
            await downloadAllSurveysZip(selectedSite.id, selectedSite.name);
            Alert.alert('Export Complete', `Downloaded ${selectedSite.name}_surveys.zip containing ${surveys.length} survey file${surveys.length !== 1 ? 's' : ''}.`);
        } catch (error: any) {
            console.error('Bulk Export Error', error);
            Alert.alert('Error', 'Failed to export surveys.\n' + (error.message || ''));
        } finally {
            setOperationLoading(false);
            setOperationMessage('');
        }
    };

    const toggleBuilding = (name: string) => {
        setExpandedBuildings(prev => ({ ...prev, [name]: !prev[name] }));
    };


    // --- Render ---

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {navigation.canGoBack() && (
                        <IconButton
                            icon="arrow-left"
                            size={24}
                            onPress={() => navigation.goBack()}
                            iconColor={theme.colors.onBackground}
                            style={{ marginLeft: -8, marginRight: 4 }}
                        />
                    )}
                    <Text style={styles.title}>Survey Creation</Text>
                </View>

                {/* Site Selector - Always Visible */}
                <SiteSelector
                    selectedSite={selectedSite}
                    onSiteSelected={(site: any) => {
                        setSelectedSite(site);
                        // Clear surveys when site changes to avoid stale data
                        setSurveys([]);
                    }}
                />
            </View>

            {loading ? (
                <ActivityIndicator size="large" style={{ marginTop: 40 }} />
            ) : selectedSite ? (
                <ScrollView contentContainerStyle={{ padding: 16 }}>

                    {/* Phase A: Analytics Header */}
                    <Surface style={[styles.statsCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
                        <Text style={styles.statsTitle}>State of the Site</Text>

                        <View style={styles.statsGrid}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{stats.totalAssets.toLocaleString()}</Text>
                                <Text style={styles.statLabel}>Total Assets</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{stats.uniqueLocations}</Text>
                                <Text style={styles.statLabel}>Locations</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{stats.uniqueServiceLines}</Text>
                                <Text style={styles.statLabel}>Service Lines</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{stats.potentialWorkbooks}</Text>
                                <Text style={styles.statLabel}>Workbooks</Text>
                            </View>
                        </View>

                        <Divider style={{ marginVertical: 16 }} />

                        {/* Survey Status Breakdown */}
                        <Text style={[styles.statsTitle, { fontSize: 14, marginBottom: 12 }]}>Survey Status</Text>
                        <View style={styles.statsGrid}>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: '#666' }]}>{siteStats.draft}</Text>
                                <Text style={styles.statLabel}>Draft</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: '#2196F3' }]}>{siteStats.in_progress}</Text>
                                <Text style={styles.statLabel}>In Progress</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: '#FF9800' }]}>{siteStats.submitted}</Text>
                                <Text style={styles.statLabel}>Submitted</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: '#9C27B0' }]}>{siteStats.under_review}</Text>
                                <Text style={styles.statLabel}>Under Review</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: '#4CAF50' }]}>{siteStats.completed}</Text>
                                <Text style={styles.statLabel}>Completed</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { fontWeight: 'bold' }]}>{siteStats.total}</Text>
                                <Text style={styles.statLabel}>Total</Text>
                            </View>
                        </View>

                        {/* Progress Bar */}
                        {siteStats.total > 0 && (
                            <View style={{ marginTop: 12, marginBottom: 8 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>Progress</Text>
                                    <Text style={{ fontSize: 12, fontWeight: 'bold' }}>
                                        {Math.round((siteStats.completed / siteStats.total) * 100)}% Complete
                                    </Text>
                                </View>
                                <View style={{ height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden' }}>
                                    <View
                                        style={{
                                            height: '100%',
                                            backgroundColor: '#4CAF50',
                                            width: `${(siteStats.completed / siteStats.total) * 100}%`
                                        }}
                                    />
                                </View>
                            </View>
                        )}

                        <Divider style={{ marginVertical: 16 }} />

                        {/* Admin Action: Generate Surveys */}
                        {user?.role === 'admin' && (
                            <>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <Button
                                        mode="contained"
                                        onPress={handleBatchCreate}
                                        disabled={operationLoading}
                                        style={{ flex: 1, backgroundColor: theme.colors.primary }}
                                    >
                                        {surveys.length === 0 ? "Generate All Surveys" : "Recreate Surveys"}
                                    </Button>
                                    <Button
                                        mode="contained-tonal"
                                        onPress={handleExportAll}
                                        disabled={operationLoading}
                                        icon="folder-download"
                                        style={{ flex: 1 }}
                                    >
                                        Export All
                                    </Button>
                                </View>
                                {operationLoading && <Text style={{ textAlign: 'center', marginTop: 8, fontSize: 12 }}>{operationMessage}</Text>}
                            </>
                        )}
                    </Surface>


                    {/* Filters */}
                    <View style={{ marginBottom: 16, flexDirection: 'row', gap: 8 }}>
                        {/* Location filter */}
                        <Menu
                            visible={locationFilterMenuVisible}
                            onDismiss={() => setLocationFilterMenuVisible(false)}
                            anchor={
                                <View>
                                    <Button
                                        mode={selectedLocation ? "contained-tonal" : "outlined"}
                                        onPress={() => setLocationFilterMenuVisible(true)}
                                        style={{ borderRadius: 20 }}
                                        icon="map-marker"
                                        compact
                                    >
                                        {selectedLocation || "All Locations"}
                                    </Button>
                                </View>
                            }
                        >
                            <Menu.Item title="All Locations" onPress={() => { setSelectedLocation(null); setLocationFilterMenuVisible(false); }} />
                            <Divider />
                            {filterOptions.locations.map(l => (
                                <Menu.Item key={l} title={l} onPress={() => { setSelectedLocation(l); setLocationFilterMenuVisible(false); }} />
                            ))}
                        </Menu>

                        {/* Service line filter */}
                        <Menu
                            visible={serviceLineFilterMenuVisible}
                            onDismiss={() => setServiceLineFilterMenuVisible(false)}
                            anchor={
                                <View>
                                    <Button
                                        mode={selectedServiceLine ? "contained-tonal" : "outlined"}
                                        onPress={() => setServiceLineFilterMenuVisible(true)}
                                        style={{ borderRadius: 20 }}
                                        icon="tools"
                                        compact
                                    >
                                        {selectedServiceLine || "All Trades"}
                                    </Button>
                                </View>
                            }
                        >
                            <Menu.Item title="All Trades" onPress={() => { setSelectedServiceLine(null); setServiceLineFilterMenuVisible(false); }} />
                            <Divider />
                            {filterOptions.serviceLines.map(s => (
                                <Menu.Item key={s} title={s} onPress={() => { setSelectedServiceLine(s); setServiceLineFilterMenuVisible(false); }} />
                            ))}
                        </Menu>

                        {/* Status filter */}
                        <Menu
                            visible={statusFilterMenuVisible}
                            onDismiss={() => setStatusFilterMenuVisible(false)}
                            anchor={
                                <View>
                                    <Button
                                        mode={selectedStatus ? "contained-tonal" : "outlined"}
                                        onPress={() => setStatusFilterMenuVisible(true)}
                                        style={{ borderRadius: 20 }}
                                        icon="filter-variant"
                                        compact
                                    >
                                        {selectedStatus ? (selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1).replace('_', ' ')) : "All Statuses"}
                                    </Button>
                                </View>
                            }
                        >
                            <Menu.Item title="All Statuses" onPress={() => { setSelectedStatus(null); setStatusFilterMenuVisible(false); }} />
                            <Divider />
                            {STATUS_OPTIONS.map(status => (
                                <Menu.Item 
                                    key={status} 
                                    title={status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')} 
                                    onPress={() => { setSelectedStatus(status); setStatusFilterMenuVisible(false); }} 
                                />
                            ))}
                        </Menu>
                    </View>

                    {/* Phase B: Hierarchy */}
                    <Text style={styles.sectionTitle}>Workbooks (By Location)</Text>

                    {hierarchy.map((node) => {
                        const isExpanded = expandedBuildings[node.name];
                        return (
                            <Surface key={node.name} style={[styles.buildingCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                                <Button
                                    onPress={() => toggleBuilding(node.name)}
                                    contentStyle={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}
                                    labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
                                    style={{ borderRadius: 8, borderBottomLeftRadius: isExpanded ? 0 : 8, borderBottomRightRadius: isExpanded ? 0 : 8 }}
                                    icon={isExpanded ? "chevron-up" : "chevron-down"}
                                >
                                    {node.name} ({node.trades.length})
                                </Button>

                                {isExpanded && (
                                    <View style={styles.tradesList}>
                                        <Divider />
                                        {node.trades.map(t => (
                                            <View key={t.name} style={styles.tradeRow}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ fontWeight: '600' }}>{t.name}</Text>
                                                    <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>{t.assetCount} assets • {t.surveyStatus || 'Missing'}</Text>
                                                </View>
                                                <View style={{ flexDirection: 'row' }}>
                                                    {user?.role === 'reviewer' || user?.role === 'cit' || user?.role === 'mag' ? (
                                                        <Button
                                                            mode="contained-tonal"
                                                            compact
                                                            disabled={!t.surveyId || t.surveyStatus !== 'submitted'}
                                                            onPress={() => {
                                                                navigation.navigate("ReviewSurvey", {
                                                                    surveyId: t.surveyId,
                                                                });
                                                            }}
                                                        >
                                                            Review
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            mode={(t.surveyStatus === 'completed' || t.surveyStatus === 'submitted') ? "contained-tonal" : "text"}
                                                            compact
                                                            disabled={!t.surveyId}
                                                            onPress={() => {
                                                                navigation.navigate('AssetInspection', {
                                                                    surveyId: t.surveyId,
                                                                    siteId: selectedSite.id,
                                                                    siteName: selectedSite.name,
                                                                    trade: t.name,
                                                                    location: node.name,
                                                                    // Pass assets directly if available or let next screen fetch
                                                                });
                                                            }}
                                                        >
                                                            {(t.surveyStatus === 'completed' || t.surveyStatus === 'submitted') ? 'Edit' : 'Inspect'}
                                                        </Button>
                                                    )}
                                                    <IconButton
                                                        icon="file-excel-outline"
                                                        size={20}
                                                        onPress={() => handleViewReport(t, node.name)}
                                                    />
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </Surface>
                        );
                    })}

                    {hierarchy.length === 0 && (
                        <Text style={{ textAlign: 'center', marginTop: 20, opacity: 0.5 }}>No assets found. Import assets to generate hierarchy.</Text>
                    )}

                </ScrollView>
            ) : (
                <View style={[styles.emptyState, { backgroundColor: theme.colors.surface }]}>
                    <Text>Select a Site to Manage Surveys</Text>
                </View>
            )}

            {/* Global Loader Overlay if needed for blocking ops */}
            {operationLoading && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color="white" />
                </View>
            )}

            {/* --- Batch Create Dialog (replaces 3-button Alert — broken on web) --- */}
            <Portal>
                <Dialog visible={batchDialogVisible} onDismiss={() => setBatchDialogVisible(false)}>
                    <Dialog.Title>Generate / Recreate Surveys</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ marginBottom: 12 }}>How would you like to proceed?</Text>
                        <Text variant="bodySmall" style={{ marginBottom: 6 }}>
                            <Text style={{ fontWeight: 'bold' }}>Sync Only (Safe):</Text>
                            {' '}Adds only the missing trade surveys. Existing data is untouched.
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                            <Text style={{ fontWeight: 'bold' }}>Full Reset (Destructive):</Text>
                            {' '}Deletes ALL surveys and inspection data for this site, then recreates them.
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setBatchDialogVisible(false)}>Cancel</Button>
                        <Button onPress={() => { setBatchDialogVisible(false); performBatchCreate(false); }}>
                            Sync Only
                        </Button>
                        <Button textColor={theme.colors.error} onPress={() => { setBatchDialogVisible(false); setFullResetConfirmVisible(true); }}>
                            Full Reset
                        </Button>
                    </Dialog.Actions>
                </Dialog>

                <Dialog visible={fullResetConfirmVisible} onDismiss={() => setFullResetConfirmVisible(false)}>
                    <Dialog.Title>Confirm Full Reset</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium">
                            Are you absolutely sure? All inspection data, photos, and remarks for this site will be permanently lost.
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setFullResetConfirmVisible(false)}>Cancel</Button>
                        <Button textColor={theme.colors.error} onPress={() => { setFullResetConfirmVisible(false); performBatchCreate(true); }}>
                            Yes, Delete &amp; Recreate
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 20, paddingBottom: 10 },
    title: { fontSize: 28, fontWeight: '900', color: Colors.neutral[800] },
    statsCard: { padding: 20, borderRadius: 16, marginBottom: 24 },
    statsTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    statItem: { width: '48%', marginBottom: 16, alignItems: 'flex-start' },
    statValue: { fontSize: 24, fontWeight: 'bold', color: Colors.green[600] },
    statLabel: { fontSize: 12, opacity: 0.6, textTransform: 'uppercase' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, marginLeft: 4 },
    buildingCard: { marginBottom: 12, borderRadius: 12 },
    tradesList: { padding: 16, paddingTop: 0, backgroundColor: Colors.neutral[100], borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
    tradeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.neutral[200] },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 },
});
