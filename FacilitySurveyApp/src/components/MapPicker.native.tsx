import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, Dimensions, ActivityIndicator } from 'react-native';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';
import { Button, Surface, Text, IconButton, useTheme, FAB } from 'react-native-paper';
import * as Location from 'expo-location';

interface MapPickerProps {
    visible: boolean;
    onDismiss: () => void;
    onLocationSelected: (coordinate: { latitude: number; longitude: number }) => void;
    initialLocation?: { latitude: number; longitude: number };
}

export default function MapPicker({ visible, onDismiss, onLocationSelected, initialLocation }: MapPickerProps) {
    const theme = useTheme();
    const [region, setRegion] = useState({
        latitude: 25.276987, // Default to Dubai/UAE region
        longitude: 55.296249,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    });
    const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            if (initialLocation) {
                setRegion({
                    ...region,
                    latitude: initialLocation.latitude,
                    longitude: initialLocation.longitude,
                });
                setSelectedLocation(initialLocation);
            } else {
                getCurrentLocation();
            }
        }
    }, [visible]); // Removed initialLocation to prevent potential loops if object reference changes

    const getCurrentLocation = async () => {
        setLoading(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            let location = await Location.getCurrentPositionAsync({});
            const newRegion = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.01, // Zoom in closer for user location
                longitudeDelta: 0.01,
            };
            setRegion(newRegion);

            // Optional: If no location selected yet, pre-select current location? 
            // Better to let user tap to confirm to be precise.
        } catch (error) {
            console.error('Error getting location for map center:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMapPress = (e: MapPressEvent) => {
        setSelectedLocation(e.nativeEvent.coordinate);
    };

    const handleConfirm = () => {
        if (selectedLocation) {
            onLocationSelected(selectedLocation);
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

                <MapView
                    style={styles.map}
                    region={region}
                    onRegionChangeComplete={setRegion}
                    onPress={handleMapPress}
                    showsUserLocation={true}
                    showsMyLocationButton={false} // We implement our own for better control
                >
                    {selectedLocation && (
                        <Marker coordinate={selectedLocation} title="Selected Location" />
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

                {/* Instructions Overlay */}
                <View style={styles.instructionsContainer}>
                    <Surface style={styles.instructions} elevation={2}>
                        <Text style={{ textAlign: 'center' }}>Tap on the map to select a location</Text>
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
        zIndex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
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
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    instructions: {
        padding: 12,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
    },
});
