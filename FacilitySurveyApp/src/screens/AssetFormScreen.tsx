import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, useTheme, Text, HelperText, Surface, IconButton } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as hybridStorage from '../services/hybridStorage';
import { Colors, Radius, Spacing, Typography } from '../constants/design';
import { HelpIcon } from '../components/HelpIcon';
import { HELP_TEXT } from '../constants/helpText';

export default function AssetFormScreen() {
    const navigation = useNavigation<any>();
    const theme = useTheme();

    const route = useRoute<any>();
    const { asset, onSave, siteName, siteId, defaultTrade, defaultBuilding } = route.params || {};

    const [status, setStatus] = useState(asset?.status || 'Active');
    const [serviceLine, setServiceLine] = useState(asset?.service_line || defaultTrade || '');
    const [assetCode, setAssetCode] = useState(asset?.ref_code || '');
    const [assetTag, setAssetTag] = useState(asset?.asset_tag || '');
    const [name, setName] = useState(asset?.name || '');
    const [building, setBuilding] = useState(asset?.building || defaultBuilding || '');
    const [zone, setZone] = useState(asset?.zone || '');
    const [locationText, setLocationText] = useState(asset?.location || '');
    const [floor, setFloor] = useState(asset?.floor || '');
    const [area, setArea] = useState(asset?.area?.toString() || '');
    const [age, setAge] = useState(asset?.age?.toString() || '');

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
            setGpsLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        } catch (e) {
            Alert.alert("Error", "Failed to get GPS location");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!name) {
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
                id: asset?.id,
                site_id: siteId || asset?.site_id,
                status,
                service_line: serviceLine,
                ref_code: assetCode,
                asset_tag: assetTag,
                name,
                zone,
                building,
                location: locationText,
                floor,
                area: area ? parseFloat(area) : undefined,
                age: age ? parseInt(age, 10) : undefined,
                description: name,
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
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]} elevation={2}>
                <IconButton
                    icon="arrow-left"
                    size={24}
                    onPress={() => navigation.goBack()}
                    iconColor={theme.colors.primary}
                    style={{ marginLeft: -4 }}
                />
                <Text style={[Typography.h3, { color: theme.colors.onSurface, flex: 1 }]}>
                    {asset ? 'Edit Asset' : 'Add Asset'}
                </Text>
                <Button
                    mode="contained"
                    onPress={handleSave}
                    loading={loading}
                    disabled={loading}
                    compact
                    style={{ borderRadius: Radius.sm }}
                >
                    Save
                </Button>
            </Surface>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Asset Identity */}
                <Text style={[Typography.labelXs, { color: theme.colors.onSurfaceVariant, marginBottom: Spacing[2], marginLeft: 4 }]}>
                    Asset Identity
                </Text>
                <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={1}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[2] }}>
                        <Text style={[Typography.labelMd, { color: theme.colors.onSurface, flex: 1 }]}>Asset Description *</Text>
                        <HelpIcon text={HELP_TEXT.ASSET_NAME} size={16} />
                    </View>
                    <TextInput value={name} onChangeText={setName} mode="outlined" style={styles.input} />

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[2] }}>
                        <Text style={[Typography.labelMd, { color: theme.colors.onSurface, flex: 1 }]}>Asset Code / Ref</Text>
                        <HelpIcon text={HELP_TEXT.REF_CODE} size={16} />
                    </View>
                    <TextInput value={assetCode} onChangeText={setAssetCode} mode="outlined" style={styles.input} />

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[2] }}>
                        <Text style={[Typography.labelMd, { color: theme.colors.onSurface, flex: 1 }]}>Asset Tag</Text>
                        <HelpIcon text={HELP_TEXT.ASSET_TAG} size={16} />
                    </View>
                    <TextInput value={assetTag} onChangeText={setAssetTag} mode="outlined" style={styles.input} />

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[2] }}>
                        <Text style={[Typography.labelMd, { color: theme.colors.onSurface, flex: 1 }]}>Asset System / Service Line</Text>
                        <HelpIcon text={HELP_TEXT.ASSET_SERVICE_LINE} size={16} />
                    </View>
                    <TextInput value={serviceLine} onChangeText={setServiceLine} mode="outlined" style={styles.input} />

                    <TextInput label="Asset Status" value={status} onChangeText={setStatus} mode="outlined" style={[styles.input, { marginBottom: 0 }]} />
                </Surface>

                {/* Location */}
                <Text style={[Typography.labelXs, { color: theme.colors.onSurfaceVariant, marginBottom: Spacing[2], marginLeft: 4, marginTop: Spacing[4] }]}>
                    Location
                </Text>
                <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={1}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[2] }}>
                        <Text style={[Typography.labelMd, { color: theme.colors.onSurface, flex: 1 }]}>Zone</Text>
                        <HelpIcon text={HELP_TEXT.ASSET_ZONE} size={16} />
                    </View>
                    <TextInput value={zone} onChangeText={setZone} mode="outlined" style={styles.input} />

                    <TextInput label="Building" value={building} onChangeText={setBuilding} mode="outlined" style={styles.input} />
                    <TextInput label="Location / Room / Space" value={locationText} onChangeText={setLocationText} mode="outlined" style={styles.input} />
                    <TextInput label="Floor" value={floor} onChangeText={setFloor} mode="outlined" style={[styles.input, { marginBottom: 0 }]} />
                </Surface>

                {/* Details */}
                <Text style={[Typography.labelXs, { color: theme.colors.onSurfaceVariant, marginBottom: Spacing[2], marginLeft: 4, marginTop: Spacing[4] }]}>
                    Details
                </Text>
                <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={1}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[2] }}>
                        <Text style={[Typography.labelMd, { color: theme.colors.onSurface, flex: 1 }]}>Area (m²)</Text>
                        <HelpIcon text={HELP_TEXT.ASSET_AREA} size={16} />
                    </View>
                    <TextInput value={area} onChangeText={setArea} mode="outlined" style={styles.input} keyboardType="numeric" />

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[2] }}>
                        <Text style={[Typography.labelMd, { color: theme.colors.onSurface, flex: 1 }]}>Age (years)</Text>
                        <HelpIcon text={HELP_TEXT.ASSET_AGE} size={16} />
                    </View>
                    <TextInput value={age} onChangeText={setAge} mode="outlined" style={styles.input} keyboardType="numeric" />

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[2] }}>
                        <Text style={[Typography.labelMd, { color: theme.colors.onSurface, flex: 1 }]}>GPS Location</Text>
                        <HelpIcon text={HELP_TEXT.ASSET_GPS} size={16} />
                    </View>
                    <Button
                        mode="outlined"
                        icon="crosshairs-gps"
                        loading={loading}
                        onPress={getGpsLocation}
                        style={{ borderRadius: Radius.sm }}
                    >
                        {gpsLocation ? "Update GPS Location" : "Capture GPS Location"}
                    </Button>
                    {gpsLocation && (
                        <HelperText type="info" visible style={{ marginTop: 4 }}>
                            {gpsLocation.lat.toFixed(6)}, {gpsLocation.lng.toFixed(6)}
                        </HelperText>
                    )}
                </Surface>

                <View style={{ height: Spacing[8] }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing[3],
        paddingVertical: Spacing[2],
        gap: Spacing[2],
    },
    scrollContent: {
        padding: Spacing[4],
    },
    section: {
        borderRadius: Radius.lg,
        padding: Spacing[4],
        borderWidth: 1,
        borderColor: Colors.neutral[200],
        marginBottom: 0,
    },
    input: {
        marginBottom: Spacing[3],
        backgroundColor: 'transparent',
    },
});
