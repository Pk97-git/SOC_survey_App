import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Modal, Dimensions, ActivityIndicator, Keyboard } from 'react-native';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';
import { Button, Surface, Text, IconButton, useTheme, FAB, Searchbar } from 'react-native-paper';
import * as Location from 'expo-location';

interface MapPickerProps {
    visible: boolean;
    onDismiss: () => void;
    onLocationSelected: (coordinate: { latitude: number; longitude: number }, address?: string) => void;
    initialLocation?: { latitude: number; longitude: number };
}

export default function MapPicker({ visible, onDismiss, onLocationSelected, initialLocation }: MapPickerProps) {
    const theme = useTheme();
    const mapRef = useRef<MapView>(null);
    const [region, setRegion] = useState({
        latitude: 25.276987, // Default to Dubai/UAE region
        longitude: 55.296249,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    });
    const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [selectedAddress, setSelectedAddress] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        if (visible) {
            if (initialLocation) {
                const initRegion = {
                    latitude: initialLocation.latitude,
                    longitude: initialLocation.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                };
                setRegion(initRegion);
                setSelectedLocation(initialLocation);
                if (mapRef.current) {
                    mapRef.current.animateToRegion(initRegion, 500);
                }
            } else {
                getCurrentLocation();
            }
        }
    }, [visible]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        Keyboard.dismiss();
        try {
            const results = await Location.geocodeAsync(searchQuery);
            if (results && results.length > 0) {
                const firstResult = results[0];
                const newRegion = {
                    latitude: firstResult.latitude,
                    longitude: firstResult.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                };
                setSelectedLocation(newRegion);
                setSelectedAddress(searchQuery); // Assume they searched for a readable name
                if (mapRef.current) {
                    mapRef.current.animateToRegion(newRegion, 1000);
                } else {
                    setRegion(newRegion);
                }
            } else {
                alert("Location not found. Try a different search term.");
            }
        } catch (error) {
            console.error("Geocoding error:", error);
            alert("Error searching for location.");
        } finally {
            setSearching(false);
        }
    };

    const reverseGeocode = async (coords: { latitude: number, longitude: number }) => {
        try {
            const [address] = await Location.reverseGeocodeAsync(coords);
            if (address) {
                const addrStr = [address.name, address.street, address.district, address.city].filter(Boolean).join(', ');
                if (addrStr) setSelectedAddress(addrStr);
            }
        } catch (e) {
            // ignore
        }
    };

    const getCurrentLocation = async () => {
        setLoading(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            let location = await Location.getCurrentPositionAsync({});
            const newRegion = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            };

            if (mapRef.current) {
                mapRef.current.animateToRegion(newRegion, 1000);
            } else {
                setRegion(newRegion);
            }
            setSelectedLocation(newRegion);
            await reverseGeocode(newRegion);
        } catch (error) {
            console.error('Error getting location for map center:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMapPress = async (e: MapPressEvent) => {
        const coords = e.nativeEvent.coordinate;
        setSelectedLocation(coords);
        setSelectedAddress(''); // clear previous address
        await reverseGeocode(coords);
    };

    const handleConfirm = () => {
        if (selectedLocation) {
            onLocationSelected(selectedLocation, selectedAddress || undefined);
            onDismiss();
        }
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onDismiss}>
            <View style={styles.container}>
                {/* Header */}
                <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]} elevation={2}>
                    <IconButton icon="close" onPress={onDismiss} />
                    <Text style={[styles.title, { color: theme.colors.onSurface }]}>Select Location</Text>
                    <Button
                        mode="contained"
                        onPress={handleConfirm}
                        disabled={!selectedLocation}
                        contentStyle={{ height: 40 }}
                    >
                        Confirm
                    </Button>
                </Surface>

                <View style={styles.searchContainer}>
                    <Searchbar
                        placeholder="Search area (e.g. Dubai Mall)"
                        onChangeText={setSearchQuery}
                        value={searchQuery}
                        onSubmitEditing={handleSearch}
                        icon={searching ? () => <ActivityIndicator size="small" /> : "magnify"}
                        style={{ backgroundColor: theme.colors.surface }}
                    />
                </View>

                <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={region}
                    onPress={handleMapPress}
                    showsUserLocation={true}
                    showsMyLocationButton={false}
                >
                    {selectedLocation && (
                        <Marker
                            coordinate={selectedLocation}
                            title={selectedAddress || "Selected Location"}
                        />
                    )}
                </MapView>

                {/* Loading Indicator */}
                {loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                )}

                {/* Locate Me FAB */}
                <FAB
                    icon="crosshairs-gps"
                    style={[styles.fab, { backgroundColor: theme.colors.surface }]}
                    color={theme.colors.primary}
                    onPress={getCurrentLocation}
                    loading={loading}
                />

                {/* Status Overlay */}
                <View style={styles.instructionsContainer}>
                    <Surface style={styles.instructions} elevation={4}>
                        <Text style={{ textAlign: 'center', fontWeight: 'bold' }}>
                            {selectedAddress || (selectedLocation ? `${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)}` : "Tap map to select")}
                        </Text>
                    </Surface>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 8,
        paddingTop: 50, // For status bar
        zIndex: 2,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
    },
    searchContainer: {
        position: 'absolute',
        top: 110,
        left: 16,
        right: 16,
        zIndex: 2,
    },
    map: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
    },
    loadingContainer: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -25,
        marginTop: -25,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 100, // Above instructions
    },
    instructionsContainer: {
        position: 'absolute',
        bottom: 40,
        left: 30,
        right: 100,
        alignItems: 'center',
    },
    instructions: {
        padding: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        width: '100%'
    },
});
