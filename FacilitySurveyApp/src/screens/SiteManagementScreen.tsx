import React, { useState, useEffect } from 'react';
import MapPicker from '../components/MapPicker';
import * as Location from 'expo-location';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, FAB, Surface, useTheme, IconButton, TextInput, Portal, Dialog, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import * as hybridStorage from '../services/hybridStorage'; // Use hybrid storage
// import { storage, SiteRecord } from '../services/storage'; // Removed local storage
import { SafeAreaView } from 'react-native-safe-area-context';

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
    const [sites, setSites] = useState<SiteRecord[]>([]);
    const [loading, setLoading] = useState(false);

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
            const data = await hybridStorage.getSites();
            setSites(data);
        } catch (error) {
            console.error('Error loading sites:', error);
        } finally {
            setLoading(false);
        }
    };

    const parseLocation = (locString: string) => {
        if (!locString) return undefined;

        // Try to find coordinates in parentheses first: "Address (lat, lng)"
        const match = locString.match(/\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)/);
        if (match) {
            const lat = parseFloat(match[1]);
            const lng = parseFloat(match[2]);
            if (!isNaN(lat) && !isNaN(lng)) {
                return { latitude: lat, longitude: lng };
            }
        }

        // Fallback to simple "lat, lng" format
        const parts = locString.split(',').map(s => parseFloat(s.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            return { latitude: parts[0], longitude: parts[1] };
        }
        return undefined;
    };

    const handleGetLocation = async () => {
        setMapVisible(true);
    };

    const handleMapLocationSelected = async (coordinate: { latitude: number, longitude: number }) => {
        setLoadingLocation(true);
        try {
            const result = await Location.reverseGeocodeAsync(coordinate);
            if (result.length > 0) {
                const addr = result[0];
                const addressParts = [
                    addr.name,
                    addr.street,
                    addr.district,
                    addr.city,
                    addr.region
                ].filter(part => part && part !== addr.name); // Avoid duplicate if name == street

                // If name is distinct, include it
                if (addr.name && !addressParts.includes(addr.name)) {
                    addressParts.unshift(addr.name);
                }

                const addressText = addressParts.join(', ');
                const coordsText = `(${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)})`;

                setLocation(addressText ? `${addressText} ${coordsText}` : coordsText);
            } else {
                setLocation(`${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`);
            }
        } catch (error) {
            console.log('Error reverse geocoding:', error);
            setLocation(`${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`);
        } finally {
            setLoadingLocation(false);
        }
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

    const hideDialog = () => setVisible(false);

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
                await hybridStorage.updateSite(editingSite.id, siteData);
            } else {
                await hybridStorage.saveSite(siteData);
            }

            hideDialog();
            loadSites();
        } catch (error) {
            console.error('Error saving site:', error);
            Alert.alert('Error', 'Failed to save site');
        }
    };

    const handleDelete = (site: SiteRecord) => {
        Alert.alert(
            'Delete Site',
            `Are you sure you want to delete ${site.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await hybridStorage.deleteSite(site.id);
                            loadSites();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete site');
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <Surface style={styles.screenHeader} elevation={1}>
                    <IconButton
                        icon="arrow-left"
                        size={24}
                        onPress={() => navigation.goBack()}
                        iconColor={theme.colors.primary}
                    />
                    <Text style={[styles.title, { color: theme.colors.primary }]}>
                        Sites
                    </Text>
                </Surface>
                <Text style={styles.subtitle}>{sites.length} total sites managed</Text>
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
                                        <Text style={{ color: theme.colors.secondary }}>📍 {item.location}</Text>
                                    ) : null}
                                    {item.client ? (
                                        <Text style={{ color: theme.colors.outline }}>🏢 {item.client}</Text>
                                    ) : null}
                                </View>
                                <View style={styles.actions}>
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
                <Dialog visible={visible} onDismiss={hideDialog} style={{ backgroundColor: theme.colors.surface }}>
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
                        <TextInput
                            label="Location"
                            value={location}
                            onChangeText={setLocation}
                            mode="outlined"
                            style={styles.input}
                            placeholder="Select on Map"
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
        padding: 8,
        borderRadius: 16,
        marginBottom: 12,
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 13,
        fontWeight: '700',
        opacity: 0.6,
        marginLeft: 4,
        marginBottom: 12,
    },
    listContent: {
        padding: 20,
        paddingBottom: 100,
    },
    card: {
        marginBottom: 16,
        borderRadius: 20,
        // overflow: 'hidden', // Moved to inner View
        borderWidth: 1,
        borderColor: '#E7E5E4'
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
