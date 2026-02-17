import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button, TextInput, useTheme, Chip, SegmentedButtons } from 'react-native-paper';
import PhotoPicker from './PhotoPicker';
import * as Location from 'expo-location';

interface AssetInspectionCardProps {
    asset: any;
    inspection: any;
    onUpdate: (inspection: any) => void;
    onCaptureGPS: () => Promise<{ lat: number; lng: number } | null>;
}

const CONDITION_RATINGS = [
    { value: 'A', label: 'A - NEW', color: '#4CAF50' },
    { value: 'B', label: 'B - Excellent', color: '#8BC34A' },
    { value: 'C', label: 'C - Good', color: '#CDDC39' },
    { value: 'D', label: 'D - Average', color: '#FFC107' },
    { value: 'E', label: 'E - Poor', color: '#FF9800' },
    { value: 'F', label: 'F - Very Poor', color: '#FF5722' },
    { value: 'G', label: 'G - T.B.D', color: '#9E9E9E' },
];

const OVERALL_CONDITIONS = [
    { value: 'Satisfactory', label: 'Satisfactory' },
    { value: 'Unsatisfactory', label: 'Unsatisfactory' },
    { value: 'Satisfactory with Comment', label: 'Satisfactory with Comment' },
];

export default function AssetInspectionCard({
    asset,
    inspection,
    onUpdate,
    onCaptureGPS
}: AssetInspectionCardProps) {
    const theme = useTheme();
    const [capturingGPS, setCapturingGPS] = useState(false);

    const handleConditionRatingChange = (rating: string) => {
        onUpdate({ ...inspection, condition_rating: rating });
    };

    const handleOverallConditionChange = (condition: string) => {
        onUpdate({ ...inspection, overall_condition: condition });
    };

    const handlePhotosChange = (photos: string[]) => {
        onUpdate({ ...inspection, photos });
    };

    const handleCaptureGPS = async () => {
        setCapturingGPS(true);
        const coords = await onCaptureGPS();
        if (coords) {
            onUpdate({ ...inspection, gps_lat: coords.lat, gps_lng: coords.lng });
        }
        setCapturingGPS(false);
    };

    const isComplete = inspection.condition_rating && inspection.overall_condition;

    return (
        <Card style={[styles.card, isComplete && { borderColor: theme.colors.primary, borderWidth: 2 }]}>
            <Card.Content>
                {/* Asset Header */}
                <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                        <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                            {asset.name}
                        </Text>
                        {asset.ref_code && (
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                Ref: {asset.ref_code}
                            </Text>
                        )}
                        <View style={styles.assetMeta}>
                            {asset.service_line && <Chip compact>{asset.service_line}</Chip>}
                            {asset.floor && <Chip compact>Floor: {asset.floor}</Chip>}
                            {asset.area && <Chip compact>{asset.area}</Chip>}
                        </View>
                    </View>
                    {isComplete && (
                        <Chip icon="check-circle" mode="flat" style={{ backgroundColor: theme.colors.primaryContainer }}>
                            Complete
                        </Chip>
                    )}
                </View>

                {/* Condition Rating */}
                <View style={styles.section}>
                    <Text variant="labelLarge" style={styles.label}>
                        Condition Rating *
                    </Text>
                    <View style={styles.ratingGrid}>
                        {CONDITION_RATINGS.map((rating) => (
                            <Button
                                key={rating.value}
                                mode={inspection.condition_rating === rating.value ? 'contained' : 'outlined'}
                                onPress={() => handleConditionRatingChange(rating.value)}
                                style={[
                                    styles.ratingButton,
                                    inspection.condition_rating === rating.value && { backgroundColor: rating.color }
                                ]}
                                labelStyle={{ fontSize: 12 }}
                            >
                                {rating.value}
                            </Button>
                        ))}
                    </View>
                    {inspection.condition_rating && (
                        <Text variant="bodySmall" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}>
                            {CONDITION_RATINGS.find(r => r.value === inspection.condition_rating)?.label}
                        </Text>
                    )}
                </View>

                {/* Overall Condition */}
                <View style={styles.section}>
                    <Text variant="labelLarge" style={styles.label}>
                        Overall Condition *
                    </Text>
                    <SegmentedButtons
                        value={inspection.overall_condition || ''}
                        onValueChange={handleOverallConditionChange}
                        buttons={OVERALL_CONDITIONS.map(c => ({
                            value: c.value,
                            label: c.label,
                            style: { paddingVertical: 4 }
                        }))}
                    />
                </View>

                {/* Quantities */}
                <View style={styles.section}>
                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text variant="labelMedium" style={styles.label}>Qty Installed</Text>
                            <TextInput
                                mode="outlined"
                                keyboardType="numeric"
                                value={inspection.quantity_installed?.toString() || ''}
                                onChangeText={(text) => onUpdate({ ...inspection, quantity_installed: Math.floor(parseFloat(text)) || 0 })}
                                dense
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text variant="labelMedium" style={styles.label}>Qty Working</Text>
                            <TextInput
                                mode="outlined"
                                keyboardType="numeric"
                                value={inspection.quantity_working?.toString() || ''}
                                onChangeText={(text) => onUpdate({ ...inspection, quantity_working: Math.floor(parseFloat(text)) || 0 })}
                                dense
                            />
                        </View>
                    </View>
                </View>

                {/* Photos */}
                <View style={styles.section}>
                    <Text variant="labelLarge" style={styles.label}>
                        Photos
                    </Text>
                    <PhotoPicker
                        photos={inspection.photos || []}
                        onPhotosChange={handlePhotosChange}
                        maxPhotos={10}
                    />
                </View>

                {/* Remarks */}
                <View style={styles.section}>
                    <Text variant="labelLarge" style={styles.label}>
                        Remarks
                    </Text>
                    <TextInput
                        mode="outlined"
                        multiline
                        numberOfLines={3}
                        value={inspection.remarks || ''}
                        onChangeText={(text) => onUpdate({ ...inspection, remarks: text })}
                        placeholder="Enter any observations or comments..."
                    />
                </View>

                {/* GPS */}
                <View style={styles.section}>
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            {inspection.gps_lat && inspection.gps_lng ? (
                                <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
                                    📍 GPS: {inspection.gps_lat.toFixed(6)}, {inspection.gps_lng.toFixed(6)}
                                </Text>
                            ) : (
                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                    No GPS coordinates captured
                                </Text>
                            )}
                        </View>
                        <Button
                            mode="outlined"
                            icon="crosshairs-gps"
                            onPress={handleCaptureGPS}
                            loading={capturingGPS}
                            compact
                        >
                            {inspection.gps_lat ? 'Update GPS' : 'Capture GPS'}
                        </Button>
                    </View>
                </View>
            </Card.Content>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        marginVertical: 8,
        marginHorizontal: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    assetMeta: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 8,
    },
    section: {
        marginTop: 16,
    },
    label: {
        marginBottom: 8,
    },
    ratingGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    ratingButton: {
        minWidth: 45,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
