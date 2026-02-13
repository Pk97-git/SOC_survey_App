import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Surface, ActivityIndicator, IconButton, ProgressBar, useTheme, Menu, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { sitesApi, assetsApi, dashboardApi, surveysApi } from '../services/api';
import { downloadSurveyReport } from '../services/excelService';
import * as FileSystem from 'expo-file-system/legacy';

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

    // --- Hierarchy Computation ---
    const hierarchy: HierarchyNode[] = useMemo(() => {
        if (!selectedSite) return [];

        const groups: Record<string, Record<string, number>> = {}; // Building -> Trade -> Count

        assets.forEach(a => {
            const loc = a.building || a.building_name || a.location || 'Unknown Building';
            const sl = a.service_line || a.trade || 'General';

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
    }, [assets, surveys, selectedSite]);


    // --- Actions ---

    const handleBatchCreate = async () => {
        if (!selectedSite) return;
        setOperationLoading(true);
        setOperationMessage('Analyzing & Creating Surveys...');

        try {
            // Identify unique trades needed
            const neededTrades = new Set<string>();
            assets.forEach(a => {
                const sl = a.service_line || a.trade || 'General';
                neededTrades.add(sl);
            });

            const tradesToCreate = Array.from(neededTrades).filter(trade =>
                !surveys.find(s => s.trade === trade)
            );

            if (tradesToCreate.length === 0) {
                // Even if no NEW surveys needed, user clicked "Recreate/Sync".
                Alert.alert("Sync Complete", "All required trade surveys already exist.");
            } else {
                // Create missing surveys
                let createdCount = 0;
                for (const trade of tradesToCreate) {
                    setOperationMessage(`Creating survey for ${trade}...`);
                    await surveysApi.create({
                        siteId: selectedSite.id,
                        trade: trade
                    });
                    createdCount++;
                }
                Alert.alert("Success", `Created ${createdCount} new surveys.`);
                await loadSiteData(selectedSite); // refresh
            }

        } catch (error) {
            console.error("Batch Create Error", error);
            Alert.alert("Error", "Failed to generate surveys.");
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

    const toggleBuilding = (name: string) => {
        setExpandedBuildings(prev => ({ ...prev, [name]: !prev[name] }));
    };


    // --- Render ---

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <Text style={styles.title}>Command Center</Text>

                {/* Site Selector */}
                <Menu
                    visible={siteMenuVisible}
                    onDismiss={() => setSiteMenuVisible(false)}
                    anchor={
                        <Button
                            mode="outlined"
                            onPress={() => setSiteMenuVisible(true)}
                            icon="chevron-down"
                            contentStyle={{ flexDirection: 'row-reverse' }}
                            style={{ borderColor: theme.colors.outline }}
                        >
                            {selectedSite ? selectedSite.name : "Select Site Scope..."}
                        </Button>
                    }
                >
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

                        <Button
                            mode="contained"
                            onPress={handleBatchCreate}
                            disabled={operationLoading}
                            style={{ backgroundColor: theme.colors.primary }}
                        >
                            {surveys.length === 0 ? "Generate All Surveys" : "Recreate Surveys & Sync Assets"}
                        </Button>
                        {operationLoading && <Text style={{ textAlign: 'center', marginTop: 8, fontSize: 12 }}>{operationMessage}</Text>}
                    </Surface>


                    {/* Phase B: Hierarchy */}
                    <Text style={styles.sectionTitle}>Workbooks (By Location)</Text>

                    {hierarchy.map((node) => {
                        const isExpanded = expandedBuildings[node.name];
                        return (
                            <Surface key={node.name} style={styles.buildingCard} elevation={1}>
                                <Button
                                    onPress={() => toggleBuilding(node.name)}
                                    contentStyle={{ justifyContent: 'space-between' }}
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
    title: { fontSize: 28, fontWeight: '900', marginBottom: 16 },
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
