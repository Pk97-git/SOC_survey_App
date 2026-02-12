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
import { generateAndShareExcel } from '../services/excelService';

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
        const unsubscribe = navigation.addListener('focus', loadReports);
        return unsubscribe;
    }, [navigation]);

    useEffect(() => {
        applyFilters();
    }, [searchQuery, statusFilter, allSurveys, selectedSite]);

    useEffect(() => {
        loadSites();
    }, []);

    const loadSites = async () => {
        const allSites = await hybridStorage.getSites();
        setSites(allSites);
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

            await generateAndShareExcel(survey, inspections, assets, destination);
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
        // 1. Get all assets for this site to determine ALL locations and TRADES
        let allSiteAssets: any[] = [];
        if (selectedSite) {
            try {
                allSiteAssets = await hybridStorage.getAssets(selectedSite.id);
            } catch (e) {
                console.error("Failed to load assets for auto-create", e);
            }
        }

        // 2. Identify all unique trades (Service Lines)
        const allTrades = Array.from(new Set(allSiteAssets.map((a: any) => a.serviceLine || a.service_line).filter(Boolean)));

        // 3. Check which trades don't have a survey yet
        const existingTrades = new Set(filteredSurveys.map(s => s.trade));
        const missingTrades = allTrades.filter(trade => !existingTrades.has(trade));

        // 4. Calculate total FILES to be generated (Trades * Locations per Trade)
        let totalFileCount = 0;
        const allTargetTrades = Array.from(new Set([...Array.from(existingTrades), ...missingTrades]));

        for (const trade of allTargetTrades) {
            const tradeAssets = allSiteAssets.filter((a: any) =>
                (a.serviceLine || a.service_line) === trade
            );
            const uniqueLocations = new Set(tradeAssets.map((a: any) => a.building).filter(Boolean));
            totalFileCount += (uniqueLocations.size > 0 ? uniqueLocations.size : 1);
        }

        if (totalFileCount === 0) {
            Alert.alert('No Data', 'No surveys found and no assets available to create surveys from. Please select a site with assets first.');
            return;
        }

        Alert.alert(
            'Batch Export & Auto-Create',
            `Found ${filteredSurveys.length} existing survey records.\nWill Auto-Create ${missingTrades.length} new survey records.\n\nTotal: ${totalFileCount} Excel files will be generated (one per location).`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Proceed',
                    onPress: async () => {
                        setExporting(true);
                        setGeneratedFiles([]);
                        try {
                            // Base SavedReports directory
                            const baseReportsDir = FileSystem.documentDirectory + 'SavedReports';
                            await FileSystem.makeDirectoryAsync(baseReportsDir, { intermediates: true });

                            const cleanSiteName = selectedSite ? selectedSite.name.replace(/[^a-z0-9]/gi, '_') : 'Unknown_Site';
                            const siteDir = `${baseReportsDir}/${cleanSiteName}`;
                            await FileSystem.makeDirectoryAsync(siteDir, { intermediates: true });

                            const surveysToExport: any[] = [...filteredSurveys];

                            if (missingTrades.length > 0 && selectedSite) {
                                for (const trade of missingTrades) {
                                    try {
                                        const newSurvey = await hybridStorage.saveSurvey({
                                            site_id: selectedSite.id,
                                            trade: trade
                                        });
                                        surveysToExport.push({
                                            ...newSurvey,
                                            site_name: selectedSite.name
                                        });
                                    } catch (e) {
                                        console.error(`Failed to auto-create survey for ${trade}`, e);
                                    }
                                }
                                loadReports();
                            }

                            const files = [];

                            for (const survey of surveysToExport) {
                                const surveyAssets = allSiteAssets.filter((a: any) =>
                                    (a.serviceLine || a.service_line) === survey.trade
                                );

                                const locations = new Set(surveyAssets.map((a: any) => a.building).filter(Boolean));

                                if (locations.size === 0) {
                                    const filename = `${survey.trade}_${survey.id}.xlsx`;

                                    // Default "General" location folder
                                    const locationDir = `${siteDir}/General`;
                                    await FileSystem.makeDirectoryAsync(locationDir, { intermediates: true });

                                    const path = `${locationDir}/${filename}`;
                                    await excelService.downloadSurveyReport(survey.id, undefined, path);
                                    files.push({ name: filename, uri: path, trade: survey.trade, location: 'General' });
                                } else {
                                    for (const location of locations) {
                                        const cleanLocation = (location as string).replace(/[^a-z0-9]/gi, '_');
                                        const locationDir = `${siteDir}/${cleanLocation}`;
                                        await FileSystem.makeDirectoryAsync(locationDir, { intermediates: true });

                                        const filename = `${survey.trade}_${cleanLocation}.xlsx`;
                                        const path = `${locationDir}/${filename}`;
                                        await excelService.downloadSurveyReport(survey.id, location as string, path);
                                        files.push({ name: filename, uri: path, trade: survey.trade, location: location as string });
                                    }
                                }
                            }

                            setGeneratedFiles(files);
                            setReportModalVisible(true);

                        } catch (error) {
                            console.error('Batch export failed:', error);
                            Alert.alert('Error', 'Failed to batch export surveys.');
                        } finally {
                            setExporting(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontSize: 24, fontWeight: 'bold' }} numberOfLines={1} adjustsFontSizeToFit>Survey Management</Text>
                        <Text style={{ fontSize: 14, color: theme.colors.onSurfaceVariant, marginTop: 4 }} numberOfLines={1}>
                            {selectedSite?.name || 'All Sites'} ({filteredSurveys.length})
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
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
                keyExtractor={item => item.id}
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
    header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
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
