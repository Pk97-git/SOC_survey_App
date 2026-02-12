import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert, Platform } from 'react-native';
import { Text, FAB, useTheme, Surface, Button, Menu, Divider, IconButton, ActivityIndicator, Searchbar, Chip } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as hybridStorage from '../services/hybridStorage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { downloadSurveyReport } from '../services/excelService';

// Root directory for saved reports
const REPORTS_DIR = FileSystem.documentDirectory + 'SavedReports/';

export default function SurveyManagementScreen() {
    const navigation = useNavigation<any>();
    const theme = useTheme();

    const [sites, setSites] = useState<any[]>([]);
    const [selectedSite, setSelectedSite] = useState<any | null>(null);
    const [surveys, setSurveys] = useState<any[]>([]);
    const [filteredSurveys, setFilteredSurveys] = useState<any[]>([]);
    const [siteMenuVisible, setSiteMenuVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useFocusEffect(
        React.useCallback(() => {
            loadSites();
        }, [])
    );

    // Reload surveys when site changes
    React.useEffect(() => {
        if (selectedSite) {
            loadSurveysForSite(selectedSite);
        } else {
            setSurveys([]);
            setFilteredSurveys([]);
        }
    }, [selectedSite]);

    // Filter surveys
    React.useEffect(() => {
        if (searchQuery) {
            const lower = searchQuery.toLowerCase();
            setFilteredSurveys(surveys.filter(s =>
                (s.trade || '').toLowerCase().includes(lower) ||
                (s.surveyor_name || '').toLowerCase().includes(lower) ||
                (s.status || '').toLowerCase().includes(lower)
            ));
        } else {
            setFilteredSurveys(surveys);
        }
    }, [searchQuery, surveys]);

    const loadSites = async () => {
        const allSites = await hybridStorage.getSites();
        setSites(allSites);
        // Auto-select first site if none selected? No, user explicitly Selects.
    };

    const loadSurveysForSite = async (site: any) => {
        setLoading(true);
        try {
            if (await hybridStorage.syncService.getStatus().isOnline) {
                // Use backend filtering
                // We need to import dashboardApi. 
                // However, hybridStorage doesn't expose dashboardApi directly.
                // Let's import it from '../services/api'
                // But wait, we should stick to hybridStorage abstraction if possible.
                // hybridStorage.getSurveys returns ALL. 
                // Let's allow hybridStorage.getSurveys to accept filters?
                // Or just use dashboardApi here directly for "Management" view which is Online-First preference.
                const { dashboardApi } = require('../services/api');
                const siteSurveys = await dashboardApi.getSurveys({ siteId: site.id });
                // Sort by date desc
                siteSurveys.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                setSurveys(siteSurveys);
            } else {
                // Offline fallback
                const allSurveys = await hybridStorage.getSurveys();
                const siteSurveys = allSurveys.filter((s: any) => s.site_name === site.name);
                siteSurveys.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                setSurveys(siteSurveys);
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load surveys");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSurvey = () => {
        if (!selectedSite) {
            Alert.alert("Select Site", "Please select a site first.");
            return;
        }
        // Navigate to StartSurvey, pre-filling site? 
        // StartSurvey uses its own selection logic. We can pass params if it supports it.
        // It doesn't look like it supports params yet, but we can update it or just let user pick.
        // For now, simple navigation. User manually picks site again... inefficient.
        // TODO: Update StartSurvey to accept initialSite param.
        navigation.navigate('StartSurvey');
    };

    const handleBatchExport = async () => {
        if (!selectedSite || surveys.length === 0) {
            Alert.alert("Nothing to Export", "No surveys found for this site.");
            return;
        }

        setExporting(true);
        try {
            // Logic:
            // 1. Iterate all surveys for this site.
            // 2. Fetch assets & inspections for each survey.
            // 3. Group by Location (Building).
            // 4. Generate Excel for each Group.
            // 5. Zip them? Or just save them to a specialized folder? 
            //    On iOS, we can save to 'Documents/Surveys/Site/...' and open the folder?
            //    Or just share one by one?
            //    The user wants "organized into folders".
            //    On mobile, creating actual folders visible to user is tricky without StorageAccessFramework (Android only).
            //    On iOS, we can use Sharing.shareAsync with a ZIP file containing the folders?
            //    Or just flat export with naming convention: "Site - Building - ServiceLine.xlsx".

            Alert.alert(
                "Export Feature",
                "This will generate multiple Excel files based on Location and Service Line.\n\nSince folder creation is restricted on mobile, files will be named:\n'[Location]_[ServiceLine].xlsx'",
                [
                    { text: "Cancel", style: "cancel", onPress: () => setExporting(false) },
                    { text: "Continue", onPress: () => performBatchExport() }
                ]
            );

        } catch (error) {
            console.error(error);
            setExporting(false);
        }
    };

    const handleDeleteSurvey = (survey: any) => {
        Alert.alert(
            "Delete Survey",
            `Are you sure you want to delete the survey for ${survey.trade}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await hybridStorage.deleteSurvey(survey.id);
                            // Refresh list
                            if (selectedSite) {
                                loadSurveysForSite(selectedSite);
                            }
                        } catch (error) {
                            console.error("Failed to delete survey:", error);
                            Alert.alert("Error", "Failed to delete survey");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };



    const performBatchExport = async () => {
        try {
            let filesGenerated = 0;
            const generatedFiles: string[] = [];

            // Ensure directory exists
            const dirInfo = await FileSystem.getInfoAsync(REPORTS_DIR);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(REPORTS_DIR, { intermediates: true });
            }

            for (const survey of surveys) {
                const inspections = await hybridStorage.getInspectionsForSurvey(survey.id);
                if (inspections.length === 0) continue;

                // We need assets to know the location/building
                const allAssets = await hybridStorage.getAssets(selectedSite.id);
                const surveyData = inspections.map(insp => {
                    const asset = allAssets.find(a => a.id === insp.asset_id);
                    return { inspection: insp, asset };
                }).filter(item => item.asset);

                // Group by Building (Location)
                const byBuilding: Record<string, any[]> = {};
                surveyData.forEach(item => {
                    const building = item.asset.building || item.asset.building_name || 'Unknown Building';
                    if (!byBuilding[building]) byBuilding[building] = [];
                    byBuilding[building].push(item);
                });

                // Generate Excel for each Building
                for (const building of Object.keys(byBuilding)) {
                    // Sanitize filename
                    const safeBuilding = building.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
                    const safeSite = selectedSite.name.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
                    const safeTrade = survey.trade.replace(/[^a-zA-Z0-9_\-\.]/g, '_');

                    const filename = `${safeSite}_${safeBuilding}_${safeTrade}.xlsx`;
                    const destination = REPORTS_DIR + filename;

                    // Use backend export feature which supports location filter
                    // We simply request the export with 'location' param
                    await downloadSurveyReport(survey.id, building, destination);

                    console.log(`Generated ${filename}`);
                    filesGenerated++;
                    generatedFiles.push(filename);
                }
            }

            setExporting(false);
            Alert.alert("Export Complete", `Generated ${filesGenerated} files.\nChecked ${surveys.length} surveys.`);

        } catch (e: any) {
            Alert.alert("Error", e.message);
            setExporting(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: theme.colors.onBackground }}>Survey Management</Text>

                {/* Site Selector */}
                <Menu
                    visible={siteMenuVisible}
                    onDismiss={() => setSiteMenuVisible(false)}
                    anchor={
                        <Button
                            mode="outlined"
                            onPress={() => setSiteMenuVisible(true)}
                            icon="chevron-down"
                            contentStyle={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}
                            style={{ marginBottom: 16, borderColor: theme.colors.outline }}
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

                {/* Actions Bar */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                    <Searchbar
                        placeholder="Search surveys..."
                        onChangeText={setSearchQuery}
                        value={searchQuery}
                        style={{ flex: 1, height: 45 }}
                        inputStyle={{ minHeight: 0 }}
                    />
                    <IconButton
                        icon="microsoft-excel"
                        mode="contained"
                        containerColor="#1D6F42"
                        iconColor="white"
                        size={24}
                        disabled={!selectedSite || exporting}
                        onPress={handleBatchExport}
                    />
                </View>
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 50 }} size="large" />
            ) : (
                <FlatList
                    data={filteredSurveys}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
                    renderItem={({ item }) => (
                        <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
                            <View style={styles.cardHeader}>
                                <View>
                                    <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{item.trade}</Text>
                                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                                        {new Date(item.created_at).toLocaleDateString()} • {item.surveyor_name || 'Unknown Surveyor'}
                                    </Text>
                                </View>
                                <Chip
                                    style={{ backgroundColor: item.status === 'completed' || item.status === 'submitted' ? '#E6F4EA' : '#FEF7E0' }}
                                    textStyle={{ color: item.status === 'completed' || item.status === 'submitted' ? '#1E8E3E' : '#D93025' }}
                                    compact
                                >
                                    {item.status?.toUpperCase() || 'DRAFT'}
                                </Chip>
                            </View>

                            <Divider style={{ marginVertical: 12 }} />

                            <View style={styles.cardActions}>
                                <Button
                                    mode="text"
                                    compact
                                    onPress={() => navigation.navigate('AssetInspection', {
                                        surveyId: item.id,
                                        siteName: item.site_name,
                                        trade: item.trade,
                                        assetOption: 'resume' // Ensure this option loads existing
                                    })}
                                >
                                    Resume / Edit
                                </Button>
                                <Button
                                    mode="text"
                                    compact
                                    textColor={theme.colors.error}
                                    onPress={() => handleDeleteSurvey(item)}
                                >
                                    Delete
                                </Button>
                            </View>
                        </Surface>
                    )}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 50 }}>
                            <Text style={{ color: theme.colors.onSurfaceVariant }}>
                                {selectedSite ? "No surveys found for this site." : "Select a site to view surveys."}
                            </Text>
                        </View>
                    }
                />
            )}

            <FAB
                icon="plus"
                label="New Survey"
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                onPress={handleCreateSurvey}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 20, paddingBottom: 0 },
    card: { marginBottom: 12, borderRadius: 12, padding: 16 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardActions: { flexDirection: 'row', justifyContent: 'flex-end' },
    fab: { position: 'absolute', right: 20, bottom: 20 },
});
