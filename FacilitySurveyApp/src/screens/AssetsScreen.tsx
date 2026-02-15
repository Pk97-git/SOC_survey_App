import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, ActivityIndicator, Platform } from 'react-native';
import { Text, FAB, useTheme, Searchbar, Chip, Surface, IconButton, Button, Menu, Divider, ProgressBar } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as hybridStorage from '../services/hybridStorage';
import * as DocumentPicker from 'expo-document-picker';


const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    header: {
        marginBottom: 20,
        alignItems: 'flex-start'
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    actionBar: {
        flexDirection: 'row',
        marginBottom: 16,
        alignItems: 'center'
    },
    listContent: {
        paddingBottom: 100,
    },
    card: {
        marginBottom: 12,
        borderRadius: 16,
        // overflow: 'hidden', // Moved to inner View
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    assetName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    assetDetails: {
        fontSize: 14,
        marginBottom: 2,
    },
    assetLocation: {
        fontSize: 12,
    },
    actions: {
        flexDirection: 'row',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressCard: {
        padding: 30,
        borderRadius: 16,
        minWidth: 280,
        alignItems: 'center',
    },
    progressMessage: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 16,
        textAlign: 'center',
    },
    progressCount: {
        fontSize: 14,
        marginTop: 8,
    },
});

