import React, { useState, useEffect } from 'react';
import MapPicker from '../components/MapPicker';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../constants/design';
import { View, StyleSheet, FlatList, Alert, Platform } from 'react-native';
import { Text, FAB, Surface, useTheme, IconButton, TextInput, Portal, Dialog, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { sitesApi } from '../services/api';
import { syncService } from '../services/syncService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HelpIcon } from '../components/HelpIcon';
import { HELP_TEXT } from '../constants/helpText';

export interface SiteRecord {
    id: string;
    name: string;
    location?: string;
    client?: string;
    created_at: string;
}

export default function SiteManagementScreen() {
    const theme = useTheme();
    const navigation = useNavigation<any>();
    const { user } = useAuth();
    const role = user?.role || 'surveyor';

    const [sites, setSites] = useState<SiteRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [downloadingSiteId, setDownloadingSiteId] = useState<string | null>(null);

    // Dialog State
    const [visible, setVisible] = useState(false);
    const [editingSite, setEditingSite] = useState<SiteRecord | null>(null);
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [client, setClient] = useState('');
    const [loadingLocation, setLoadingLocation] = useState(false);

    // Map State
    const [mapVisible, setMapVisible] = useState(false);
    const [initialMapLocation, setInitialMapLocation] = useState<{ latitude: number, longitude: number } | undefined>(undefined);

    useEffect(() => {
        loadSites();
    }, []);

    const loadSites = async () => {
        setLoading(true);
        try {
            const data = await sitesApi.getAll();
            setSites(data);
        } catch (error: any) {
            console.error('Error loading sites:', error);
            if (error.response?.status !== 401) {
                Alert.alert("Error", "Failed to load sites from server.");
            }
        } finally {
            setLoading(false);
        }
    };

    const parseLocation = (locStr: string) => {
        if (!locStr) return undefined;
        const parts = locStr.split(',').map(p => parseFloat(p.trim()));
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            return { latitude: parts[0], longitude: parts[1] };
        }
        return undefined;
    };

    const handleGetLocation = async () => {
        setLoadingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission denied', 'Allow location access to get current position');
                return;
            }

            const loc = await Location.getCurrentPositionAsync({});
            const locStr = `${loc.coords.latitude}, ${loc.coords.longitude}`;
            setLocation(locStr);

            // Reverse geocode to get a better description if possible
            const [address] = await Location.reverseGeocodeAsync({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude
            });

            if (address) {
                const addrStr = [address.name, address.street, address.district, address.city].filter(Boolean).join(', ');
                if (addrStr) {
                    setLocation(addrStr);
                    return;
                }
            }
            setLocation(locStr);
        } catch (error) {
            console.error('Error getting location:', error);
            Alert.alert('Error', 'Failed to get current location');
        } finally {
            setLoadingLocation(false);
        }
    };

    const handleMapLocationSelected = (coords: { latitude: number, longitude: number }, address?: string) => {
        const locStr = address ? address : `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
        setLocation(locStr);
        setMapVisible(false);
    };

    const showDialog = (site?: SiteRecord) => {
        if (site) {
            setEditingSite(site);
            setName(site.name);
            setLocation(site.location || '');
            setClient(site.client || '');
            setInitialMapLocation(parseLocation(site.location || ''));
        } else {
            setEditingSite(null);
            setName('');
            setLocation('');
            setClient('');
            setInitialMapLocation(undefined);
        }
        setVisible(true);
    };

    const hideDialog = () => {
        setVisible(false);
        setMapVisible(false);
    };
    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Site name is required');
            return;
        }

        try {
            const siteData = {
                name: name.trim(),
                location: location.trim(),
                client: client.trim(),
            };

            if (editingSite) {
                await sitesApi.update(editingSite.id, siteData);
            } else {
                await sitesApi.create(siteData);
            }

            hideDialog();
            loadSites();
        } catch (error) {
            console.error('Error saving site:', error);
            Alert.alert('Error', 'Failed to save site');
        }
    };

    const handleDelete = (site: SiteRecord) => {
        // Step 1: Warn about consequences
        Alert.alert(
            'Delete Site',
            `Are you sure you want to delete "${site.name}"?\n\nWARNING: This will permanently delete ALL associated Surveys, Inspections, and Assets for this site. This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Continue',
                    style: 'destructive',
                    onPress: () => {
                        // Step 2: Final confirmation with site name
                        Alert.alert(
                            'Final Confirmation',
                            `You are about to permanently delete:\n\n  "${site.name}"\n\nAll surveys and assets will be lost forever.`,
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Delete Permanently',
                                    style: 'destructive',
                                    onPress: async () => {
                                        try {
                                            await sitesApi.delete(site.id);
                                            loadSites();
                                        } catch (error) {
                                            Alert.alert('Error', 'Failed to delete site');
                                        }
                                    }
                                }
                            ]
                        );
                    }
                }
            ]
        );
    };

    const handleDownloadSite = async (site: SiteRecord) => {
        try {
            setDownloadingSiteId(site.id);
            await syncService.downloadSiteData(site.id);
            Alert.alert('Success', `Data for "${site.name}" has been successfully downloaded for offline use.`);
        } catch (error: any) {
            console.error('Download error:', error);
            Alert.alert('Download Failed', error.message || 'Failed to download site data.');
        } finally {
            setDownloadingSiteId(null);
        }
    };

    const canGoBack = navigation.canGoBack();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                {canGoBack ? (
                    <View style={styles.screenHeader}>
                        <IconButton
                            icon="arrow-left"
                            size={24}
                            onPress={() => navigation.goBack()}
                            iconColor={theme.colors.onBackground}
                            style={{ marginLeft: -8 }}
                        />
                        <Text style={[styles.titleLarge, { fontSize: 24, marginLeft: 8, color: theme.colors.onBackground }]}>
                            Sites
                        </Text>
                    </View>
                ) : (
                    <View style={{ marginBottom: 12 }}>
                        <Text style={[styles.titleLarge, { color: theme.colors.onBackground }]}>
                            Site Management
                        </Text>
                        <Text style={styles.subtitle}>{sites.length} total sites managed</Text>
                    </View>
                )}
            </View>

            <FlatList
                data={sites}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
                        <View style={{ borderRadius: 20, overflow: 'hidden' }}>
                            <View style={styles.cardContent}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.siteName, { color: theme.colors.onSurface }]}>{item.name}</Text>
                                    {item.location ? (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                            <MaterialCommunityIcons name="map-marker" size={13} color={theme.colors.secondary} style={{ marginRight: 4 }} />
                                            <Text style={{ color: theme.colors.secondary, fontSize: 13 }}>{item.location}</Text>
                                        </View>
                                    ) : null}
                                    {item.client ? (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                            <MaterialCommunityIcons name="office-building" size={13} color={theme.colors.outline} style={{ marginRight: 4 }} />
                                            <Text style={{ color: theme.colors.outline, fontSize: 13 }}>{item.client}</Text>
                                        </View>
                                    ) : null}
                                </View>
                                <View style={styles.actions}>
                                    {/* Only mobile surveyors get the manual offline sync button */}
                                    {role !== 'admin' && Platform.OS !== 'web' && (
                                        <IconButton
                                            icon={downloadingSiteId === item.id ? "loading" : "cloud-download"}
                                            size={20}
                                            iconColor={theme.colors.primary}
                                            onPress={() => handleDownloadSite(item)}
                                            disabled={downloadingSiteId !== null}
                                        />
                                    )}
                                    <IconButton icon="pencil" size={20} onPress={() => showDialog(item)} />
                                    <IconButton icon="delete" size={20} iconColor={theme.colors.error} onPress={() => handleDelete(item)} />
                                </View>
                            </View>
                        </View>
                    </Surface>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={{ color: theme.colors.secondary }}>No sites defined yet.</Text>
                        <Text style={{ color: theme.colors.secondary }}>Add a site to get started.</Text>
                    </View>
                }
            />

            <FAB
                icon="plus"
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                color={theme.colors.onPrimary}
                onPress={() => showDialog()}
                label="Add Site"
            />

            <Portal>
                <Dialog visible={visible} onDismiss={hideDialog} style={{ backgroundColor: theme.colors.surface, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
                    <Dialog.Title>{editingSite ? 'Edit Site' : 'Add New Site'}</Dialog.Title>
                    <Dialog.Content>
                        <TextInput
                            label="Site Name *"
                            value={name}
                            onChangeText={setName}
                            mode="outlined"
                            style={styles.input}
                            theme={{ colors: { primary: theme.colors.primary, onSurface: '#1C1917', onSurfaceVariant: '#57534E', placeholder: '#57534E', background: '#FFFFFF' } }}
                        />
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={{ fontWeight: 'bold', flex: 1 }}>Location</Text>
                            <HelpIcon text={HELP_TEXT.SITE_LOCATION} size={18} />
                        </View>
                        <TextInput
                            value={location}
                            onChangeText={setLocation}
                            mode="outlined"
                            style={styles.input}
                            placeholder="Select on Map or enter manually"
                            theme={{ colors: { primary: theme.colors.primary, onSurface: '#1C1917', onSurfaceVariant: '#57534E', placeholder: '#57534E', background: '#FFFFFF' } }}
                            right={
                                <TextInput.Icon
                                    icon={loadingLocation ? "loading" : "map-marker"}
                                    onPress={() => !loadingLocation && setMapVisible(true)}
                                    disabled={loadingLocation}
                                />
                            }
                        />
                        <Button
                            mode="text"
                            onPress={() => setMapVisible(true)}
                            style={{ marginBottom: 12, alignSelf: 'flex-start' }}
                            icon="map"
                        >
                            Select on Map
                        </Button>
                        <TextInput
                            label="Client / Owner"
                            value={client}
                            onChangeText={setClient}
                            mode="outlined"
                            style={styles.input}
                            theme={{ colors: { primary: theme.colors.primary, onSurface: '#1C1917', onSurfaceVariant: '#57534E', placeholder: '#57534E', background: '#FFFFFF' } }}
                        />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={hideDialog}>Cancel</Button>
                        <Button onPress={handleSave} mode="contained" style={{ marginLeft: 8 }}>Save</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            <MapPicker
                visible={mapVisible}
                onDismiss={() => setMapVisible(false)}
                onLocationSelected={handleMapLocationSelected}
                initialLocation={initialMapLocation}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 20,
        paddingBottom: 0,
    },
    screenHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    titlePill: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    titleLarge: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 4,
        color: Colors.neutral[600],
    },
    listContent: {
        padding: 20,
        paddingBottom: 100,
    },
    card: {
        marginBottom: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.neutral[200],
    },
    cardContent: {
        flexDirection: 'row',
        padding: 20,
        alignItems: 'center',
    },
    siteName: {
        fontSize: 16,
        fontWeight: '900',
        marginBottom: 4,
        letterSpacing: -0.3,
    },
    actions: {
        flexDirection: 'row',
        marginLeft: 8,
    },
    fab: {
        position: 'absolute',
        margin: 20,
        right: 0,
        bottom: 0,
        borderRadius: 16,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 50,
    },
    input: {
        marginBottom: 16,
        backgroundColor: 'transparent'
    }
});
