import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme, Surface, Avatar, IconButton, Searchbar, Chip, Menu, Button, Divider, FAB, Portal, Modal, List } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { storage } from '../services/storage';
import * as hybridStorage from '../services/hybridStorage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as excelService from '../services/excelService';
import { syncService } from '../services/syncService';
import { surveysApi } from '../services/api';

// Simple UUID v4 generator for React Native
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};


export default function ReportsScreen() {
    const theme = useTheme();
    const navigation = useNavigation<any>();
    const [allSurveys, setAllSurveys] = useState<any[]>([]);
    const [filteredSurveys, setFilteredSurveys] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [menuVisible, setMenuVisible] = useState(false);

    // Site Filter
    const [sites, setSites] = useState<any[]>([]);
    const [selectedSite, setSelectedSite] = useState<any | null>(null);
    const [siteMenuVisible, setSiteMenuVisible] = useState(false);

    // Batch Export Summary Modal
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [generatedFiles, setGeneratedFiles] = useState<any[]>([]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadReports();
            loadSites(); // Refresh sites in case they were synced
        });
        return unsubscribe;
    }, [navigation]);

    useEffect(() => {
        applyFilters();
    }, [searchQuery, statusFilter, allSurveys, selectedSite]);

    // loadSites is now called on focus, initial useEffect removed to avoid duplicate logic

    const loadSites = async () => {
        try {
            const allSites = await hybridStorage.getSites();
            console.log(`ReportsScreen: Loaded ${allSites.length} sites`);
            setSites(allSites);
        } catch (e) {
            console.error("ReportsScreen: Failed to load sites", e);
        }
    };

    const loadReports = async () => {
        const surveys = await storage.getSurveys();
        // Sort by date descending
        surveys.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setAllSurveys(surveys);
    };

    const applyFilters = () => {
        let filtered = [...allSurveys];

        // Apply Site Filter
        if (selectedSite) {
            filtered = filtered.filter(survey =>
                (survey.site_id === selectedSite.id) ||
                (survey.siteId === selectedSite.id) ||
                (survey.site_name === selectedSite.name)
            );
        }

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(survey =>
                (survey.site_name?.toLowerCase().includes(query)) ||
                (survey.trade?.toLowerCase().includes(query)) ||
                (survey.surveyor_name?.toLowerCase().includes(query))
            );
        }

        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(survey => survey.status === statusFilter);
        }

        setFilteredSurveys(filtered);
    };

    const handleGenerateReport = async (survey: any) => {
        try {
            // Load inspections and assets for this survey
            const inspections = await storage.getInspectionsForSurvey(survey.id);
            const assets = await storage.getAssets(); // TODO: Filter by survey

            // Construct destination path for "Saved Reports"
            const folder = FileSystem.documentDirectory + 'SavedReports';
            const siteName = survey.site_name ? survey.site_name.replace(/[^a-z0-9]/gi, '_') : 'Unknown_Site';
            const siteDir = `${folder}/${siteName}`;

            await FileSystem.makeDirectoryAsync(siteDir, { intermediates: true }).catch(() => { });

            const filename = `Survey_${survey.trade || 'General'}_${survey.id.substring(0, 8)}.xlsx`;
            const destination = `${siteDir}/${filename}`;

            await excelService.generateAndShareExcel(survey, inspections, assets, destination);
        } catch (e: any) {
            // Log only the message to avoid crashing LogBox with circular/deep error objects
            console.error('Error generating report:', e.message || String(e));
            Alert.alert("Error", "Could not generate report: " + (e.message || "Unknown error"));
        }
    };

    const handleDeleteSurvey = async (surveyId: string) => {
        Alert.alert(
            'Delete Survey',
            'Are you sure you want to delete this survey? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await storage.deleteSurvey(surveyId);
                            loadReports();
                            Alert.alert('Success', 'Survey deleted successfully');
                        } catch (error) {
                            console.error('Error deleting survey:', error);
                            Alert.alert('Error', 'Failed to delete survey');
                        }
                    }
                }
            ]
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'submitted': return theme.colors.primary;
            case 'in_progress': return theme.colors.tertiary;
            case 'draft': return theme.colors.outline;
            default: return theme.colors.onSurfaceVariant;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'submitted': return 'Submitted';
            case 'in_progress': return 'In Progress';
            case 'draft': return 'Draft';
            default: return status;
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <View style={{ borderRadius: 20, overflow: 'hidden' }}>
                <View style={styles.cardContent}>
                    <Surface style={[styles.iconBox, { backgroundColor: theme.colors.primaryContainer }]}>
                        <Avatar.Icon
                            size={32}
                            icon={item.status === 'submitted' ? 'file-check' : 'file-document'}
                            color={theme.colors.onPrimaryContainer}
                            style={{ backgroundColor: 'transparent' }}
                        />
                    </Surface>
                    <View style={styles.surveyInfo}>
                        <Text style={styles.siteName}>{item.site_name || 'Unnamed Site'}</Text>
                        <Text style={styles.surveyDetails}>
                            {item.trade || 'General'}
                            {item.location ? ` • ${item.location}` : ''}
                            • {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                        {item.surveyor_name && (
                            <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                                By: {item.surveyor_name}
                            </Text>
                        )}
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: item.status === 'submitted' ? theme.colors.primaryContainer : theme.colors.surfaceVariant }
                        ]}>
                            <Text style={{
                                fontSize: 12,
                                color: item.status === 'submitted' ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant
                            }}>
                                {item.status?.toUpperCase() || 'UNKNOWN'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.actions}>
                        {item.status !== 'submitted' && (
                            <Button
                                mode="contained-tonal"
                                compact
                                onPress={async () => {
                                    const assets = await storage.getAssets();
                                    const surveyAssets = assets.filter((a: any) =>
                                        a.site_name === item.site_name &&
                                        (!item.trade || a.service_line === item.trade) &&
                                        (!item.location || a.floor === item.location || a.area === item.location)
                                    );

                                    navigation.navigate('AssetInspection', {
                                        surveyId: item.id,
                                        siteName: item.site_name,
                                        trade: item.trade,
                                        location: item.location,
                                        preloadedAssets: surveyAssets,
                                        assetOption: 'resume'
                                    })
                                }}
                            >
                                Resume
                            </Button>
                        )}
                        <IconButton
                            icon="share-variant"
                            mode="contained"
                            containerColor={theme.colors.primaryContainer}
                            iconColor={theme.colors.onPrimaryContainer}
                            onPress={() => handleGenerateReport(item)}
                            size={20}
                        />
                        <IconButton
                            icon="delete"
                            mode="contained"
                            containerColor={theme.colors.errorContainer}
                            iconColor={theme.colors.onErrorContainer}
                            onPress={() => handleDeleteSurvey(item.id)}
                            size={20}
                        />
                    </View>
                </View>
            </View>
        </Surface >
    );

    const [exporting, setExporting] = useState(false);

    const handleBatchExport = async () => {
        if (!selectedSite) {
            Alert.alert('Error', 'Please select a site first.');
            return;
        }

        try {
            // 1. Fetch all assets for this site from backend
            const allSiteAssets = await hybridStorage.getAssets();
            const siteAssets = allSiteAssets.filter((a: any) => a.site_id === selectedSite.id || a.siteId === selectedSite.id);

            if (siteAssets.length === 0) {
                Alert.alert('No Assets', 'No assets found for this site. Please upload an asset register first.');
                return;
            }

            // 2. Identify unique combinations of location × service_line
            const combinations = new Map<string, { location: string; serviceLine: string }>();

            siteAssets.forEach((asset: any) => {
                const location = asset.building || 'General';
                const serviceLine = asset.serviceLine || asset.service_line;

                if (serviceLine) {
                    const key = `${location}|${serviceLine}`;
                    if (!combinations.has(key)) {
                        combinations.set(key, { location, serviceLine });
                    }
                }
            });

            const totalCombinations = combinations.size;

            if (totalCombinations === 0) {
                Alert.alert('No Data', 'No valid location × service line combinations found in assets.');
                return;
            }

            // 3. Show confirmation dialog
            Alert.alert(
                'Create & Export Surveys',
                `This will create ${totalCombinations} surveys (one per location × service line combination) and export them.\n\nProceed?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Create & Export',
                        onPress: async () => {
                            setExporting(true);
                            setGeneratedFiles([]);
                            const files: any[] = [];

                            try {
                                // 4. Create surveys on backend for each combination
                                console.log(`📝 Creating ${totalCombinations} surveys on backend...`);
                                const createdSurveys: any[] = [];

                                for (const [key, combo] of combinations) {
                                    try {
                                        console.log(`Creating survey: ${combo.location} × ${combo.serviceLine}`);
                                        const survey = await surveysApi.create({
                                            siteId: selectedSite.id,
                                            trade: combo.serviceLine
                                        });
                                        createdSurveys.push({
                                            ...survey,
                                            location: combo.location
                                        });
                                        console.log(`✅ Created survey ID: ${survey.id}`);
                                    } catch (error: any) {
                                        console.error(`Failed to create survey for ${combo.location} × ${combo.serviceLine}:`, error);
                                        // Continue with other surveys even if one fails
                                    }
                                }

                                if (createdSurveys.length === 0) {
                                    throw new Error('Failed to create any surveys');
                                }

                                // 5. Create directory structure
                                const timestamp = new Date().toISOString().split('T')[0];
                                const siteDir = `${FileSystem.documentDirectory}SavedReports/${selectedSite.name}_${timestamp}`;
                                await FileSystem.makeDirectoryAsync(siteDir, { intermediates: true });

                                // 6. Export each survey
                                console.log(`📤 Exporting ${createdSurveys.length} surveys...`);

                                for (const survey of createdSurveys) {
                                    try {
                                        const locationDir = `${siteDir}/${survey.location.replace(/[^a-z0-9]/gi, '_')}`;
                                        await FileSystem.makeDirectoryAsync(locationDir, { intermediates: true });

                                        const filename = `${survey.trade}_${survey.location.replace(/[^a-z0-9]/gi, '_')}.xlsx`;
                                        const path = `${locationDir}/${filename}`;

                                        console.log(`📤 Exporting: /surveys/${survey.id}/export?location=${survey.location}`);
                                        await excelService.downloadSurveyReport(survey.id, survey.location, path);

                                        files.push({
                                            name: filename,
                                            uri: path,
                                            trade: survey.trade,
                                            location: survey.location
                                        });
                                        console.log(`✅ Exported: ${filename}`);
                                    } catch (error: any) {
                                        console.error(`Failed to export survey ${survey.id}:`, error);
                                        // Continue with other exports
                                    }
                                }

                                setGeneratedFiles(files);
                                setReportModalVisible(true);

                                // Reload surveys to show newly created ones
                                await loadReports();

                                Alert.alert(
                                    'Success',
                                    `Created ${createdSurveys.length} surveys and exported ${files.length} files to:\n${siteDir}`
                                );
                            } catch (error: any) {
                                console.error('Batch export failed:', error);
                                Alert.alert('Error', `Failed to create/export surveys: ${error.message}`);
                            } finally {
                                setExporting(false);
                            }
                        }
                    }
                ]
            );
        } catch (error: any) {
            console.error('Failed to prepare batch export:', error);
            Alert.alert('Error', 'Failed to load assets for batch export.');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontSize: 28, fontWeight: '900', color: theme.colors.onBackground, letterSpacing: -0.5 }} numberOfLines={1} adjustsFontSizeToFit>Survey Management</Text>
                        <Text style={{ fontSize: 14, color: theme.colors.onSurfaceVariant, marginTop: 4, fontWeight: '500' }} numberOfLines={1}>
                            {selectedSite?.name || 'All Sites'} • {filteredSurveys.length} surveys
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 4, zIndex: 100 }}>
                        <IconButton
                            icon="folder-text-outline"
                            mode="contained"
                            containerColor={theme.colors.surfaceVariant}
                            iconColor={theme.colors.onSurfaceVariant}
                            onPress={() => navigation.navigate('SavedReports')}
                        />
                        <IconButton
                            icon="folder-download"
                            mode="contained"
                            containerColor={theme.colors.secondaryContainer}
                            iconColor={theme.colors.onSecondaryContainer}
                            onPress={handleBatchExport}
                            loading={exporting}
                            disabled={exporting}
                        />
                        <Menu
                            visible={siteMenuVisible}
                            onDismiss={() => setSiteMenuVisible(false)}
                            anchor={
                                <IconButton
                                    icon="filter-variant"
                                    mode="outlined"
                                    onPress={() => setSiteMenuVisible(true)}
                                    iconColor={theme.colors.primary}
                                    containerColor={selectedSite ? theme.colors.primaryContainer : undefined}
                                />
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
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Searchbar
                    placeholder="Search surveys..."
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}
                    inputStyle={styles.searchInput}
                    iconColor={theme.colors.primary}
                    elevation={1}
                />
            </View>

            {/* Horizontal Filters */}
            <View style={styles.filterContainer}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={[
                        { label: 'All', value: 'all', count: allSurveys.length },
                        { label: 'Submitted', value: 'submitted', count: allSurveys.filter(s => s.status === 'submitted').length },
                        { label: 'In Progress', value: 'in_progress', count: allSurveys.filter(s => s.status === 'in_progress').length },
                        { label: 'Draft', value: 'draft', count: allSurveys.filter(s => s.status === 'draft').length },
                    ]}
                    keyExtractor={item => item.value}
                    contentContainerStyle={{ paddingHorizontal: 20 }}
                    renderItem={({ item }) => (
                        <Chip
                            selected={statusFilter === item.value}
                            onPress={() => setStatusFilter(item.value)}
                            style={[
                                styles.filterChip,
                                statusFilter === item.value && { backgroundColor: theme.colors.secondaryContainer }
                            ]}
                            textStyle={
                                statusFilter === item.value
                                    ? { color: theme.colors.onSecondaryContainer, fontWeight: 'bold' }
                                    : { color: theme.colors.onSurfaceVariant }
                            }
                            showSelectedOverlay
                        >
                            {item.label} ({item.count})
                        </Chip>
                    )}
                />
            </View>

            <FlatList
                style={{ flex: 1 }}
                data={filteredSurveys}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 20, paddingTop: 0 }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Surface style={[styles.emptyCard, { backgroundColor: 'transparent' }]} elevation={0}>
                            <Avatar.Icon
                                size={80}
                                icon="file-search-outline"
                                style={{ backgroundColor: theme.colors.surfaceVariant }}
                                color={theme.colors.onSurfaceVariant}
                            />
                            <Text style={[styles.emptyTitle, { color: theme.colors.onSurface, marginTop: 16, fontSize: 18, fontWeight: 'bold' }]}>
                                No Reports Found
                            </Text>
                            <Text style={[styles.emptyDescription, { color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8, marginBottom: 24 }]}>
                                {searchQuery || statusFilter !== 'all'
                                    ? `No surveys match "${statusFilter === 'all' ? searchQuery : statusFilter}"`
                                    : 'Start a new survey to see it here.'}
                            </Text>

                            {/* Explicit Action for Empty State */}
                            {selectedSite && !searchQuery && statusFilter === 'all' && (
                                <View style={{ alignItems: 'center' }}>
                                    <Button
                                        mode="contained"
                                        onPress={handleBatchExport}
                                        icon="folder-plus"
                                        contentStyle={{ height: 48, paddingHorizontal: 16 }}
                                        labelStyle={{ fontSize: 16 }}
                                    >
                                        Create Reports for {selectedSite.name}
                                    </Button>
                                    <Text style={{ marginTop: 12, color: theme.colors.onSurfaceVariant, fontSize: 12, textAlign: 'center', maxWidth: 280 }}>
                                        Auto-creates surveys from your Asset Register and generates Excel files.
                                    </Text>
                                </View>
                            )}
                        </Surface>
                    </View>
                }
            />
            <FAB
                icon="plus"
                label="New Survey"
                style={styles.fab}
                onPress={() => navigation.navigate('StartSurvey', { initialSite: selectedSite })}
            />
            <Portal>
                <Modal
                    visible={reportModalVisible}
                    onDismiss={() => setReportModalVisible(false)}
                    contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
                >
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Generated Reports</Text>
                        <IconButton icon="close" onPress={() => setReportModalVisible(false)} />
                    </View>
                    <Divider />
                    <FlatList
                        data={generatedFiles}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item }) => (
                            <List.Item
                                title={item.name}
                                description={`${item.trade} • ${item.location}`}
                                left={props => <List.Icon {...props} icon="file-excel" color="#107c41" />}
                                onPress={async () => {
                                    if (await Sharing.isAvailableAsync()) {
                                        await Sharing.shareAsync(item.uri);
                                    }
                                }}
                                right={props => <IconButton {...props} icon="share-variant" />}
                            />
                        )}
                        style={{ maxHeight: 400 }}
                    />
                    <Divider />
                    <Button
                        mode="contained"
                        onPress={() => setReportModalVisible(false)}
                        style={{ margin: 16 }}
                    >
                        Close
                    </Button>
                </Modal>
            </Portal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 20, paddingBottom: 10 },
    searchContainer: {
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    searchBar: {
        borderRadius: 14,
        height: 48,
    },
    searchInput: {
        minHeight: 0,
    },
    filterContainer: {
        marginBottom: 16,
    },
    filterChip: {
        marginRight: 8,
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    card: {
        marginBottom: 16,
        borderRadius: 20,
        // overflow: 'hidden', // Moved to inner View
        borderWidth: 1,
        borderColor: '#E7E5E4'
    },
    cardContent: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    iconBox: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    surveyInfo: { flex: 1, marginLeft: 16 },
    siteName: { fontSize: 16, fontWeight: '900', letterSpacing: -0.3 },
    surveyDetails: { fontSize: 13, marginTop: 4, opacity: 0.7 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 10, alignSelf: 'flex-start' },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },

    // Empty State
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyCard: {
        alignItems: 'center',
        padding: 40,
        backgroundColor: 'transparent'
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 20,
    },
    emptyDescription: {
        textAlign: 'center',
        marginTop: 8,
        maxWidth: 250,
        lineHeight: 20,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
    },
    // Modal Styles
    modalContent: {
        margin: 20,
        borderRadius: 16,
        paddingTop: 8,
        paddingBottom: 0,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: 20,
        paddingRight: 8,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    }
});
