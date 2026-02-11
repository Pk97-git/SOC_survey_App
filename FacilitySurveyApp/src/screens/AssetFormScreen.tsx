import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, useTheme, Text, HelperText } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as hybridStorage from '../services/hybridStorage'; // Use hybridStorage

export default function AssetFormScreen() {
    const navigation = useNavigation<any>();
    const theme = useTheme();

    const route = useRoute<any>();
    const { asset, onSave, siteName, siteId } = route.params || {};

    // Strict Fields State
    const [status, setStatus] = useState(asset?.status || 'Active');
    const [serviceLine, setServiceLine] = useState(asset?.service_line || '');
    const [assetCode, setAssetCode] = useState(asset?.ref_code || '');
    const [assetTag, setAssetTag] = useState(asset?.asset_tag || '');
    const [name, setName] = useState(asset?.name || ''); // Labeled as Asset Description
    const [building, setBuilding] = useState(asset?.building || '');
    const [locationText, setLocationText] = useState(asset?.location || '');

    const [gpsLocation, setGpsLocation] = useState<{ lat: number, lng: number } | null>(
        asset?.location_lat ? { lat: asset.location_lat, lng: asset.location_lng } : null
    );
    const [loading, setLoading] = useState(false);

    const getGpsLocation = async () => {
        setLoading(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission to access location was denied');
                return;
            }

            let loc = await Location.getCurrentPositionAsync({});
            setGpsLocation({
                lat: loc.coords.latitude,
                lng: loc.coords.longitude
            });
        } catch (e) {
            Alert.alert("Error", "Failed to get GPS location");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!name) { // Name is required
            Alert.alert("Required", "Please enter Asset Description (Name).");
            return;
        }

        if (!siteId && !asset?.site_id) {
            Alert.alert("Error", "Site ID missing. Cannot save.");
            return;
        }

        try {
            setLoading(true);
            const data = {
                id: asset?.id, // For update if supported
                site_id: siteId || asset?.site_id,
                status,
                service_line: serviceLine,
                ref_code: assetCode,
                asset_tag: assetTag,
                name,
                building,
                location: locationText,
                description: name, // Duplicate name to description for safety
                // GPS kept as bonus (not in visible list but good for app)
                location_lat: gpsLocation?.lat,
                location_lng: gpsLocation?.lng,
            };

            if (asset?.id) {
                await hybridStorage.updateAsset(asset.id, data);
            } else {
                await hybridStorage.saveAsset(data);
            }

            if (onSave) onSave();
            Alert.alert("Success", "Asset Saved!");
            navigation.goBack();
        } catch (e: any) {
            Alert.alert("Error", "Failed to save asset: " + (e.message || "Unknown error"));
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={{ marginBottom: 20, fontSize: 20, fontWeight: 'bold' }}>Asset Details</Text>

            <TextInput label="Asset Status" value={status} onChangeText={setStatus} mode="outlined" style={styles.input} />
            <TextInput label="Asset System" value={serviceLine} onChangeText={setServiceLine} mode="outlined" style={styles.input} />
            <TextInput label="Asset Code" value={assetCode} onChangeText={setAssetCode} mode="outlined" style={styles.input} />
            <TextInput label="Asset Tag" value={assetTag} onChangeText={setAssetTag} mode="outlined" style={styles.input} />
            <TextInput label="Asset Description *" value={name} onChangeText={setName} mode="outlined" style={styles.input} />
            <TextInput label="Building" value={building} onChangeText={setBuilding} mode="outlined" style={styles.input} />
            <TextInput label="Location" value={locationText} onChangeText={setLocationText} mode="outlined" style={styles.input} />

            <View style={styles.locationBox}>
                <Button
                    mode="outlined"
                    icon="map-marker"
                    loading={loading}
                    onPress={getGpsLocation}
                >
                    {gpsLocation ? "Update GPS Location" : "Capture GPS Location"}
                </Button>
                {gpsLocation && (
                    <HelperText type="info" visible>
                        Lat: {gpsLocation.lat.toFixed(6)}, Lng: {gpsLocation.lng.toFixed(6)}
                    </HelperText>
                )}
            </View>

            <Button mode="contained" onPress={handleSave} loading={loading} style={{ marginTop: 20 }}>
                Save Asset
            </Button>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20, paddingBottom: 50 },
    input: { marginBottom: 15, backgroundColor: 'white' },
    locationBox: { marginVertical: 10, alignItems: 'center' }
});
