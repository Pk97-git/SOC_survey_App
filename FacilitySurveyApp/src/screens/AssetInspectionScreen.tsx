import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Text, FAB, useTheme, ProgressBar, Button, Surface, IconButton } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { storage } from '../services/storage';
import * as hybridStorage from '../services/hybridStorage';
import AssetInspectionCard from '../components/AssetInspectionCard';
import { generateAndShareExcel } from '../services/excelService';

export default function AssetInspectionScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const theme = useTheme();

    const { surveyId, siteId, siteName, trade, preloadedAssets = [], assetOption } = route.params;

    const [assets, setAssets] = useState<any[]>(preloadedAssets);
    const [inspections, setInspections] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadInspections();
        if (assets.length === 0 && (siteName || siteId) && trade) {
            loadAssets();
        }
    }, [surveyId]); // Reload if surveyId changes, though unlikely in this screen

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
                const filtered = siteAssets.filter((a: any) =>
                    (a.serviceLine === trade || a.service_line === trade || a.serviceLine === undefined)
                );

                // Deduplicate assets by ID
                const uniqueAssets = Array.from(new Map(filtered.map((item: any) => [item.id, item])).values());
                setAssets(uniqueAssets);
            } else if (siteName) {
                const assets = await storage.getAssetsBySiteAndServiceLine(siteName, trade);
                // Deduplicate assets
                const uniqueAssets = Array.from(new Map(assets.map((item: any) => [item.id, item])).values());
                setAssets(uniqueAssets);
            }
        } catch (error) {
            console.error('Error loading assets:', error);
            Alert.alert('Error', 'Failed to load assets for this survey');
        } finally {
            setLoadingAssets(false);
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

            // Validate GPS range
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
            // Update local state first for responsiveness
            setInspections(prev => {
                const existing = prev.find(i => i.asset_id === assetId);
                if (existing) {
                    return prev.map(i => i.asset_id === assetId ? updatedInspection : i);
                } else {
                    return [...prev, updatedInspection];
                }
            });

            // Auto-save to database (backend/hybrid)
            await hybridStorage.saveAssetInspection(updatedInspection);
            await hybridStorage.updateSurvey(surveyId, { status: 'in_progress' });
        } catch (error) {
            console.error('Error saving inspection:', error);
        }
    }, [surveyId]);

    const handleAddAsset = () => {
        navigation.navigate('AssetForm', {
            onSave: async (newAsset: any) => {
                // Determine siteId/siteName to use
                const assetWithSite = {
                    ...newAsset,
                    site_name: siteName,
                    site_id: siteId || route.params.siteId
                };

                try {
                    const savedAsset = await hybridStorage.saveAsset(assetWithSite);
                    setAssets(prev => [...prev, savedAsset]);
                    navigation.goBack();
                } catch (error) {
                    console.error("Error saving asset:", error);
                    Alert.alert("Error", "Failed to save asset");
                }
            }
        });
    };

    const handleSaveAndExit = async () => {
        Alert.alert(
            'Save & Exit',
            'Your progress has been auto-saved. You can resume this survey later.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Exit',
                    onPress: () => navigation.navigate('Home')
                }
            ]
        );
    };

    const handleSubmitSurvey = async () => {
        // Validate each asset and collect missing fields
        const validationResults = assets.map(asset => {
            const inspection = inspections.find(i => i.asset_id === asset.id);
            const missing: string[] = [];

            if (!inspection) {
                missing.push('No inspection data');
            } else {
                if (!inspection.condition_rating) missing.push('Condition Rating');
                if (!inspection.overall_condition) missing.push('Overall Condition');
            }

            return {
                asset,
                inspection,
                missing,
                isComplete: missing.length === 0
            };
        });

        const incompleteAssets = validationResults.filter(r => !r.isComplete);

        if (incompleteAssets.length > 0) {
            // Build detailed message
            const assetList = incompleteAssets
                .slice(0, 5) // Show max 5 assets
                .map(r => `• ${r.asset.name || 'Unnamed Asset'}: ${r.missing.join(', ')}`)
                .join('\n');

            const moreText = incompleteAssets.length > 5
                ? `\n...and ${incompleteAssets.length - 5} more`
                : '';

            Alert.alert(
                '⚠️ Incomplete Inspections',
                `${incompleteAssets.length} of ${assets.length} asset(s) are incomplete:\n\n${assetList}${moreText}\n\nSubmit anyway?`,
                [
                    { text: 'Review', style: 'cancel' },
                    {
                        text: 'Submit Anyway',
                        style: 'destructive',
                        onPress: () => performSubmit()
                    }
                ]
            );
        } else {
            // All complete - show summary confirmation
            const totalPhotos = inspections.reduce((sum, i) => sum + (i.photos?.length || 0), 0);

            Alert.alert(
                '✓ Ready to Submit',
                `Survey Summary:\n\n` +
                `• ${assets.length} asset${assets.length > 1 ? 's' : ''} inspected\n` +
                `• ${totalPhotos} photo${totalPhotos !== 1 ? 's' : ''} captured\n` +
                `• All required fields completed\n\n` +
                `Generate Excel report?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Submit', onPress: () => performSubmit() }
                ]
            );
        }
    };

    const performSubmit = async () => {
        setSubmitting(true);
        try {
            // Update survey status
            await hybridStorage.updateSurvey(surveyId, { status: 'submitted' });

            // Generate Excel
            const survey = {
                id: surveyId,
                site_name: siteName,
                trade,
                created_at: new Date().toISOString()
            };

            await generateAndShareExcel(survey, inspections, assets);

            Alert.alert(
                'Survey Submitted',
                'Excel report has been generated and shared successfully!',
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.navigate('Home')
                    }
                ]
            );
        } catch (error) {
            console.error('Error submitting survey:', error);
            Alert.alert('Error', 'Failed to submit survey');
        } finally {
            setSubmitting(false);
        }
    };

    const rawCompletedCount = inspections.filter(i => i.condition_rating && i.overall_condition).length;
    // Clamp progress to 0-1 range to prevent JSI errors if count > assets
    const safeProgress = assets.length > 0
        ? Math.min(1, Math.max(0, rawCompletedCount / assets.length))
        : 0;

    const completedCount = Math.min(rawCompletedCount, assets.length);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <Surface style={styles.header} elevation={2}>
                <View style={styles.headerTop}>
                    <View style={{ flex: 1 }}>
                        <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>
                            {siteName}
                        </Text>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                            {trade} {route.params.location ? `• ${route.params.location}` : ''} • {new Date().toLocaleDateString()}
                        </Text>
                    </View>
                    <IconButton
                        icon="close"
                        onPress={handleSaveAndExit}
                    />
                </View>

                <View style={styles.progressSection}>
                    <Text variant="bodySmall" style={{ marginBottom: 4 }}>
                        Progress: {completedCount}/{assets.length} assets inspected ({Math.round(safeProgress * 100)}%)
                    </Text>
                </View>

                <View style={styles.headerActions}>
                    <Button
                        mode="outlined"
                        icon="content-save"
                        onPress={handleSaveAndExit}
                        compact
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
                        style={{ marginLeft: 8 }}
                    >
                        Submit Survey
                    </Button>
                </View>
            </Surface>

            {/* Asset List */}
            <ScrollView style={styles.content}>
                {assets.length === 0 ? (
                    <Surface style={styles.emptyState}>
                        <Text variant="titleMedium" style={{ textAlign: 'center', marginBottom: 8 }}>
                            No Assets Yet
                        </Text>
                        <Text variant="bodyMedium" style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
                            Tap the "+ Add Asset" button below to start adding assets for inspection
                        </Text>
                    </Surface>
                ) : (
                    assets.map((asset) => {
                        const inspection = inspections.find(i => i.asset_id === asset.id) || {
                            id: `inspection_${asset.id}_${Date.now()}`,
                            survey_id: surveyId,
                            asset_id: asset.id,
                            photos: [],
                        };

                        return (
                            <AssetInspectionCard
                                key={asset.id}
                                asset={asset}
                                inspection={inspection}
                                onUpdate={(updated) => handleInspectionUpdate(asset.id, updated)}
                                onCaptureGPS={captureGPS}
                            />
                        );
                    })
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* FAB */}
            <FAB
                icon="plus"
                label="Add Asset"
                style={styles.fab}
                onPress={handleAddAsset}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 16,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    progressSection: {
        marginTop: 12,
    },
    headerActions: {
        flexDirection: 'row',
        marginTop: 12,
        justifyContent: 'flex-end',
    },
    content: {
        flex: 1,
    },
    emptyState: {
        margin: 16,
        padding: 32,
        borderRadius: 12,
        alignItems: 'center',
    },
    fab: {
        position: 'absolute',
        right: 16,
        bottom: 16,
    },
});
