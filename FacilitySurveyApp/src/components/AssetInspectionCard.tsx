import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button, TextInput, useTheme, Chip, SegmentedButtons, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PhotoPicker from './PhotoPicker';
import { Colors, Radius, Typography, Spacing } from '../constants/design';
import { HelpIcon } from './HelpIcon';
import { HELP_TEXT } from '../constants/helpText';

interface AssetInspectionCardProps {
    asset: any;
    inspection: any;
    surveyId: string;
    onUpdate: (assetId: string, inspection: any) => void;
    onCaptureGPS: () => Promise<{ lat: number; lng: number } | null>;
}

// Condition rating colors use design tokens — no hardcoded values
const CONDITION_RATINGS = [
    { value: 'A >> NEW', label: 'A - NEW', color: Colors.conditionRating.A },
    { value: 'B >> Excellent', label: 'B - Excellent', color: Colors.conditionRating.B },
    { value: 'C >> Good', label: 'C - Good', color: Colors.conditionRating.C },
    { value: 'D >> Average', label: 'D - Average', color: Colors.conditionRating.D },
    { value: 'E >> Poor', label: 'E - Poor', color: Colors.conditionRating.E },
    { value: 'F >> Very Poor', label: 'F - Very Poor', color: Colors.conditionRating.F },
    { value: 'G >> T.B.D', label: 'G - T.B.D', color: Colors.conditionRating.G },
];

const OVERALL_CONDITIONS = [
    { value: 'Satisfactory', label: 'Satisfactory' },
    { value: 'Unsatisfactory', label: 'Unsatisfactory' },
    { value: 'Satisfactory with Comment', label: 'Satisfactory with Comment' },
];

