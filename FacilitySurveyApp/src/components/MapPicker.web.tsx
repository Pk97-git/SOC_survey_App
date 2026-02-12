
import React, { useState } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { Button, Surface, Text, IconButton, useTheme, TextInput } from 'react-native-paper';

interface MapPickerProps {
    visible: boolean;
    onDismiss: () => void;
    onLocationSelected: (coordinate: { latitude: number; longitude: number }) => void;
    initialLocation?: { latitude: number; longitude: number };
}

export default function MapPicker({ visible, onDismiss, onLocationSelected, initialLocation }: MapPickerProps) {
    const theme = useTheme();
    const [lat, setLat] = useState(initialLocation?.latitude.toString() || '');
    const [lng, setLng] = useState(initialLocation?.longitude.toString() || '');

    const handleConfirm = () => {
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        if (!isNaN(latitude) && !isNaN(longitude)) {
            onLocationSelected({ latitude, longitude });
            onDismiss();
        }
    };

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onDismiss}>
            <View style={styles.container}>
                <Surface style={[styles.dialog, { backgroundColor: theme.colors.surface }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Enter Coordinates</Text>
                        <IconButton icon="close" onPress={onDismiss} />
                    </View>

                    <Text style={{ marginBottom: 16, color: theme.colors.onSurfaceVariant }}>
                        Map view is not available on web. Please enter coordinates manually.
                    </Text>

                    <TextInput
                        label="Latitude"
                        value={lat}
                        onChangeText={setLat}
                        keyboardType="numeric"
                        mode="outlined"
                        style={styles.input}
                    />
                    <TextInput
                        label="Longitude"
                        value={lng}
                        onChangeText={setLng}
                        keyboardType="numeric"
                        mode="outlined"
                        style={styles.input}
                    />

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
        padding: 20,
        elevation: 5
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
