import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Surface, TextInput, useTheme, Avatar, Menu, IconButton } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { storage } from '../services/storage';
import * as hybridStorage from '../services/hybridStorage';

export default function StartSurveyScreen() {
    const navigation = useNavigation<any>();
    const theme = useTheme();
    const route = useRoute<any>();
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
            const assetData = assetsSites.find(a => a.name === site.name);
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

    const handleSiteSelect = async (site: any) => {
        setSiteName(site.name);
        setSiteId(site.id);
        setSiteMenuVisible(false);

        // Save as preference
        await storage.saveLastSelectedSite(site.id);

        // Reset sub-selections
        setLocationFilter('');
        setServiceLine('');
        setLocations([]);
        setServiceLines([]);

        // Load Locations for this site
        const siteLocations = await storage.getLocationsBySite(site.id);
        setLocations(siteLocations);

        // Load Service Lines (All for site initially)
        const siteServiceLines = await storage.getServiceLinesBySiteAndLocation(site.id, '');
        setServiceLines(siteServiceLines);
    };

    const handleLocationSelect = async (loc: string) => {
        setLocationFilter(loc);
        setLocationMenuVisible(false);
        setServiceLine('');

        // Filter service lines by location
        const filteredServiceLines = await storage.getServiceLinesBySiteAndLocation(siteId, loc);
        setServiceLines(filteredServiceLines);
    };

    const handleStartInspection = async () => {
        if (!canStart) {
            Alert.alert('Missing Information', 'Please select site and service line');
            return;
        }

        // Try to load assets filtered by site + location + serviceLine
        // We first get assets by site/serviceLine, then filter by location in memory if needed
        // Or update storage to have a specific query. 
        // For simplicity: getAssetsBySiteAndServiceLine -> filter

        const assets = await storage.getAssetsBySiteAndServiceLine(siteId, serviceLine); // Currently uses siteId as raw match
        // Wait, storage.ts implementation of getAssetsBySiteAndServiceLine uses site_id.
        // And we need to filter by locationFilter.

        const filteredAssets = locationFilter
            ? assets.filter((a: any) => {
                const loc = a.location;
                const bldg = a.building;
                const combined = bldg && loc ? `${bldg} - ${loc}` : (bldg || loc || '');
                return combined === locationFilter;
            })
            : assets;

        const hasPreloadedAssets = filteredAssets.length > 0;

        // Create survey record
        const surveyData = {
            site_id: siteId,
            site_name: siteName,
            trade: serviceLine,
            location: locationFilter, // Save selected location/building context
            surveyor_name: surveyorName,
            status: 'in_progress',
            gps_lat: locationData?.latitude,
            gps_lng: locationData?.longitude,
            created_at: new Date().toISOString(),
        };

        try {
            // Use hybridStorage to save (calls Backend if enabled)
            const savedSurvey = await hybridStorage.saveSurvey(surveyData);

            // If backend, savedSurvey.id is UUID.
            const surveyId = savedSurvey.id || `survey_${Date.now()}`;

            navigation.navigate('AssetInspection', {
                surveyId,
                siteId, // Pass siteId for asset creation
                siteName,
                trade: serviceLine,
                preloadedAssets: hasPreloadedAssets ? filteredAssets : [],
                assetOption: hasPreloadedAssets ? 'preloaded' : 'manual'
            });
        } catch (error) {
            console.error('Error creating survey:', error);
            Alert.alert('Error', 'Failed to create survey. Check connectivity.');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
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
                        <Menu
                            visible={siteMenuVisible}
                            onDismiss={() => setSiteMenuVisible(false)}
                            anchor={
                                <Button
                                    mode="outlined"
                                    onPress={() => setSiteMenuVisible(true)}
                                    style={styles.dropdown}
                                    contentStyle={{ justifyContent: 'flex-start' }}
                                >
                                    {siteName || 'Select Site'}
                                </Button>
                            }
                        >
                            {sites.map((site) => (
                                <Menu.Item
                                    key={site.id}
                                    onPress={() => handleSiteSelect(site)}
                                    title={`${site.name} ${site.count > 0 ? `(${site.count} assets)` : '(No assets)'}`}
                                />
                            ))}
                            {sites.length === 0 && (
                                <Menu.Item
                                    onPress={() => {
                                        setSiteMenuVisible(false);
                                        Alert.alert('No Sites', 'Please add a site in Asset Register -> Manage Sites.');
                                    }}
                                    title="No sites available. Add one first."
                                />
                            )}
                        </Menu>
                    </View>

                    {/* Location / Building Filter */}
                    {locations.length > 0 && (
                        <View style={styles.fieldContainer}>
                            <Text style={[styles.label, { color: theme.colors.onSurface }]}>Location / Building</Text>
                            <Menu
                                visible={locationMenuVisible}
                                onDismiss={() => setLocationMenuVisible(false)}
                                anchor={
                                    <Button
                                        mode="outlined"
                                        onPress={() => setLocationMenuVisible(true)}
                                        style={styles.dropdown}
                                        contentStyle={{ justifyContent: 'flex-start' }}
                                        disabled={!siteName}
                                    >
                                        {locationFilter || 'All Locations'}
                                    </Button>
                                }
                            >
                                <Menu.Item
                                    onPress={() => handleLocationSelect('')}
                                    title="All Locations"
                                />
                                {locations.map((loc, index) => (
                                    <Menu.Item
                                        key={index}
                                        onPress={() => handleLocationSelect(loc)}
                                        title={loc}
                                    />
                                ))}
                            </Menu>
                        </View>
                    )}

                    {/* Service Line Selection */}
                    <View style={styles.fieldContainer}>
                        <Text style={[styles.label, { color: theme.colors.onSurface }]}>Service Line *</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {/* If service lines exist in dropdown */}
                            {serviceLines.length > 0 ? (
                                <Menu
                                    visible={serviceLineMenuVisible}
                                    onDismiss={() => setServiceLineMenuVisible(false)}
                                    anchor={
                                        <Button
                                            mode="outlined"
                                            onPress={() => setServiceLineMenuVisible(true)}
                                            style={[styles.dropdown, { flex: 1 }]}
                                            contentStyle={{ justifyContent: 'flex-start' }}
                                            disabled={!siteName}
                                        >
                                            {serviceLine || 'Select Service Line'}
                                        </Button>
                                    }
                                >
                                    {serviceLines.map((line) => (
                                        <Menu.Item
                                            key={line}
                                            onPress={() => {
                                                setServiceLine(line);
                                                setServiceLineMenuVisible(false);
                                            }}
                                            title={line}
                                        />
                                    ))}
                                    <Menu.Item
                                        onPress={() => {
                                            setServiceLineMenuVisible(false);
                                            setServiceLines([]); // Switch to manual
                                        }}
                                        title="Enter manually..."
                                    />
                                </Menu>
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
                    Start Inspection
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
});