const AssetInspectionCard = ({
    asset,
    inspection,
    surveyId,
    onUpdate,
    onCaptureGPS
}: AssetInspectionCardProps) => {
    const theme = useTheme();
    const [capturingGPS, setCapturingGPS] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateQuantity = (value: string, field: 'quantity_installed' | 'quantity_working') => {
        const newErrors = { ...errors };
        const num = parseInt(value);

        // Check if it's a valid number
        if (value && (isNaN(num) || num < 0)) {
            newErrors[field] = 'Must be a positive number';
        }
        // Check if working quantity exceeds installed quantity
        else if (field === 'quantity_working' && value && !isNaN(num)) {
            const installed = inspection.quantity_installed || 0;
            if (num > installed) {
                newErrors[field] = `Cannot exceed installed qty (${installed})`;
            } else {
                delete newErrors[field];
            }
        }
        else {
            delete newErrors[field];
        }

        setErrors(newErrors);
    };

    const validateRemarks = () => {
        const newErrors = { ...errors };

        // Require remarks if condition is Unsatisfactory or has Comment
        if ((inspection.overall_condition === 'Unsatisfactory' ||
             inspection.overall_condition === 'Satisfactory with Comment') &&
            (!inspection.remarks || inspection.remarks.trim().length === 0)) {
            newErrors.remarks = 'Remarks required for this condition';
        } else {
            delete newErrors.remarks;
        }

        setErrors(newErrors);
    };

    const handleConditionRatingChange = (rating: string) => {
        onUpdate(asset.id, { ...inspection, condition_rating: rating });
    };

    const handleOverallConditionChange = (condition: string) => {
        onUpdate(asset.id, { ...inspection, overall_condition: condition });
        // Re-validate remarks when condition changes
        setTimeout(validateRemarks, 100);
    };

    const handlePhotosChange = (photos: string[]) => {
        onUpdate(asset.id, { ...inspection, photos });
    };

    const handleCaptureGPS = async () => {
        setCapturingGPS(true);
        const coords = await onCaptureGPS();
        if (coords) {
            onUpdate(asset.id, { ...inspection, gps_lat: coords.lat, gps_lng: coords.lng });
        }
        setCapturingGPS(false);
    };

    const isComplete = !!(inspection.condition_rating && inspection.overall_condition);

    return (
        <Card style={[
            styles.card,
            {
                borderLeftWidth: 4,
                borderLeftColor: isComplete ? theme.colors.primary : theme.colors.outlineVariant,
                borderColor: theme.colors.outlineVariant,
            }
        ]}>
            <Card.Content style={{ paddingHorizontal: Spacing[4], paddingVertical: Spacing[4] }}>

                {/* ── Asset Header ─────────────────────────────────────── */}
                <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                        <Text style={[Typography.h4, { color: theme.colors.onSurface }]}>
                            {asset.name}
                        </Text>
                        {asset.ref_code && (
                            <Text style={[Typography.bodyXs, { color: theme.colors.onSurfaceVariant, marginTop: 2 }]}>
                                Ref: {asset.ref_code}
                            </Text>
                        )}
                        <View style={styles.assetMeta}>
                            {asset.service_line && <Chip compact style={{ backgroundColor: theme.colors.primaryContainer }}>{asset.service_line}</Chip>}
                            {asset.floor && <Chip compact>Floor: {asset.floor}</Chip>}
                            {asset.area && <Chip compact>{asset.area}</Chip>}
                        </View>
                    </View>
                    {isComplete && (
                        <Chip
                            icon="check-circle"
                            mode="flat"
                            style={{ backgroundColor: Colors.status.successBg }}
                            textStyle={{ color: Colors.status.successGreen, fontWeight: '600', fontSize: 12 }}
                        >
                            Complete
                        </Chip>
                    )}
                </View>

                <Divider style={{ marginBottom: Spacing[4] }} />

                {/* ── Condition Rating ──────────────────────────────────── */}
                <View style={styles.section}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[2] }}>
                        <Text style={[Typography.labelLg, { color: theme.colors.onSurface }]}>
                            Condition Rating *
                        </Text>
                        <HelpIcon text={HELP_TEXT.CONDITION_RATING} />
                    </View>
                    <View style={styles.ratingGrid}>
                        {CONDITION_RATINGS.map((rating) => {
                            const isSelected = inspection.condition_rating === rating.value;
                            return (
                                <Button
                                    key={rating.value}
                                    mode={isSelected ? 'contained' : 'outlined'}
                                    onPress={() => handleConditionRatingChange(rating.value)}
                                    style={[
                                        styles.ratingButton,
                                        isSelected
                                            ? { backgroundColor: rating.color, borderColor: rating.color }
                                            : { borderColor: theme.colors.outlineVariant },
                                    ]}
                                    labelStyle={{ fontSize: 12 }}
                                    textColor={isSelected ? '#FFFFFF' : theme.colors.onSurface}
                                >
                                    {rating.value}
                                </Button>
                            );
                        })}
                    </View>
                    {inspection.condition_rating && (
                        <Text style={[Typography.bodyXs, { marginTop: Spacing[1], color: theme.colors.onSurfaceVariant }]}>
                            Selected: {CONDITION_RATINGS.find(r => r.value === inspection.condition_rating)?.label}
                        </Text>
                    )}
                </View>

                <Divider style={{ marginTop: Spacing[4], marginBottom: Spacing[4] }} />

                {/* ── Overall Condition ─────────────────────────────────── */}
                <View style={styles.section}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[2] }}>
                        <Text style={[Typography.labelLg, { color: theme.colors.onSurface }]}>
                            Overall Condition *
                        </Text>
                        <HelpIcon text={HELP_TEXT.OVERALL_CONDITION} />
                    </View>
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

                <Divider style={{ marginTop: Spacing[4], marginBottom: Spacing[4] }} />

                {/* ── Quantities ────────────────────────────────────────── */}
                <View style={styles.section}>
                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: Spacing[2] }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[1] }}>
                                <Text style={[Typography.labelMd, { color: theme.colors.onSurface }]}>Qty Installed</Text>
                                <HelpIcon text={HELP_TEXT.QUANTITY_INSTALLED} size={14} />
                            </View>
                            <TextInput
                                mode="outlined"
                                keyboardType="numeric"
                                value={inspection.quantity_installed?.toString() || ''}
                                onChangeText={(text) => {
                                    validateQuantity(text, 'quantity_installed');
                                    onUpdate(asset.id, { ...inspection, quantity_installed: Math.floor(parseFloat(text)) || 0 });
                                }}
                                error={!!errors.quantity_installed}
                                dense
                            />
                            {errors.quantity_installed && (
                                <Text style={[Typography.bodyXs, { color: theme.colors.error, marginTop: 4 }]}>
                                    {errors.quantity_installed}
                                </Text>
                            )}
                        </View>
                        <View style={{ flex: 1, marginLeft: Spacing[2] }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[1] }}>
                                <Text style={[Typography.labelMd, { color: theme.colors.onSurface }]}>Qty Working</Text>
                                <HelpIcon text={HELP_TEXT.QUANTITY_WORKING} size={14} />
                            </View>
                            <TextInput
                                mode="outlined"
                                keyboardType="numeric"
                                value={inspection.quantity_working?.toString() || ''}
                                onChangeText={(text) => {
                                    validateQuantity(text, 'quantity_working');
                                    onUpdate(asset.id, { ...inspection, quantity_working: Math.floor(parseFloat(text)) || 0 });
                                }}
                                error={!!errors.quantity_working}
                                dense
                            />
                            {errors.quantity_working && (
                                <Text style={[Typography.bodyXs, { color: theme.colors.error, marginTop: 4 }]}>
                                    {errors.quantity_working}
                                </Text>
                            )}
                        </View>
                    </View>
                </View>

                <Divider style={{ marginTop: Spacing[4], marginBottom: Spacing[4] }} />

                {/* ── Photos ───────────────────────────────────────────── */}
                <View style={styles.section}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[2] }}>
                        <Text style={[Typography.labelLg, { color: theme.colors.onSurface }]}>
                            Photos
                        </Text>
                        <HelpIcon text={HELP_TEXT.PHOTOS} />
                    </View>
                    <PhotoPicker
                        photos={inspection.photos || []}
                        onPhotosChange={handlePhotosChange}
                        surveyId={surveyId}
                        assetInspectionId={inspection.id}
                        assetId={asset.id}
                        maxPhotos={10}
                    />
                </View>

                <Divider style={{ marginTop: Spacing[4], marginBottom: Spacing[4] }} />

                {/* ── Remarks ──────────────────────────────────────────── */}
                <View style={styles.section}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[2] }}>
                        <Text style={[Typography.labelLg, { color: theme.colors.onSurface }]}>
                            Remarks
                            {(inspection.overall_condition === 'Unsatisfactory' ||
                              inspection.overall_condition === 'Satisfactory with Comment') && (
                                <Text style={{ color: theme.colors.error }}> *</Text>
                            )}
                        </Text>
                        <HelpIcon text={HELP_TEXT.REMARKS_FIELD} />
                    </View>
                    <TextInput
                        mode="outlined"
                        multiline
                        numberOfLines={3}
                        value={inspection.remarks || ''}
                        onChangeText={(text) => {
                            onUpdate(asset.id, { ...inspection, remarks: text });
                            validateRemarks();
                        }}
                        onBlur={validateRemarks}
                        error={!!errors.remarks}
                        placeholder="Enter any observations or comments..."
                    />
                    {errors.remarks && (
                        <Text style={[Typography.bodyXs, { color: theme.colors.error, marginTop: 4 }]}>
                            {errors.remarks}
                        </Text>
                    )}
                </View>

                <Divider style={{ marginTop: Spacing[4], marginBottom: Spacing[4] }} />

                {/* ── MAG Comments & Photos ────────────────────────────── */}
                <View style={styles.section}>
                    <Text style={[Typography.labelLg, { color: theme.colors.onSurface, marginBottom: Spacing[2] }]}>
                        MAG Comments
                    </Text>
                    <TextInput
                        mode="outlined"
                        multiline
                        numberOfLines={3}
                        value={inspection.mag_review?.comments || ''}
                        onChangeText={(text) => onUpdate(asset.id, { ...inspection, mag_review: { ...(inspection.mag_review || {}), comments: text } })}
                        placeholder="Enter MAG review comments..."
                    />
                    <Text style={[Typography.labelMd, { color: theme.colors.onSurface, marginTop: Spacing[3], marginBottom: Spacing[2] }]}>
                        MAG Pictures
                    </Text>
                    <PhotoPicker
                        photos={inspection.mag_review?.photos || []}
                        onPhotosChange={(photos) => onUpdate(asset.id, { ...inspection, mag_review: { ...(inspection.mag_review || {}), photos } })}
                        surveyId={surveyId}
                        assetInspectionId={inspection.id}
                        assetId={asset.id}
                        maxPhotos={5}
                    />
                </View>

                <Divider style={{ marginTop: Spacing[4], marginBottom: Spacing[4] }} />

                {/* ── CIT Verification ─────────────────────────────────── */}
                <View style={styles.section}>
                    <Text style={[Typography.labelLg, { color: theme.colors.onSurface, marginBottom: Spacing[2] }]}>
                        CIT Verification / Comments
                    </Text>
                    <TextInput
                        mode="outlined"
                        multiline
                        numberOfLines={3}
                        value={inspection.cit_review?.comments || ''}
                        onChangeText={(text) => onUpdate(asset.id, { ...inspection, cit_review: { ...(inspection.cit_review || {}), comments: text } })}
                        placeholder="Enter CIT verification comments..."
                    />
                </View>

                <Divider style={{ marginTop: Spacing[4], marginBottom: Spacing[4] }} />

                {/* ── DGDA Comments ─────────────────────────────────────── */}
                <View style={styles.section}>
                    <Text style={[Typography.labelLg, { color: theme.colors.onSurface, marginBottom: Spacing[2] }]}>
                        DGDA Comments
                    </Text>
                    <TextInput
                        mode="outlined"
                        multiline
                        numberOfLines={3}
                        value={inspection.dgda_review?.comments || ''}
                        onChangeText={(text) => onUpdate(asset.id, { ...inspection, dgda_review: { ...(inspection.dgda_review || {}), comments: text } })}
                        placeholder="Enter DGDA comments..."
                    />
                </View>

                {/* ── GPS ──────────────────────────────────────────────── */}
                <View style={styles.section}>
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            {inspection.gps_lat && inspection.gps_lng ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <MaterialCommunityIcons
                                        name="map-marker-check"
                                        size={14}
                                        color={Colors.status.successGreen}
                                        style={{ marginRight: 5 }}
                                    />
                                    <Text style={[Typography.mono, { color: Colors.status.successGreen }]}>
                                        {inspection.gps_lat.toFixed(6)}, {inspection.gps_lng.toFixed(6)}
                                    </Text>
                                </View>
                            ) : (
                                <Text style={[Typography.bodyXs, { color: theme.colors.onSurfaceVariant }]}>
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
                            style={{ borderRadius: Radius.sm }}
                        >
                            {inspection.gps_lat ? 'Update GPS' : 'Capture GPS'}
                        </Button>
                    </View>
                </View>

            </Card.Content>
        </Card>
    );
};

const styles = StyleSheet.create({
    card: {
        marginVertical: Spacing[2],
        marginHorizontal: Spacing[4],
        borderWidth: 1,
        borderRadius: Radius.lg,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing[4],
    },
    assetMeta: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: Spacing[2],
    },
    section: {},
    ratingGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing[2],
    },
    ratingButton: {
        minWidth: 45,
        borderRadius: Radius.sm,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});

export default React.memo(AssetInspectionCard);
