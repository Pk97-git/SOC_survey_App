import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Surface, ActivityIndicator, IconButton, ProgressBar, useTheme, Menu, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { sitesApi, assetsApi, dashboardApi, surveysApi } from '../services/api';
import { downloadSurveyReport } from '../services/excelService';
import * as FileSystem from 'expo-file-system/legacy';
import { SiteSelector } from '../components/SiteSelector';
import { useAuth } from '../context/AuthContext';

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
    const [sites, setSites] = useState<any[]>([]);
    const [selectedSite, setSelectedSite] = useState<any | null>(null);
    const [siteMenuVisible, setSiteMenuVisible] = useState(false);

    const [loading, setLoading] = useState(false);
    const [operationLoading, setOperationLoading] = useState(false); // for generate/export
    const [operationMessage, setOperationMessage] = useState('');

    const [assets, setAssets] = useState<Asset[]>([]);
    const [surveys, setSurveys] = useState<any[]>([]);

    const [expandedBuildings, setExpandedBuildings] = useState<Record<string, boolean>>({});

    // Load Sites on Mount
    useFocusEffect(
        React.useCallback(() => {
            loadSites();
        }, [])
    );

    const loadSites = async () => {
        try {
            const allSites = await sitesApi.getAll();
            setSites(allSites);
        } catch (error) {
            console.error("Failed to load sites", error);
            Alert.alert("Error", "Failed to load sites.");
        }
    };

    // Load Data when Site Selected
    useEffect(() => {
        if (selectedSite) {
            loadSiteData(selectedSite);
        } else {
            setAssets([]);
            setSurveys([]);
        }
    }, [selectedSite]);

    const loadSiteData = async (site: any) => {
        setLoading(true);
        try {
            // 1. Fetch backend surveys
            const siteSurveys = await dashboardApi.getSurveys({ siteId: site.id });
            setSurveys(siteSurveys);

            // 2. Fetch all assets to compute stats & hierarchy
            // We need full asset list to know what *should* exist
            const siteAssets = await assetsApi.getAll(site.id);
            setAssets(siteAssets);

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
                // Find existing survey for this Trade
                const survey = surveys.find(s => s.trade === tradeName);

                return {
                    name: tradeName,
                    assetCount: tradesObj[tradeName],
                    surveyId: survey?.id,
                    surveyStatus: survey?.status
                };
            });

            return { name: buildingName, trades };
        });

        return nodes;
    }, [assets, surveys, selectedSite, selectedLocation, selectedServiceLine]);


    // --- Actions ---

    const handleBatchCreate = async () => {
        if (!selectedSite) return;

        Alert.alert(
            "Recreate Surveys",
            "How would you like to proceed?\n\n'Sync Only': Adds missing surveys (Safe)\n'Full Reset': DELETES ALL existing surveys and inspection data for this site, then recreates them (Destructive)",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Sync Only (Safe)",
                    onPress: () => performBatchCreate(false)
                },
                {
                    text: "Full Reset (Destructive)",
                    style: "destructive",
                    onPress: () => {
                        Alert.alert(
                            "Confirm Full Reset",
                            "Are you absolutely sure? All inspection data, photos, and remarks for this site will be permanently lost.",
                            [
                                { text: "Cancel", style: "cancel" },
                                { text: "Yes, Delete & Recreate", style: "destructive", onPress: () => performBatchCreate(true) }
                            ]
                        );
                    }
                }
            ]
        );
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

            // Identify unique trades needed
            const neededTrades = new Set<string>();
            assets.forEach(a => {
                const sl = a.service_line || a.trade || 'General';
                neededTrades.add(sl);
            });

            // If reset, we create ALL trades. If sync, only missing ones.
            // Since we just deleted everything on reset, currentSurveys is effectively empty for the logic,
            // but we need to be careful if state hasn't updated yet.
            // Better to re-fetch or just assume 'surveys' local state is stale if we deleted.

            // Actually, if we deleted, neededTrades ARE the trades to create.
            // If we didn't, we filter.

            let tradesToCreate: string[] = [];

            if (isReset) {
                tradesToCreate = Array.from(neededTrades);
            } else {
                tradesToCreate = Array.from(neededTrades).filter(trade =>
                    !surveys.find(s => s.trade === trade)
                );
            }

            if (tradesToCreate.length === 0) {
                Alert.alert("Sync Complete", "All required trade surveys already exist.");
            } else {
                // Create missing surveys
                let createdCount = 0;
                for (const trade of tradesToCreate) {
                    setOperationMessage(`Creating survey for ${trade}...`);
                    await surveysApi.create({
                        siteId: selectedSite!.id,
                        trade: trade
                    });
                    createdCount++;
                }
                Alert.alert("Success", `Processed ${createdCount} surveys.`);
                await loadSiteData(selectedSite!); // refresh
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

            // Construct absolute path using FileSystem
            const destination = `${FileSystem.documentDirectory}SavedReports/${filename}`;

            console.log(`📊 Requesting Export: SurveyID=${tradeItem.surveyId}, Building=${buildingName}, Path=${destination}`);

            const fileUri = await downloadSurveyReport(
                tradeItem.surveyId,
                buildingName,
                destination
            );

            // Attempt to open/share
            const Sharing = require('expo-sharing');
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri);
            } else {
                Alert.alert("Saved", `Report saved to: ${fileUri}`);
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

        setOperationLoading(true);
        setOperationMessage('Preparing to export all surveys...');

        try {
            let exportedCount = 0;
            let failedCount = 0;

            // Iterate through all buildings and trades
            for (const building of hierarchy) {
                for (const trade of building.trades) {
                    if (!trade.surveyId) continue; // Skip if no survey exists

                    try {
                        setOperationMessage(`Exporting ${building.name} - ${trade.name}...`);

                        const safeSite = selectedSite.name.replace(/[^a-zA-Z0-9]/g, '_');
                        const safeBuilding = building.name.replace(/[^a-zA-Z0-9]/g, '_');
                        const safeTrade = trade.name.replace(/[^a-zA-Z0-9]/g, '_');
                        const filename = `${safeSite}_${safeBuilding}_${safeTrade}.xlsx`;
                        const destination = `${FileSystem.documentDirectory}SavedReports/${filename}`;

                        await downloadSurveyReport(trade.surveyId, building.name, destination);
                        exportedCount++;
                    } catch (error) {
                        console.error(`Failed to export ${building.name} - ${trade.name}:`, error);
                        failedCount++;
                    }
                }
            }

            Alert.alert(
                "Export Complete",
                `Successfully exported ${exportedCount} survey(s).${failedCount > 0 ? `\n${failedCount} failed.` : ''}\n\nReports saved to SavedReports folder.`,
                [{ text: "OK" }]
            );
        } catch (error: any) {
            console.error("Bulk Export Error", error);
            Alert.alert("Error", "Failed to export surveys.\n" + (error.message || ''));
        } finally {
            setOperationLoading(false);
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
                    <Surface style={[styles.statsCard]} elevation={2}>
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
                                        disabled={operationLoading || hierarchy.length === 0}
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
                    <View style={{ marginBottom: 16 }}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {/* Service Line Filter */}
                            <Menu
                                visible={false} // Todo: separate state? Or just use a simple modal/sheet?
                                // Actually, let's use a simple horizontal list of Chips for now or a unified Filter bar.
                                // For simplicity and speed, let's use Chips for top-level filtering if items are few, 
                                // but if many, a Menu is better. The user asked for "filter to select".
                                // Let's replicate the AssetsScreen style filter logic simplistically here using a helper or just State.
                                anchor={<View />}
                                onDismiss={() => { }}
                            >
                                <View />
                            </Menu>

                            {/* Simple Chips Implementation for now */}
                            <Button
                                mode={selectedLocation ? "contained-tonal" : "outlined"}
                                onPress={() => {
                                    Alert.alert("Select Location", "Choose a location filter",
                                        [
                                            { text: "All Locations", onPress: () => setSelectedLocation(null) },
                                            ...filterOptions.locations.map(l => ({ text: l, onPress: () => setSelectedLocation(l) })),
                                            { text: "Cancel", style: "cancel" }
                                        ]
                                    );
                                }}
                                style={{ marginRight: 8, borderRadius: 20 }}
                                icon="map-marker"
                                compact
                            >
                                {selectedLocation || "All Locations"}
                            </Button>

                            <Button
                                mode={selectedServiceLine ? "contained-tonal" : "outlined"}
                                onPress={() => {
                                    Alert.alert("Select Service Line", "Choose a service line filter",
                                        [
                                            { text: "All Trades", onPress: () => setSelectedServiceLine(null) },
                                            ...filterOptions.serviceLines.map(s => ({ text: s, onPress: () => setSelectedServiceLine(s) })),
                                            { text: "Cancel", style: "cancel" }
                                        ]
                                    );
                                }}
                                style={{ marginRight: 8, borderRadius: 20 }}
                                icon="tools"
                                compact
                            >
                                {selectedServiceLine || "All Trades"}
                            </Button>
                        </ScrollView>
                    </View>

                    {/* Phase B: Hierarchy */}
                    <Text style={styles.sectionTitle}>Workbooks (By Location)</Text>

                    {hierarchy.map((node) => {
                        const isExpanded = expandedBuildings[node.name];
                        return (
                            <Surface key={node.name} style={styles.buildingCard} elevation={1}>
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
                                                    <Text style={{ fontSize: 12, color: 'gray' }}>{t.assetCount} assets • {t.surveyStatus || 'Missing'}</Text>
                                                </View>
                                                <View style={{ flexDirection: 'row' }}>
                                                    <Button
                                                        mode="text"
                                                        compact
                                                        onPress={() => {
                                                            const surveyAssets = assets.filter((a: any) => {
                                                                const loc = a.building || a.building_name || a.location || 'Unknown Building';
                                                                const sl = a.service_line || a.trade || 'General';
                                                                return loc === node.name && sl === t.name;
                                                            });

                                                            navigation.navigate('AssetInspection', {
                                                                surveyId: t.surveyId,
                                                                siteName: selectedSite.name,
                                                                trade: t.name,
                                                                location: node.name,
                                                                preloadedAssets: surveyAssets,
                                                                assetOption: 'resume'
                                                            });
                                                        }}
                                                        disabled={operationLoading || !t.surveyId}
                                                    >
                                                        Inspect
                                                    </Button>
                                                    <Button
                                                        mode="text"
                                                        compact
                                                        onPress={() => handleViewReport(t, node.name)}
                                                        disabled={operationLoading || !t.surveyId}
                                                    >
                                                        View Excel
                                                    </Button>
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
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ opacity: 0.5 }}>Please select a site to view the command center.</Text>
                </View>
            )}

            {/* Global Loader Overlay if needed for blocking ops */}
            {operationLoading && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color="white" />
                </View>
            )}

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 20, paddingBottom: 10 },
    title: { fontSize: 28, fontWeight: '900', color: '#1C1B1F' },
    statsCard: { padding: 20, borderRadius: 16, marginBottom: 24, backgroundColor: '#fff' },
    statsTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    statItem: { width: '48%', marginBottom: 16, alignItems: 'flex-start' },
    statValue: { fontSize: 24, fontWeight: 'bold', color: '#1B5E20' }, // Greenish for data
    statLabel: { fontSize: 12, opacity: 0.6, textTransform: 'uppercase' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, marginLeft: 4 },
    buildingCard: { marginBottom: 12, borderRadius: 12, backgroundColor: '#fff' }, // Removed overflow: hidden from Surface
    tradesList: { padding: 16, paddingTop: 0, backgroundColor: '#FAFAFA', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }, // Apply radius to content container
    tradeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#eee' }
});
