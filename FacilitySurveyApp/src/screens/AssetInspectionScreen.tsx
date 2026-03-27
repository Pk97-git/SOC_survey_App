import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Alert, FlatList, Platform, Modal } from 'react-native';
import { Text, FAB, useTheme, ProgressBar, Button, Surface, IconButton, Searchbar } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as Location from 'expo-location';
import { QRCodeScanner } from '../components/QRCodeScanner';
import { storage } from '../services/storage';
import * as hybridStorage from '../services/hybridStorage';
import AssetInspectionCard from '../components/AssetInspectionCard';
import { generateAndShareExcel } from '../services/excelService';
import { photoService } from '../services/photoService';
import { syncService } from '../services/syncService';
import NetInfo from '@react-native-community/netinfo';
import { Radius, Typography, Spacing } from '../constants/design';
import { ApiAsset } from '../services/api';

export default function AssetInspectionScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const theme = useTheme();

    const { surveyId, siteId, siteName, trade, preloadedAssets = [], assetOption } = route.params;

    // Use strongly typed ApiAsset and inspection interfaces instead of 'any' to prevent runtime crashes
    const [assets, setAssets] = useState<ApiAsset[]>(preloadedAssets);
    const [inspections, setInspections] = useState<Record<string, any>[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isScannerVisible, setIsScannerVisible] = useState(false);
    const [uploadStatus, setUploadStatus] = useState({ total: 0, completed: 0, failed: 0, currentAsset: '' });
    const [showUploadModal, setShowUploadModal] = useState(false);


    const assetRefs = useRef<{ [key: string]: View | null }>({});
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        loadInspections();
        if (assets.length === 0 && (siteName || siteId) && trade) {
            loadAssets();
        }
    }, [surveyId]);

    const loadInspections = async () => {
        try {
            const existingInspections = await hybridStorage.getInspectionsForSurvey(surveyId);
            setInspections(existingInspections);
        } catch (error) {
            console.error('Error loading inspections:', error);
        }
    };

    const [loadingAssets, setLoadingAssets] = useState(false);

    const loadAssets = async () => {
        setLoadingAssets(true);
        try {
            if (siteId) {
                const siteAssets = await hybridStorage.getAssets(siteId);
                const filtered = siteAssets.filter((a: any) => {
                    const tradeMatch = !trade || a.serviceLine === trade || a.service_line === trade;
                    const surveyLocation = route.params.location;
                    let locationMatch = true;
                    if (surveyLocation) {
                        const assetBldg = a.building || '';
                        const assetLoc = a.location || '';
                        const combinedAssetLoc = (assetBldg && assetLoc) ? `${assetBldg} - ${assetLoc}` : (assetBldg || assetLoc);
                        locationMatch = assetBldg === surveyLocation || assetLoc === surveyLocation || combinedAssetLoc === surveyLocation;
                    }
                    return tradeMatch && locationMatch;
                });
                const uniqueAssets = Array.from(new Map(filtered.map((item: any) => [item.id, item])).values());
                setAssets(uniqueAssets);
            } else if (siteName) {
                const fetchedAssets = await storage.getAssetsBySiteAndServiceLine(siteName, trade);
                const surveyLocation = route.params.location;
                let finalAssets = fetchedAssets;
                if (surveyLocation) {
                    finalAssets = fetchedAssets.filter((a: any) => {
                        const assetBldg = a.building || '';
                        const assetLoc = a.location || '';
                        const combinedAssetLoc = (assetBldg && assetLoc) ? `${assetBldg} - ${assetLoc}` : (assetBldg || assetLoc);
                        return assetBldg === surveyLocation || assetLoc === surveyLocation || combinedAssetLoc === surveyLocation;
                    });
                }
                const uniqueAssets = Array.from(new Map(finalAssets.map((item: any) => [item.id, item])).values());
                setAssets(uniqueAssets);
            }
        } catch (error) {
            console.error('Error loading assets:', error);
            Alert.alert('Error', 'Failed to load assets for this survey');
        } finally {
            setLoadingAssets(false);
        }
    };

    const handleBarcodeScanned = (scannedData: string) => {
        setIsScannerVisible(false); // Close scanner

        // Find asset by exactly matching ID or Ref Code
        const foundAsset = assets.find(a => a.id === scannedData || a.ref_code === scannedData);

        if (foundAsset) {
            // Scroll to it
            setSearchQuery(foundAsset.name || foundAsset.ref_code || '');
            const foundIndex = filteredAssets.findIndex(a => a.id === foundAsset.id);
            if (foundIndex !== -1 && flatListRef.current) {
                flatListRef.current.scrollToIndex({ index: foundIndex, animated: true, viewPosition: 0.5 });
            }
            Alert.alert('Asset Found', `Found asset: ${foundAsset.name || foundAsset.ref_code}`);
        } else {
            // Not found in this survey
            Alert.alert(
                'Asset Not Found',
                `Asset ID "${scannedData}" is not in this survey.\n\nWould you like to log a new issue using this ID?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Yes, Add New',
                        onPress: () => {
                            navigation.navigate('AssetForm', {
                                surveyId,
                                siteId,
                                siteName,
                                defaultTrade: trade,
                                defaultBuilding: route.params.location,
                                autoFillScanData: scannedData,
                                onSave: (newAsset: any) => {
                                    setAssets(prev => [newAsset, ...prev]);
                                    setSearchQuery(newAsset.name || newAsset.ref_code || '');
                                }
                            });
                        }
                    }
                ]
            );
        }
    };

    const captureGPS = async (): Promise<{ lat: number; lng: number } | null> => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'GPS permission is required');
                return null;
            }
            const location = await Location.getCurrentPositionAsync({});
            const lat = location.coords.latitude;
            const lng = location.coords.longitude;
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                Alert.alert('GPS Error', 'Invalid coordinates received. Please try again.');
                return null;
            }
            return { lat, lng };
        } catch (error) {
            console.error('Error capturing GPS:', error);
            Alert.alert('Error', 'Failed to capture GPS coordinates');
            return null;
        }
    };

    const handleInspectionUpdate = useCallback(async (assetId: string, updatedInspection: any) => {
        try {
            setInspections(prev => {
                const existing = prev.find(i => i.asset_id === assetId);
                if (existing) {
                    return prev.map(i => i.asset_id === assetId ? updatedInspection : i);
                } else {
                    return [...prev, updatedInspection];
                }
            });
            const savedInspection = await hybridStorage.saveAssetInspection(updatedInspection);
            if (savedInspection && savedInspection.id !== updatedInspection.id) {
                setInspections(prev => prev.map(i =>
                    i.asset_id === assetId ? { ...i, id: savedInspection.id } : i
                ));
            }
            await hybridStorage.updateSurvey(surveyId, { status: 'in_progress' });
        } catch (error) {
            console.error('Error saving inspection:', error);
        }
    }, [surveyId]);

    const handleAddAsset = () => {
        navigation.navigate('AssetForm', {
            defaultTrade: trade,
            defaultBuilding: route.params.location,
            siteName,
            siteId: siteId || route.params.siteId,
            onSave: async (newAsset: any) => {
                const assetWithSite = { ...newAsset, site_name: siteName, site_id: siteId || route.params.siteId };
                try {
                    const savedAsset = await hybridStorage.saveAsset(assetWithSite);
                    setAssets(prev => [...prev, savedAsset]);
                    navigation.goBack();
                } catch (error) {
                    console.error('Error saving asset:', error);
                    Alert.alert('Error', 'Failed to save asset');
                }
            }
        });
    };

    const handleSaveAndExit = async () => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm('Your progress has been auto-saved. You can resume this survey later.\n\nExit now?');
            if (confirmed) navigation.goBack();
        } else {
            Alert.alert(
                'Save & Exit',
                'Your progress has been auto-saved. You can resume this survey later.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Exit', onPress: () => navigation.goBack() }
                ]
            );
        }
    };

    const handleSubmitSurvey = async () => {
        const validationResults = assets.map(asset => {
            const inspection = inspections.find(i => i.asset_id === asset.id);
            const missing: string[] = [];
            if (!inspection) {
                missing.push('No inspection data');
            } else {
                if (!inspection.condition_rating) missing.push('Condition Rating');
                if (!inspection.overall_condition) missing.push('Overall Condition');
            }
            return { asset, inspection, missing, isComplete: missing.length === 0 };
        });

        const incompleteAssets = validationResults.filter(r => !r.isComplete);

        if (incompleteAssets.length > 0) {
            const assetList = incompleteAssets.slice(0, 5)
                .map(r => `• ${r.asset.name || 'Unnamed Asset'}: ${r.missing.join(', ')}`)
                .join('\n');
            const moreText = incompleteAssets.length > 5 ? `\n...and ${incompleteAssets.length - 5} more` : '';
            const msg = `${incompleteAssets.length} of ${assets.length} asset(s) are incomplete:\n\n${assetList}${moreText}\n\nSubmit anyway?`;

            if (Platform.OS === 'web') {
                const confirmed = window.confirm(msg);
                if (confirmed) performSubmit();
            } else {
                Alert.alert(
                    'Incomplete Inspections',
                    msg,
                    [
                        { text: 'Review', style: 'cancel' },
                        { text: 'Submit Anyway', style: 'destructive', onPress: () => performSubmit() }
                    ]
                );
            }
        } else {
            const totalPhotos = inspections.reduce((sum, i) => sum + (i.photos?.length || 0), 0);
            const msg = `Survey Summary:\n\n` +
                `• ${assets.length} asset${assets.length > 1 ? 's' : ''} inspected\n` +
                `• ${totalPhotos} photo${totalPhotos !== 1 ? 's' : ''} captured\n` +
                `• All required fields completed\n\n` +
                `Generate Excel report and submit?`;

            if (Platform.OS === 'web') {
                const confirmed = window.confirm(msg);
                if (confirmed) performSubmit();
            } else {
                Alert.alert(
                    'Ready to Submit',
                    msg,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Submit', onPress: () => performSubmit() }
                    ]
                );
            }
        }
    };

    const performSubmit = async () => {
        setSubmitting(true);
        setShowUploadModal(true);
        setUploadStatus({ total: 0, completed: 0, failed: 0, currentAsset: 'Preparing...' });
        
        try {
            // 1. Mark the survey as submitted locally so the sync engine knows to upload it
            await hybridStorage.updateSurvey(surveyId, { status: 'submitted' });

            // 2. If online, trigger a full background sync to ensure data and photos are pushed.
            // The sync service handles local ID -> backend UUID resolution safely.
            const netInfo = await NetInfo.fetch();
            if (netInfo.isConnected && syncService.isAuthenticated) {
                setUploadStatus({ total: 1, completed: 0, failed: 0, currentAsset: 'Syncing Data to Server...' });
                await syncService.syncAll();
                
                // If there were upload failures during sync, alert the user but continue generating Excel
                if (syncService.syncStatus.pendingUploads > 0) {
                    Alert.alert(
                        'Sync Incomplete',
                        `${syncService.syncStatus.pendingUploads} item(s) failed to sync to the server. They will upload automatically when your connection improves.`,
                        [{ text: 'OK' }]
                    );
                }
            }

            // 3. Generate Excel Report locally
            setUploadStatus({ total: 1, completed: 1, failed: 0, currentAsset: 'Finalizing Excel...' });
            const survey = { id: surveyId, site_name: siteName, trade, created_at: new Date().toISOString() };
            await generateAndShareExcel(survey, [], [], undefined, route.params.location);
            
            setShowUploadModal(false);
            if (Platform.OS === 'web') {
                window.alert('Survey submitted and Excel report generated!');
                navigation.goBack();
            } else {
                Alert.alert('Success', 'Survey submitted and Excel report generated!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
            }

        } catch (error) {
            console.error('Error submitting survey:', error);
            setShowUploadModal(false);
            setSubmitting(false);
            
            // Revert status if completely failed locally
            await hybridStorage.updateSurvey(surveyId, { status: 'in_progress' });
            Alert.alert('Error', 'Failed to submit survey. Please try again.');
        }
    };

    const rawCompletedCount = inspections.filter(i => i.condition_rating && i.overall_condition).length;
    const rawProgress = assets.length > 0 ? Math.min(1, Math.max(0, rawCompletedCount / assets.length)) : 0;
    // Round to 4 decimal places to prevent 'Loss of precision' crash in native Reanimated module
    const safeProgress = Math.round(rawProgress * 10000) / 10000;
    const completedCount = Math.min(rawCompletedCount, assets.length);
    const filteredAssets = assets.filter(asset =>
        asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.ref_code?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>

            {/* ── Maroon header ────────────────────────────────────────── */}
            <Surface style={[styles.header, { backgroundColor: theme.colors.primary }]} elevation={3}>
                <View style={styles.headerTop}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Surface style={{ backgroundColor: '#FF9800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 }} elevation={1}>
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 10 }}>V6.0-SYNC</Text>
                            </Surface>
                            <Text style={[Typography.h3, { color: '#FFFFFF', fontWeight: 'bold' }]}>
                                {siteName}
                            </Text>
                        </View>
                        <Text style={[Typography.bodySm, { color: 'rgba(255,255,255,0.8)', marginTop: 2 }]}>
                            {trade}{route.params.location ? ` · ${route.params.location}` : ''} · {new Date().toLocaleDateString()}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <IconButton
                            icon="qrcode-scan"
                            iconColor="#FFFFFF"
                            size={24}
                            onPress={() => setIsScannerVisible(true)}
                            style={{ marginRight: 0 }}
                        />
                        <IconButton
                            icon="close"
                            iconColor="#FFFFFF"
                            onPress={handleSaveAndExit}
                        />
                    </View>
                </View>

                {/* Progress */}
                <View style={styles.progressSection}>
                    <Text style={[Typography.bodyXs, { color: 'rgba(255,255,255,0.85)', marginBottom: Spacing[1] }]}>
                        Progress: {completedCount}/{assets.length} assets inspected ({Math.round(safeProgress * 100)}%)
                    </Text>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
                        <View style={{ height: '100%', backgroundColor: '#FFFFFF', width: `${safeProgress * 100}%` }} />
                    </View>
                </View>

                {/* Action buttons */}
                <View style={styles.headerActions}>
                    <Button
                        mode="outlined"
                        icon="content-save"
                        onPress={handleSaveAndExit}
                        compact
                        textColor="#FFFFFF"
                        style={{ borderColor: 'rgba(255,255,255,0.5)', borderRadius: Radius.sm }}
                    >
                        Save & Exit
                    </Button>
                    <Button
                        mode="contained"
                        icon="check"
                        onPress={handleSubmitSurvey}
                        loading={submitting}
                        disabled={assets.length === 0}
                        compact
                        buttonColor={theme.colors.tertiaryContainer}
                        textColor={theme.colors.onTertiaryContainer}
                        style={{ marginLeft: Spacing[2], borderRadius: Radius.sm }}
                        labelStyle={{ fontWeight: 'bold' }}
                    >
                        Submit Survey
                    </Button>
                </View>

                {/* Search */}
                <View style={{ marginTop: Spacing[3] }}>
                    <Searchbar
                        placeholder="Search assets (name or code)"
                        onChangeText={setSearchQuery}
                        value={searchQuery}
                        style={{ elevation: 0, backgroundColor: 'rgba(255,255,255,0.15)', height: 44 }}
                        inputStyle={{ color: '#FFFFFF', minHeight: 44, paddingBottom: 0, paddingTop: 0 }}
                        iconColor="rgba(255,255,255,0.7)"
                        placeholderTextColor="rgba(255,255,255,0.6)"
                    />
                </View>
            </Surface>

            {/* ── Asset list ───────────────────────────────────────────── */}
            {assets.length === 0 && !loadingAssets ? (
                <View style={styles.emptyContainer}>
                    <IconButton icon="clipboard-text-outline" size={60} iconColor={theme.colors.onSurfaceVariant} style={{ opacity: 0.5 }} />
                    <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>No Items Yet</Text>
                    <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                        {trade} has no pre-loaded assets here. Tap the '+' button to log an issue manually.
                    </Text>
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={filteredAssets}
                    keyExtractor={(item) => item.id}
                    initialNumToRender={5}
                    windowSize={5}
                    maxToRenderPerBatch={10}
                    removeClippedSubviews={true}
                    contentContainerStyle={styles.content}
                    ListEmptyComponent={
                        <Surface style={[styles.emptyState, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
                            <Text style={[Typography.h4, { textAlign: 'center', marginBottom: Spacing[2], color: theme.colors.onSurface }]}>
                                No Assets Yet
                            </Text>
                            <Text style={[Typography.bodyMd, { textAlign: 'center', color: theme.colors.onSurfaceVariant }]}>
                                Tap the "+ Add Asset" button below to start adding assets for inspection
                            </Text>
                        </Surface>
                    }
                    renderItem={({ item: asset }) => {
                        const inspection = inspections.find(i => i.asset_id === asset.id) || {
                            id: `inspection_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                            survey_id: surveyId,
                            asset_id: asset.id,
                            photos: [],
                        };
                        return (
                            <AssetInspectionCard
                                asset={asset}
                                inspection={inspection}
                                onUpdate={handleInspectionUpdate}
                                onCaptureGPS={captureGPS}
                            />
                        );
                    }}
                    ListFooterComponent={<View style={{ height: 100 }} />}
                />
            )}

            {/* FAB */}
            <FAB
                icon="plus"
                label="Add Asset"
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                color="#FFFFFF"
                onPress={handleAddAsset}
            />

            <Modal
                visible={isScannerVisible}
                animationType="slide"
                onRequestClose={() => setIsScannerVisible(false)}
            >
                <QRCodeScanner
                    onScan={handleBarcodeScanned}
                    onCancel={() => setIsScannerVisible(false)}
                />
            </Modal>

            {/* Upload Progress Modal */}
            <Modal
                visible={showUploadModal}
                transparent={true}
                animationType="fade"
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <Surface style={{ width: '100%', padding: 24, borderRadius: 12, alignItems: 'center' }} elevation={4}>
                        <Text style={[Typography.h4, { marginBottom: 16 }]}>Syncing Photos...</Text>
                        <Text style={[Typography.bodyMd, { marginBottom: 12, textAlign: 'center' }]}>
                            {uploadStatus.completed} of {uploadStatus.total} uploaded
                        </Text>
                        <ProgressBar 
                            progress={uploadStatus.total > 0 ? uploadStatus.completed / uploadStatus.total : 0} 
                            color={theme.colors.primary} 
                            style={{ width: '100%', height: 10, borderRadius: 5, marginBottom: 20 }} 
                        />
                        <Text style={[Typography.bodySm, { color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }]}>
                            Current: {uploadStatus.currentAsset}
                        </Text>
                        <Text style={[Typography.bodyXs, { marginTop: 20, color: '#FF5722', fontWeight: 'bold' }]}>
                            Please do not close the app
                        </Text>
                    </Surface>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: Spacing[4],
        paddingBottom: Spacing[4],
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    progressSection: {
        marginTop: Spacing[3],
    },
    headerActions: {
        flexDirection: 'row',
        marginTop: Spacing[3],
        justifyContent: 'flex-end',
    },
    content: {
        flexGrow: 1,
    },
    emptyState: {
        margin: Spacing[4],
        padding: Spacing[8],
        borderRadius: Radius.lg,
        alignItems: 'center',
        borderWidth: 1,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 80, // Moved up to clear Submit button
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginTop: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 15,
        textAlign: 'center',
        opacity: 0.8,
        lineHeight: 22,
    },
});
