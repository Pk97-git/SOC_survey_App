import React, { useState } from 'react';
import { View, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { Button, Surface, Text, IconButton, useTheme, TextInput, Searchbar } from 'react-native-paper';
import * as Location from 'expo-location';

interface MapPickerProps {
    visible: boolean;
    onDismiss: () => void;
    onLocationSelected: (coordinate: { latitude: number; longitude: number }, address?: string) => void;
    initialLocation?: { latitude: number; longitude: number };
}

export default function MapPicker({ visible, onDismiss, onLocationSelected, initialLocation }: MapPickerProps) {
    const theme = useTheme();
    const [lat, setLat] = useState(initialLocation?.latitude.toString() || '');
    const [lng, setLng] = useState(initialLocation?.longitude.toString() || '');
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState('');

    const handleConfirm = () => {
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        if (!isNaN(latitude) && !isNaN(longitude)) {
            onLocationSelected({ latitude, longitude }, selectedAddress || undefined);
            onDismiss();
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        try {
            const results = await Location.geocodeAsync(searchQuery);
            if (results && results.length > 0) {
                const firstResult = results[0];
                setLat(firstResult.latitude.toFixed(5));
                setLng(firstResult.longitude.toFixed(5));
                setSelectedAddress(searchQuery);
            } else {
                alert("Location not found. Try a different search term.");
            }
        } catch (error) {
            console.error("Geocoding error:", error);
            alert("Error searching for location. Please enter coordinates manually.");
        } finally {
            setSearching(false);
        }
    };

    const handleGetLocation = async () => {
        setSearching(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                alert('Permission denied');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setLat(location.coords.latitude.toFixed(5));
            setLng(location.coords.longitude.toFixed(5));

            // Try reverse geocode
            const [address] = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            });
            if (address) {
                const addrStr = [address.name, address.street, address.district, address.city].filter(Boolean).join(', ');
                if (addrStr) setSelectedAddress(addrStr);
            }
        } catch (error) {
            console.error('Error getting location:', error);
            alert('Could not get current location');
        } finally {
            setSearching(false);
        }
    };

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onDismiss}>
            <View style={styles.container}>
                <Surface style={[styles.dialog, { backgroundColor: theme.colors.surface }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Location Selection</Text>
                        <IconButton icon="close" onPress={onDismiss} />
                    </View>

                    <Text style={{ marginBottom: 16, color: theme.colors.onSurfaceVariant }}>
                        Interactive map is unavailable on the web. Connect an address by searching or locating yourself.
                    </Text>

                    <Searchbar
                        placeholder="Search for an address..."
                        onChangeText={setSearchQuery}
                        value={searchQuery}
                        onSubmitEditing={handleSearch}
                        icon={searching ? () => <ActivityIndicator size="small" /> : "magnify"}
                        style={{ marginBottom: 16, backgroundColor: theme.colors.surfaceVariant }}
                    />

                    <Button
                        mode="outlined"
                        icon="crosshairs-gps"
                        onPress={handleGetLocation}
                        loading={searching}
                        style={{ marginBottom: 16 }}
                    >
                        Use Current Location
                    </Button>

                    {selectedAddress ? (
                        <Text style={{ marginBottom: 16, fontWeight: 'bold', color: theme.colors.primary }}>
                            Resolved Location: {selectedAddress}
                        </Text>
                    ) : null}

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TextInput
                            label="Latitude"
                            value={lat}
                            onChangeText={setLat}
                            keyboardType="numeric"
                            mode="outlined"
                            style={[styles.input, { flex: 1, backgroundColor: 'transparent' }]}
                        />
                        <TextInput
                            label="Longitude"
                            value={lng}
                            onChangeText={setLng}
                            keyboardType="numeric"
                            mode="outlined"
                            style={[styles.input, { flex: 1, backgroundColor: 'transparent' }]}
                        />
                    </View>

                    <Button
                        mode="contained"
                        onPress={handleConfirm}
                        style={styles.button}
                    >
                        Confirm Location
                    </Button>
                </Surface>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20
    },
    dialog: {
        borderRadius: 12,
        padding: 24,
        elevation: 5,
        width: '100%',
        maxWidth: 500,
        alignSelf: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold'
    },
    input: {
        marginBottom: 12
    },
    button: {
        marginTop: 8
    }
});