const AssetItem = React.memo(({ item, onEdit, onDelete, theme }: any) => (
    <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <View style={{ borderRadius: 16, overflow: 'hidden' }}>
            <View style={styles.cardContent}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.assetName, { color: theme.colors.onSurface }]} numberOfLines={1}>
                        {item.name} <Text style={{ fontSize: 12, color: item.status === 'Active' ? theme.colors.primary : theme.colors.error }}>({item.status})</Text>
                    </Text>
                    <Text style={[styles.assetDetails, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                        {item.service_line} • {item.ref_code} {item.asset_tag ? `/ ${item.asset_tag}` : ''}
                    </Text>
                    <Text style={[styles.assetLocation, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                        {item.building} • {item.location}
                    </Text>
                </View>
                <View style={styles.actions}>
                    <IconButton
                        icon="pencil"
                        size={20}
                        iconColor={theme.colors.primary}
                        onPress={() => onEdit(item)}
                    />
                    <IconButton
                        icon="delete"
                        size={20}
                        iconColor={theme.colors.error}
                        onPress={() => onDelete(item.id)}
                    />
                </View>
            </View>
        </View>
    </Surface>
));

export default function AssetsScreen() {
    const navigation = useNavigation<any>();
    const theme = useTheme();
    const [assets, setAssets] = useState<any[]>([]);
    const [filteredAssets, setFilteredAssets] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const [selectedServiceLine, setSelectedServiceLine] = useState<string | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
    const [serviceLines, setServiceLines] = useState<string[]>([]);
    const [locations, setLocations] = useState<string[]>([]);
    const [serviceLineMenuVisible, setServiceLineMenuVisible] = useState(false);
    const [locationMenuVisible, setLocationMenuVisible] = useState(false);

    // Phase 5: Enforce Site Selection
    const [selectedSite, setSelectedSite] = useState<any | null>(null);
    const [sites, setSites] = useState<any[]>([]);
    const [siteMenuVisible, setSiteMenuVisible] = useState(false);

    // Debug Menu
    useEffect(() => {
        console.log(`[AssetsScreen] Menu Visible: ${siteMenuVisible}, Sites: ${sites.length}`);
    }, [siteMenuVisible, sites]);

    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0, message: '' });

    useFocusEffect(
        React.useCallback(() => {
            loadSites();
        }, [])
    );

    useEffect(() => {
        if (selectedSite) {
            loadAssetsForSite(selectedSite);
            // Reset filters when site changes
            setSelectedServiceLine(null);
            setSelectedLocation(null);
        } else {
            setAssets([]);
            setFilteredAssets([]);
            setServiceLines([]);
            setLocations([]);
        }
    }, [selectedSite]);

    useEffect(() => {
        filterAssets();
    }, [searchQuery, assets, selectedServiceLine, selectedLocation]);

    const loadSites = async () => {
        console.log('[AssetsScreen] Loading sites...');
        const allSites = await hybridStorage.getSites();
        console.log(`[AssetsScreen] Loaded ${allSites.length} sites`);
        setSites(allSites);
    };

    const loadAssetsForSite = async (site: any) => {
        try {
            // Fetch assets specifically for this site using its ID
            const siteAssets = await hybridStorage.getAssets(site.id);
            console.log(`Loaded ${siteAssets.length} assets for site ${site.name}`);
            setAssets(siteAssets);
            setFilteredAssets(siteAssets);

            // Extract unique filter options
            const uniqueServiceLines = Array.from(new Set(siteAssets.map((a: any) => a.service_line).filter(Boolean))).sort() as string[];
            const uniqueLocations = Array.from(new Set(siteAssets.map((a: any) => a.location).filter(Boolean))).sort() as string[];
            setServiceLines(uniqueServiceLines);
            setLocations(uniqueLocations);
        } catch (error) {
            console.error('Failed to load assets:', error);
            Alert.alert('Error', 'Failed to load assets for this site.');
        }
    };

    const filterAssets = () => {
        let filtered = [...assets];

        if (searchQuery) {
            filtered = filtered.filter((asset: any) =>
                asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                asset.ref_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                asset.service_line?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (selectedServiceLine) {
            filtered = filtered.filter((asset: any) => asset.service_line === selectedServiceLine);
        }

        if (selectedLocation) {
            filtered = filtered.filter((asset: any) => asset.location === selectedLocation);
        }

        setFilteredAssets(filtered);
    };

    const handleBulkImport = async () => {
        if (!selectedSite) {
            Alert.alert("Required", "Please select a site first.");
            return;
        }

        // Don't show loader yet, let user pick file first
        try {
            console.log('Opening Document Picker...');
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
                copyToCacheDirectory: true
            });

            if (result.canceled) {
                return;
            }

            // Start loading only after selection
            setImporting(true);
            setImportProgress({ current: 0, total: 0, message: 'Uploading file to server...' });

            const uri = result.assets[0].uri;
            console.log('Reading file from:', uri);

            // DEBUG: File selected
            // Alert.alert('Debug', `Selected file: ${uri}`);

            setImporting(true);
            setImportProgress({ current: 0, total: 0, message: 'Uploading file to server...' });

            // Call backend to handle the import
            const response = await hybridStorage.uploadAssetFile(selectedSite.id, uri, (progress) => {
                if (progress < 100) {
                    setImportProgress({ current: progress, total: 100, message: `Uploading file... ${progress}%` });
                } else {
                    setImportProgress({ current: 100, total: 100, message: 'Processing on server... This may take a minute.' });
                }
            });

            console.log('Upload successful. Count:', response.count);

            setImporting(false);

            Alert.alert(
                'Import Successful',
                `Imported ${response.count} assets.\n\nSummary:\n${response.summary.join('\n')}\n\nNext Step: Go to Surveys tab and click the Batch Export (folder) icon to generate your files.`,
                [
                    { text: 'Stay Here', onPress: () => loadAssetsForSite(selectedSite) },
                    {
                        text: 'Go to Surveys',
                        onPress: () => {
                            loadAssetsForSite(selectedSite);
                            // Navigate to Survey tab
                            // The tab navigator name is 'ReportsTab' (labeled as 'Surveys')
                            navigation.navigate('ReportsTab', { screen: 'SurveyManagement', params: { initialSite: selectedSite } });
                        }
                    }
                ]
            );

        } catch (error: any) {
            // Log only message to avoid LogBox crash with deep stack traces
            console.error('Import error:', error.message || String(error));
            setImporting(false);
            Alert.alert('Error', 'Failed to import assets. Please check the Excel format.\nServer says: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleAddAsset = () => {
        if (!selectedSite) return;
        navigation.navigate('AssetForm', {
            siteName: selectedSite.name,
            siteId: selectedSite.id,
            onSave: () => loadAssetsForSite(selectedSite),
        });
    };

    const handleEditAsset = (asset: any) => {
        navigation.navigate('AssetForm', {
            asset,
            siteName: selectedSite?.name,
            siteId: selectedSite?.id,
            onSave: () => selectedSite && loadAssetsForSite(selectedSite),
        });
    };

    const handleDeleteAsset = (assetId: string) => {
        Alert.alert(
            'Delete Asset',
            'Are you sure you want to delete this asset?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await hybridStorage.deleteAsset(assetId);
                        if (selectedSite) loadAssetsForSite(selectedSite.name);
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Import Progress Modal */}
            <Modal visible={importing} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <Surface style={[styles.progressCard, { backgroundColor: theme.colors.surface }]} elevation={4}>
                        {importProgress.total > 0 && importProgress.total <= 100 ? (
                            <ProgressBar progress={importProgress.current / 100} color={theme.colors.primary} style={{ width: 200, height: 8, borderRadius: 4 }} />
                        ) : (
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                        )}

                        <Text style={[styles.progressMessage, { color: theme.colors.onSurface }]}>
                            {importProgress.message}
                        </Text>

                        {importProgress.total > 0 && importProgress.total <= 100 && (
                            <Text style={[styles.progressCount, { color: theme.colors.onSurfaceVariant }]}>
                                {importProgress.current}%
                            </Text>
                        )}
                    </Surface>
                </View>
            </Modal>

            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.colors.onBackground }]}>
                    Asset Register
                </Text>

                {/* Site Selector */}
                <Menu
                    visible={siteMenuVisible}
                    onDismiss={() => setSiteMenuVisible(false)}
                    anchor={
                        <Button
                            mode="outlined"
                            onPress={openSiteMenu}
                            icon="chevron-down"
                            contentStyle={{ flexDirection: 'row-reverse' }}
                            style={{ marginTop: 8 }}
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
                    <Divider />
                    <Menu.Item
                        onPress={() => {
                            setSiteMenuVisible(false);
                            navigation.navigate('SiteManagement');
                        }}
                        title="Manage Sites..."
                        leadingIcon="plus"
                    />
                </Menu>
            </View>

            {!selectedSite ? (
                <View style={styles.emptyContainer}>
                    <Surface style={[styles.card, { padding: 30, alignItems: 'center' }]} elevation={2}>
                        <IconButton icon="office-building-marker" size={48} iconColor={theme.colors.primary} />
                        <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 16 }}>Select a Site</Text>
                        <Text style={{ textAlign: 'center', marginVertical: 12, color: theme.colors.onSurfaceVariant }}>
                            Please select a site from the dropdown above to manage its assets or import new ones.
                        </Text>
                    </Surface>
                </View>
            ) : (
                <>
                    {/* Action Bar */}
                    <View style={styles.actionBar}>
                        <Searchbar
                            placeholder="Search assets..."
                            onChangeText={setSearchQuery}
                            value={searchQuery}
                            style={{ flex: 1, marginRight: 8 }}
                        />
                        <IconButton
                            icon="file-excel"
                            mode="contained"
                            containerColor={theme.colors.secondaryContainer}
                            iconColor={theme.colors.onSecondaryContainer}
                            onPress={handleBulkImport}
                            size={24}
                        />
                    </View>

                    {/* Filters */}
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                        {/* Service Line Filter */}
                        <Menu
                            visible={serviceLineMenuVisible}
                            onDismiss={() => setServiceLineMenuVisible(false)}
                            anchor={
                                <Button
                                    mode={selectedServiceLine ? "contained" : "outlined"}
                                    onPress={() => setServiceLineMenuVisible(true)}
                                    icon="filter-variant"
                                    compact
                                    contentStyle={{ flexDirection: 'row-reverse' }}
                                >
                                    {selectedServiceLine || "Service Line"}
                                </Button>
                            }
                        >
                            <Menu.Item onPress={() => { setSelectedServiceLine(null); setServiceLineMenuVisible(false); }} title="All Service Lines" />
                            <Divider />
                            {serviceLines.map(sl => (
                                <Menu.Item
                                    key={sl}
                                    onPress={() => { setSelectedServiceLine(sl); setServiceLineMenuVisible(false); }}
                                    title={sl}
                                />
                            ))}
                        </Menu>

                        {/* Location Filter */}
                        <Menu
                            visible={locationMenuVisible}
                            onDismiss={() => setLocationMenuVisible(false)}
                            anchor={
                                <Button
                                    mode={selectedLocation ? "contained" : "outlined"}
                                    onPress={() => setLocationMenuVisible(true)}
                                    icon="map-marker"
                                    compact
                                    contentStyle={{ flexDirection: 'row-reverse' }}
                                >
                                    {selectedLocation || "Location"}
                                </Button>
                            }
                        >
                            <Menu.Item onPress={() => { setSelectedLocation(null); setLocationMenuVisible(false); }} title="All Locations" />
                            <Divider />
                            {locations.map(loc => (
                                <Menu.Item
                                    key={loc}
                                    onPress={() => { setSelectedLocation(loc); setLocationMenuVisible(false); }}
                                    title={loc}
                                />
                            ))}
                        </Menu>

                        {(selectedServiceLine || selectedLocation) && (
                            <IconButton
                                icon="close-circle-outline"
                                size={20}
                                onPress={() => { setSelectedServiceLine(null); setSelectedLocation(null); }}
                            />
                        )}
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 }}>
                        <Text style={{ color: theme.colors.onSurfaceVariant }}>
                            {filteredAssets.length} assets found
                        </Text>
                    </View>

                    {/* Asset List */}
                    <FlatList
                        data={filteredAssets}
                        style={{ flex: 1 }}
                        keyExtractor={(item, index) => item.id ? `${item.id}-${index}` : `asset-${index}`}
                        contentContainerStyle={styles.listContent}
                        initialNumToRender={10}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                        removeClippedSubviews={true}
                        updateCellsBatchingPeriod={50}
                        renderItem={({ item }) => <AssetItem item={item} onEdit={handleEditAsset} onDelete={handleDeleteAsset} theme={theme} />}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 16 }}>
                                    No assets found for {selectedSite.name}
                                </Text>
                                <Button mode="contained-tonal" icon="file-excel" onPress={handleBulkImport} style={{ marginTop: 16, marginBottom: 8 }}>
                                    Bulk Import from Excel
                                </Button>
                                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 14 }}>
                                    or
                                </Text>
                                <Button mode="text" onPress={handleAddAsset} style={{ marginTop: 8 }}>
                                    Add your first asset manually
                                </Button>
                            </View>
                        }
                    />

                    {/* Add Asset FAB */}
                    <FAB
                        icon="plus"
                        label="Add Asset"
                        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                        onPress={handleAddAsset}
                    />
                </>
            )}
        </SafeAreaView>
    );
}


