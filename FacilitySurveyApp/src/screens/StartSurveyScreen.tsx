import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Keyboard, ActivityIndicator } from 'react-native';
import { Text, Button, Surface, TextInput, useTheme, Avatar, Menu, IconButton, Portal, Dialog, List, TouchableRipple, Chip } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { storage } from '../services/storage';
import * as hybridStorage from '../services/hybridStorage';
import { surveysApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function StartSurveyScreen() {
    const navigation = useNavigation<any>();
    const theme = useTheme();
    const route = useRoute<any>();
    const { user } = useAuth();
    const { initialSite } = route.params || {};

    // Form State
    const [siteName, setSiteName] = useState(initialSite?.name || '');
    const [siteId, setSiteId] = useState(initialSite?.id || '');
    const [locationFilter, setLocationFilter] = useState(''); // e.g. "Main Building - Roof"
    const [serviceLine, setServiceLine] = useState('');
    const [surveyorName, setSurveyorName] = useState('');
    const [gps, setGps] = useState<string>('Acquiring...');
    const [locationData, setLocationData] = useState<any>(null);

    // Dropdowns
    const [sites, setSites] = useState<any[]>([]);
    const [locations, setLocations] = useState<string[]>([]);
    const [serviceLines, setServiceLines] = useState<string[]>([]);

    // Menus
    const [siteMenuVisible, setSiteMenuVisible] = useState(false);
    const [locationMenuVisible, setLocationMenuVisible] = useState(false);
    const [serviceLineMenuVisible, setServiceLineMenuVisible] = useState(false);

    // Existing surveys lookup
    const [existingSurveys, setExistingSurveys] = useState<any[]>([]);
    const [loadingExistingSurveys, setLoadingExistingSurveys] = useState(false);
    const [claimingId, setClaimingId] = useState<string | null>(null);

    const canStart = siteName.length > 0 && serviceLine.length > 0;

    useEffect(() => {
        loadSites();
        (async () => {
            // Get GPS
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setGps('Permission Denied');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setGps(`${location.coords.latitude.toFixed(5)}, ${location.coords.longitude.toFixed(5)}`);
            setLocationData(location.coords);
        })();
    }, []);

    const loadSites = async () => {
        // Load sites from hybrid storage (which syncs/caches)
        const sitesList = await hybridStorage.getSites();

        // Also get asset counts for display (optional, but helpful)
        const assetsSites = await storage.getSitesWithAssetCounts();

        // Merge data: Site name from local `sites` table + count from `assets`
        const mergedSites = sitesList.map((site: any) => {
            // Try matching by ID first (more reliable), then Name
            const assetData = assetsSites.find(a => a.id === site.id || a.name === site.name);
            return {
                ...site,
                count: assetData ? assetData.count : 0,
                serviceLines: assetData ? assetData.serviceLines : []
            };
        });

        setSites(mergedSites);

        // Pre-select if initialSite passed
        if (initialSite) {
            const match = mergedSites.find((s: any) => s.name === initialSite.name);
            if (match) {
                handleSiteSelect(match);
            } else {
                // Fallback if not found in list but passed
                setSiteName(initialSite.name);
                setSiteId(initialSite.id);
            }
        } else {
            // Check for last selected site preference
            const lastSiteId = await storage.getLastSelectedSite();
            if (lastSiteId) {
                const match = mergedSites.find((s: any) => s.id === lastSiteId);
                if (match) {
                    handleSiteSelect(match);
                }
            }
        }
    };

    // Optimized Menu Openers (Fixes "immediately closes" bug)
    const openSiteMenu = () => {
        Keyboard.dismiss();
        setTimeout(() => setSiteMenuVisible(true), 150);
    };

    const openLocationMenu = () => {
        Keyboard.dismiss();
        setTimeout(() => setLocationMenuVisible(true), 150);
    };

    const openServiceLineMenu = () => {
        Keyboard.dismiss();
        setTimeout(() => setServiceLineMenuVisible(true), 150);
    };

    const handleSiteSelect = (site: any) => {
        // ... (rest same, keeping optimization)
        setSiteName(site.name);
        setSiteId(site.id);
        setSiteMenuVisible(false);

        // ...
        setLocationFilter('');
        setServiceLine('');
        setLocations([]);
        setServiceLines([]);

        setTimeout(async () => {
            // Save as preference
            await storage.saveLastSelectedSite(site.id);

            // Load Locations for this site
            const siteLocations = await storage.getLocationsBySite(site.id);
            setLocations(siteLocations);

            // Load Service Lines (All for site initially)
            const siteServiceLines = await storage.getServiceLinesBySiteAndLocation(site.id, '');
            setServiceLines(siteServiceLines);
        }, 0);
    };

    const handleLocationSelect = async (loc: string) => {
        setLocationFilter(loc);
        setLocationMenuVisible(false);
        setServiceLine(''); // Reset service line as it might not be valid for new location

        if (siteId) {
            const lines = await storage.getServiceLinesBySiteAndLocation(siteId, loc);
            setServiceLines(lines);
        }
    };

    // Load existing surveys whenever site + service line are both selected
    useEffect(() => {
        if (siteId && serviceLine) {
            loadExistingSurveys();
        } else {
            setExistingSurveys([]);
        }
    }, [siteId, serviceLine]);

    const loadExistingSurveys = async () => {
        setLoadingExistingSurveys(true);
        try {
            // 1. Check local storage first (works offline)
            const localSurveys = await storage.getSurveysBySiteAndTrade(siteId, serviceLine);

            // 2. If online, also check backend for admin-created surveys not yet synced
            if (hybridStorage.syncService.isOnline) {
                try {
                    const backendSurveys = await surveysApi.getAll();
                    const matching = (backendSurveys || []).filter((s: any) =>
                        s.site_id === siteId && s.trade === serviceLine
                    );
                    // Merge: deduplicate by id (prefer backend data for known IDs)
                    const merged: any[] = [...matching];
                    localSurveys.forEach((ls: any) => {
                        const localId = ls.id;
                        const serverIdMatch = ls.server_id;
                        if (!merged.find((bs: any) => bs.id === localId || bs.id === serverIdMatch)) {
                            merged.push(ls);
                        }
                    });
                    setExistingSurveys(merged);
                } catch {
                    setExistingSurveys(localSurveys);
                }
            } else {
                setExistingSurveys(localSurveys);
            }
        } catch (error) {
            console.error('Error loading existing surveys:', error);
            setExistingSurveys([]);
        } finally {
            setLoadingExistingSurveys(false);
        }
    };

    // Start an existing (admin-created or in-progress) survey
    const handleStartExistingSurvey = async (survey: any) => {
        setClaimingId(survey.id);
        try {
            const isUnassigned = !survey.surveyor_id;

            // If unassigned and online, claim it (assign self as surveyor + set in_progress)
            if (isUnassigned && hybridStorage.syncService.isOnline) {
                try {
                    await surveysApi.update(survey.id, {
                        status: 'in_progress',
                        surveyorId: user?.id
                    });
                } catch (e) {
                    console.warn('Could not claim survey on backend, continuing offline:', e);
                }
            }

            // Update local status and surveyor_id
            await storage.claimSurvey(survey.id, user?.id || '', 'in_progress');

            navigation.navigate('AssetInspection', {
                surveyId: survey.id,
                siteId: survey.site_id || siteId,
                siteName: survey.site_name || siteName,
                trade: survey.trade || serviceLine,
                location: locationFilter
            });
        } catch (error) {
            console.error('Error starting existing survey:', error);
            Alert.alert('Error', 'Failed to start survey. Please try again.');
        } finally {
            setClaimingId(null);
        }
    };

    // Generate ID helper
    const generateId = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    const createAndStartNewSurvey = async () => {
        try {
            const surveyId = generateId();
            const newSurvey = {
                id: surveyId,
                site_id: siteId,
                site_name: siteName,
                trade: serviceLine,
                status: 'in_progress',
                surveyor_id: user?.id || undefined,
                surveyor_name: surveyorName || user?.fullName || 'Surveyor',
                location: locationFilter || '',
                gps_lat: locationData?.latitude || null,
                gps_lng: locationData?.longitude || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                synced: 0
            };

            // Save survey locally and trigger background sync
            await hybridStorage.saveSurvey(newSurvey);

            navigation.navigate('AssetInspection', {
                surveyId: surveyId,
                siteId: siteId,
                siteName: siteName,
                trade: serviceLine,
                location: locationFilter
            });
        } catch (error) {
            console.error('Error starting survey:', error);
            Alert.alert('Error', 'Failed to start survey');
        }
    };

    const handleStartInspection = async () => {
        if (!siteId || !serviceLine) {
            Alert.alert('Error', 'Please select a site and service line');
            return;
        }

        // If existing surveys found, confirm before creating a new (possibly duplicate) survey
        if (existingSurveys.length > 0) {
            Alert.alert(
                'Existing Surveys Found',
                `There are ${existingSurveys.length} existing survey(s) for this site and service line. Use "Start" or "Resume" on one of them above, or create a new one.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Create New Anyway', onPress: createAndStartNewSurvey }
                ]
            );
            return;
        }

        await createAndStartNewSurvey();
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="always"
            >
                {/* Header */}
                <Surface style={[styles.screenHeader, { backgroundColor: theme.colors.surface }]} elevation={1}>
                    <IconButton
                        icon="arrow-left"
                        size={24}
                        onPress={() => navigation.goBack()}
                        iconColor={theme.colors.primary}
                    />
                    <Text style={[styles.title, { color: theme.colors.primary }]}>
                        New Survey
                    </Text>
                </Surface>

                {/* Form */}
                <Surface style={[styles.formCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
                    {/* Site Selection */}
                    <View style={styles.fieldContainer}>
                        <Text style={[styles.label, { color: theme.colors.onSurface }]}>Site / Location *</Text>
                        <Button
                            mode="outlined"
                            onPress={openSiteMenu}
                            style={styles.dropdown}
                            contentStyle={{ justifyContent: 'flex-start' }}
                        >
                            {siteName || 'Select Site'}
                        </Button>

                        <Portal>
                            <Dialog visible={siteMenuVisible} onDismiss={() => setSiteMenuVisible(false)} style={{ maxHeight: '80%' }}>
                                <Dialog.Title>Select Site</Dialog.Title>
                                <Dialog.ScrollArea>
                                    <ScrollView contentContainerStyle={{ paddingHorizontal: 0 }}>
                                        {sites.map((site) => (
                                            <TouchableRipple key={site.id} onPress={() => handleSiteSelect(site)}>
                                                <List.Item
                                                    title={site.name}
                                                    description={site.count > 0 ? `${site.count} assets` : 'No assets'}
                                                    left={props => <List.Icon {...props} icon="domain" />}
                                                />
                                            </TouchableRipple>
                                        ))}
                                        {sites.length === 0 && (
                                            <List.Item title="No sites available" description="Add one in Site Management" />
                                        )}
                                    </ScrollView>
                                </Dialog.ScrollArea>
                                <Dialog.Actions>
                                    <Button onPress={() => setSiteMenuVisible(false)}>Cancel</Button>
                                </Dialog.Actions>
                            </Dialog>
                        </Portal>
                    </View>

                    {/* Location / Building Filter */}
                    {locations.length > 0 && (
                        <View style={styles.fieldContainer}>
                            <Text style={[styles.label, { color: theme.colors.onSurface }]}>Location / Building</Text>
                            <Button
                                mode="outlined"
                                onPress={openLocationMenu}
                                style={styles.dropdown}
                                contentStyle={{ justifyContent: 'flex-start' }}
                                disabled={!siteName}
                            >
                                {locationFilter || 'All Locations'}
                            </Button>

                            <Portal>
                                <Dialog visible={locationMenuVisible} onDismiss={() => setLocationMenuVisible(false)} style={{ maxHeight: '80%' }}>
                                    <Dialog.Title>Select Location</Dialog.Title>
                                    <Dialog.ScrollArea>
                                        <ScrollView>
                                            <TouchableRipple onPress={() => handleLocationSelect('')}>
                                                <List.Item title="All Locations" left={props => <List.Icon {...props} icon="map-marker-multiple" />} />
                                            </TouchableRipple>
                                            {locations.map((loc, index) => (
                                                <TouchableRipple key={index} onPress={() => handleLocationSelect(loc)}>
                                                    <List.Item title={loc} left={props => <List.Icon {...props} icon="map-marker" />} />
                                                </TouchableRipple>
                                            ))}
                                        </ScrollView>
                                    </Dialog.ScrollArea>
                                    <Dialog.Actions>
                                        <Button onPress={() => setLocationMenuVisible(false)}>Cancel</Button>
                                    </Dialog.Actions>
                                </Dialog>
                            </Portal>
                        </View>
                    )}

                    {/* Service Line Selection */}
                    <View style={styles.fieldContainer}>
                        <Text style={[styles.label, { color: theme.colors.onSurface }]}>Service Line *</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {/* If service lines exist in dropdown */}
                            {serviceLines.length > 0 ? (
                                <>
                                    <Button
                                        mode="outlined"
                                        onPress={openServiceLineMenu}
                                        style={[styles.dropdown, { flex: 1 }]}
                                        contentStyle={{ justifyContent: 'flex-start' }}
                                        disabled={!siteName}
                                    >
                                        {serviceLine || 'Select Service Line'}
                                    </Button>

                                    <Portal>
                                        <Dialog visible={serviceLineMenuVisible} onDismiss={() => setServiceLineMenuVisible(false)} style={{ maxHeight: '80%' }}>
                                            <Dialog.Title>Select Service Line</Dialog.Title>
                                            <Dialog.ScrollArea>
                                                <ScrollView>
                                                    {serviceLines.map((line) => (
                                                        <TouchableRipple key={line} onPress={() => {
                                                            setServiceLine(line);
                                                            setServiceLineMenuVisible(false);
                                                        }}>
                                                            <List.Item title={line} left={props => <List.Icon {...props} icon="tools" />} />
                                                        </TouchableRipple>
                                                    ))}
                                                    <TouchableRipple onPress={() => {
                                                        setServiceLineMenuVisible(false);
                                                        setServiceLines([]); // Switch to manual
                                                    }}>
                                                        <List.Item title="Enter manually..." left={props => <List.Icon {...props} icon="keyboard" />} />
                                                    </TouchableRipple>
                                                </ScrollView>
                                            </Dialog.ScrollArea>
                                            <Dialog.Actions>
                                                <Button onPress={() => setServiceLineMenuVisible(false)}>Cancel</Button>
                                            </Dialog.Actions>
                                        </Dialog>
                                    </Portal>
                                </>
                            ) : (
                                <TextInput
                                    mode="outlined"
                                    value={serviceLine}
                                    onChangeText={setServiceLine}
                                    placeholder="Enter Service Line (e.g. HVAC)"
                                    style={{ flex: 1, backgroundColor: 'transparent' }}
                                />
                            )}
                        </View>
                    </View>

                    {/* Surveyor Name */}
                    <View style={styles.fieldContainer}>
                        <Text style={[styles.label, { color: theme.colors.onSurface }]}>Surveyor Name</Text>
                        <TextInput
                            mode="outlined"
                            value={surveyorName}
                            onChangeText={setSurveyorName}
                            placeholder="Enter surveyor name"
                            style={styles.input}
                        />
                    </View>

                    {/* GPS Location */}
                    <View style={styles.fieldContainer}>
                        <Text style={[styles.label, { color: theme.colors.onSurface }]}>GPS Location</Text>
                        <View style={[styles.gpsBox, { backgroundColor: theme.colors.surfaceVariant }]}>
                            <Avatar.Icon size={32} icon="map-marker" style={{ backgroundColor: 'transparent' }} color={theme.colors.primary} />
                            <Text style={{ color: theme.colors.onSurfaceVariant, marginLeft: 12 }}>{gps}</Text>
                        </View>
                    </View>
                </Surface>

                {/* Available Surveys Section — shown when site + service line selected */}
                {siteId && serviceLine ? (
                    <Surface style={[styles.surveysCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
                        <Text style={[styles.sectionLabel, { color: theme.colors.primary }]}>
                            Available Surveys
                        </Text>

                        {loadingExistingSurveys && (
                            <ActivityIndicator size="small" style={{ margin: 12 }} color={theme.colors.primary} />
                        )}

                        {!loadingExistingSurveys && existingSurveys.length === 0 && (
                            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13, paddingVertical: 8 }}>
                                No existing surveys for this site and trade. Tap "Start Inspection" to create one.
                            </Text>
                        )}

                        {!loadingExistingSurveys && existingSurveys.map((survey: any) => {
                            const isUnassigned = !survey.surveyor_id;
                            const isOwn = survey.surveyor_id === user?.id;
                            const isSubmitted = survey.status === 'submitted' || survey.status === 'completed';

                            const statusColors: Record<string, string> = {
                                draft: '#78909C',
                                in_progress: theme.colors.primary,
                                submitted: '#43A047',
                                completed: '#1E88E5',
                                under_review: '#FB8C00',
                            };
                            const statusColor = statusColors[survey.status] || '#78909C';

                            return (
                                <Surface key={survey.id} style={styles.surveyRow} elevation={0}>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                                            <Text style={{ fontWeight: '700', fontSize: 13 }}>
                                                {isUnassigned ? 'Admin Assigned' : isOwn ? 'Your Survey' : 'Survey'}
                                            </Text>
                                            <View style={[styles.badge, { backgroundColor: statusColor }]}>
                                                <Text style={styles.badgeText}>
                                                    {(survey.status || 'draft').replace('_', ' ').toUpperCase()}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>
                                            Created: {new Date(survey.created_at).toLocaleDateString()}
                                            {survey.surveyor_name ? `  •  ${survey.surveyor_name}` : ''}
                                        </Text>
                                    </View>
                                    <Button
                                        mode="contained-tonal"
                                        compact
                                        onPress={() => handleStartExistingSurvey(survey)}
                                        loading={claimingId === survey.id}
                                        disabled={!!claimingId || isSubmitted}
                                        style={{ marginLeft: 8 }}
                                    >
                                        {isSubmitted ? 'Done' :
                                         survey.status === 'in_progress' ? 'Resume' : 'Start'}
                                    </Button>
                                </Surface>
                            );
                        })}
                    </Surface>
                ) : null}

                {/* Info Box */}
                {siteName && serviceLine && (
                    <Surface style={[styles.infoBox, { backgroundColor: theme.colors.secondaryContainer }]} elevation={1}>
                        <Avatar.Icon size={40} icon="information" style={{ backgroundColor: theme.colors.secondary }} color={theme.colors.onSecondary} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={{ color: theme.colors.onSecondaryContainer, fontWeight: 'bold', marginBottom: 4 }}>
                                {serviceLines.includes(serviceLine) ? 'Assets will be pre-loaded' : 'Manual Asset Entry'}
                            </Text>
                            <Text style={{ color: theme.colors.onSecondaryContainer, fontSize: 12 }}>
                                {serviceLines.includes(serviceLine)
                                    ? `Assets for ${siteName} (${locationFilter || 'All'}) - ${serviceLine} will be loaded.`
                                    : `No pre-loaded assets. You will add assets manually.`
                                }
                            </Text>
                        </View>
                    </Surface>
                )}

                {/* Start Button */}
                <Button
                    mode="contained"
                    onPress={handleStartInspection}
                    disabled={!canStart}
                    style={styles.startButton}
                    contentStyle={{ height: 56 }}
                    labelStyle={{ fontSize: 18, fontWeight: 'bold' }}
                >
                    {existingSurveys.length > 0 ? 'Create New Survey' : 'Start Inspection'}
                </Button>
            </ScrollView>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    screenHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 16,
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    formCard: {
        borderRadius: 20,
        padding: 24,
        marginBottom: 16,
    },
    fieldContainer: {
        marginBottom: 24,
    },
    label: {
        fontSize: 13,
        fontWeight: '800',
        marginBottom: 8,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        opacity: 0.8,
    },
    dropdown: {
        borderRadius: 12,
        borderWidth: 1.5,
    },
    input: {
        backgroundColor: 'transparent',
    },
    gpsBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E7E5E4',
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
    },
    startButton: {
        borderRadius: 14,
        marginTop: 8,
    },
    surveysCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 12,
    },
    surveyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        marginBottom: 6,
        backgroundColor: 'rgba(0,0,0,0.03)',
    },
    badge: {
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    badgeText: {
        color: 'white',
        fontSize: 9,
        fontWeight: '700',
    },
});
