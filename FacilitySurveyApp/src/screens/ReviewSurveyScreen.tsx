import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert, Platform, Modal } from 'react-native';
import { Text, Surface, useTheme, TextInput, Button, Divider, ProgressBar } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { surveyService } from '../services/surveyService';
import PhotoPicker from '../components/PhotoPicker';
import { useAuth } from '../context/AuthContext';
import * as hybridStorage from '../services/hybridStorage';
import { photoService } from '../services/photoService';

export default function ReviewSurveyScreen() {
    const theme = useTheme();
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { surveyId } = route.params;
    const { user } = useAuth();

    const [survey, setSurvey] = useState<any>(null);
    const [inspections, setInspections] = useState<any[]>([]);
    const [reviewComments, setReviewComments] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadStatus, setUploadStatus] = useState({ total: 0, completed: 0, failed: 0 });
    const [showUploadModal, setShowUploadModal] = useState(false);

    // Reviewer type is determined by the user's organization (MAG / CIT / DGDA),
    // which is set by an Admin when the reviewer account is created.
    // Falls back to 'MAG' if not set so the review_comments CHECK constraint is satisfied.
    const reviewerType = (user?.organization?.toUpperCase() as 'MAG' | 'CIT' | 'DGDA') || 'MAG';

    useEffect(() => {
        loadSurveyData();
    }, [surveyId]);

    const loadSurveyData = async () => {
        try {
            setLoading(true);
            const surveyData = await surveyService.getSurveyById(surveyId);
            const inspectionsData = await surveyService.getInspections(surveyId);
            const existingReviews = await surveyService.getReviews(surveyId) || [];

            setSurvey(surveyData);
            setInspections(inspectionsData);

            // Initialize review comments with existing data
            const comments: any = {};
            inspectionsData.forEach((inspection: any) => {
                const review = existingReviews.find((r: any) => r.asset_inspection_id === inspection.id && r.reviewer_type?.toUpperCase() === reviewerType);

                let parsedPhotos: string[] = [];
                if (review?.photos) {
                    try {
                        parsedPhotos = typeof review.photos === 'string' ? JSON.parse(review.photos) : review.photos;
                    } catch (e) {
                        parsedPhotos = [];
                    }
                }

                comments[inspection.id] = {
                    comments: review?.comments || '',
                    photos: parsedPhotos,
                };
            });
            setReviewComments(comments);
        } catch (error) {
            console.error('Failed to load survey:', error);
            Alert.alert("Error", "Failed to load survey data");
        } finally {
            setLoading(false);
        }
    };

    // ── Upload-sync-aware save ──────────────────────────────────────────
    const handleSaveReview = async (isSubmittingAndChecking: boolean = false) => {
        try {
            setSaving(true);

            // --- 1. Count pending local photos ---
            const isLocalUri = (p: string) =>
                p.startsWith('blob:') || p.startsWith('data:') || p.startsWith('file:');

            let totalToUpload = 0;
            Object.values(reviewComments).forEach((r: any) => {
                if (r.photos) {
                    totalToUpload += r.photos.filter((p: string) => isLocalUri(p)).length;
                }
            });

            // Show progress modal only when there are pending uploads
            if (totalToUpload > 0) {
                setShowUploadModal(true);
                setUploadStatus({ total: totalToUpload, completed: 0, failed: 0 });
            }

            // --- 2. Sequential upload loop with per-photo progress ---
            const updatedReviewComments = { ...reviewComments };
            let currentCompleted = 0;

            for (const inspectionId of Object.keys(updatedReviewComments)) {
                const photos: string[] = updatedReviewComments[inspectionId].photos || [];
                const hasLocalPhotos = photos.some(isLocalUri);
                if (!hasLocalPhotos) continue;

                const result: string[] = [];
                for (const uri of photos) {
                    if (isLocalUri(uri)) {
                        try {
                            const uploaded = await photoService.uploadPhoto(inspectionId, surveyId, uri);
                            result.push(uploaded.file_path);
                            currentCompleted++;
                            setUploadStatus(prev => ({ ...prev, completed: currentCompleted }));
                        } catch (err) {
                            console.error(`Review photo upload failed for ${inspectionId}:`, err);
                            setUploadStatus(prev => ({ ...prev, failed: prev.failed + 1 }));
                            result.push(uri); // keep local URI for retry
                        }
                    } else {
                        result.push(uri);
                    }
                }
                updatedReviewComments[inspectionId].photos = result;
            }

            setReviewComments(updatedReviewComments);
            setShowUploadModal(false);

            // --- 3. Strict check – block if any uploads failed ---
            if (currentCompleted < totalToUpload) {
                const failed = totalToUpload - currentCompleted;
                Alert.alert(
                    "Upload Incomplete",
                    `${failed} photo(s) failed to upload. Please check your internet connection and try again.`
                );
                return false;
            }

            // --- 4. Persist reviews to server ---
            const reviewsToSave = Object.keys(updatedReviewComments).map(inspectionId => ({
                inspectionId,
                notes: updatedReviewComments[inspectionId].comments,
                reviewerRole: reviewerType,
                photos: updatedReviewComments[inspectionId].photos
            }));

            await surveyService.submitReviews(surveyId, reviewsToSave);

            if (!isSubmittingAndChecking) {
                if (Platform.OS === 'web') {
                    window.alert("Draft saved successfully!");
                    navigation.goBack();
                } else {
                    Alert.alert("Success", "Draft saved successfully!", [{ text: "OK", onPress: () => navigation.goBack() }]);
                }
            }
            return true;
        } catch (error) {
            console.error('Failed to save review:', error);
            setShowUploadModal(false);
            if (!isSubmittingAndChecking) {
                Alert.alert("Error", "Failed to save draft. Please try again.");
            }
            return false;
        } finally {
            setSaving(false);
        }
    };

    const handleAction = async (action: 'approve' | 'reject') => {
        const title = action === 'approve' ? 'Approve Survey' : 'Return Survey';
        const msg = action === 'approve'
            ? 'Are you sure you want to approve this survey? It will be marked as Completed.'
            : 'Are you sure you want to return this survey to the surveyor? It will be marked as In Progress.';

        const executeAction = async () => {
            setSaving(true);
            try {
                // First save the reviews (with upload sync)
                const saved = await handleSaveReview(true);
                if (!saved) {
                    setSaving(false);
                    return;
                }

                // Then update the status
                const newStatus = action === 'approve' ? 'completed' : 'in_progress';
                await hybridStorage.updateSurvey(surveyId, { status: newStatus });

                if (Platform.OS === 'web') {
                    window.alert(`Survey ${action === 'approve' ? 'Approved' : 'Returned'} successfully!`);
                    navigation.goBack();
                } else {
                    Alert.alert("Success", `Survey ${action === 'approve' ? 'Approved' : 'Returned'}!`, [
                        { text: "OK", onPress: () => navigation.goBack() }
                    ]);
                }
            } catch (e) {
                console.error(`Failed to ${action} survey:`, e);
                if (Platform.OS === 'web') {
                    window.alert(`Failed to ${action} survey.`);
                } else {
                    Alert.alert("Error", `Failed to ${action} survey.`);
                }
            } finally {
                setSaving(false);
            }
        };

        if (Platform.OS === 'web') {
            const confirmed = window.confirm(msg);
            if (confirmed) executeAction();
        } else {
            Alert.alert(title, msg, [
                { text: 'Cancel', style: 'cancel' },
                { text: action === 'approve' ? 'Approve' : 'Return', style: action === 'reject' ? 'destructive' : 'default', onPress: executeAction }
            ]);
        }
    };

    const updateComment = (inspectionId: string, text: string) => {
        setReviewComments({
            ...reviewComments,
            [inspectionId]: {
                ...reviewComments[inspectionId],
                comments: text,
            },
        });
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <Text>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <Surface style={[styles.header, { backgroundColor: theme.colors.tertiaryContainer }]} elevation={2}>
                <Text style={[styles.title, { color: theme.colors.onTertiaryContainer }]}>
                    Review Survey
                </Text>
                <Text style={[styles.subtitle, { color: theme.colors.onTertiaryContainer, opacity: 0.8 }]}>
                    {survey?.site_name} • {survey?.trade}
                </Text>
                <Text style={[styles.subtitle, { color: theme.colors.onTertiaryContainer, opacity: 0.7 }]}>
                    Surveyor: {survey?.surveyor_name}
                </Text>
            </Surface>

            {/* Inspections List */}
            <FlatList
                data={inspections}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item: inspection }) => (
                    <Surface style={[styles.card, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.outlineVariant }]} elevation={1}>
                        {/* Surveyor Data (Read-only) */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                                Asset: {inspection.asset_name}
                            </Text>
                            <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                                Ref: {inspection.ref_code} • {inspection.service_line}
                            </Text>
                            <Text style={{ color: theme.colors.onSurfaceVariant }}>
                                Floor: {inspection.floor} • Area: {inspection.area}
                            </Text>
                        </View>

                        <Divider style={{ marginVertical: 12 }} />

                        <View style={styles.section}>
                            <Text style={[styles.label, { color: theme.colors.onSurface }]}>
                                Condition Rating:
                            </Text>
                            <Text style={{ color: theme.colors.onSurfaceVariant }}>
                                {inspection.condition_rating || 'N/A'}
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.label, { color: theme.colors.onSurface }]}>
                                Overall Condition:
                            </Text>
                            <Text style={{ color: theme.colors.onSurfaceVariant }}>
                                {inspection.overall_condition || 'N/A'}
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.label, { color: theme.colors.onSurface }]}>
                                Surveyor Remarks:
                            </Text>
                            <Text style={{ color: theme.colors.onSurfaceVariant }}>
                                {inspection.remarks || 'No remarks'}
                            </Text>
                        </View>

                        <Divider style={{ marginVertical: 12 }} />

                        {/* Reviewer Input */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]}>
                                {reviewerType} Review
                            </Text>

                            <TextInput
                                label={`${reviewerType} Comments`}
                                value={reviewComments[inspection.id]?.comments || ''}
                                onChangeText={(text) => updateComment(inspection.id, text)}
                                mode="outlined"
                                multiline
                                numberOfLines={4}
                                style={styles.input}
                            />

                            <View style={{ marginTop: 12 }}>
                                <Text style={[styles.label, { color: theme.colors.onSurface, marginBottom: 8 }]}>
                                    {reviewerType} Pictures:
                                </Text>
                                <PhotoPicker
                                    photos={reviewComments[inspection.id]?.photos || []}
                                    surveyId={surveyId}
                                    assetInspectionId={inspection.id}
                                    assetId={inspection.asset_id}
                                    onPhotosChange={(photos) => {
                                        setReviewComments({
                                            ...reviewComments,
                                            [inspection.id]: {
                                                ...reviewComments[inspection.id],
                                                photos,
                                            },
                                        });
                                    }}
                                    maxPhotos={5}
                                />
                            </View>
                        </View>
                    </Surface>
                )}
            />

            {/* Actions Footer */}
            <View style={[styles.footer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outlineVariant }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                    <Button
                        mode="outlined"
                        onPress={() => handleAction('reject')}
                        style={{ flex: 1, borderColor: theme.colors.error }}
                        textColor={theme.colors.error}
                        disabled={saving}
                        contentStyle={{ height: 48 }}
                    >
                        Return
                    </Button>
                    <Button
                        mode="contained-tonal"
                        onPress={() => handleSaveReview(false)}
                        style={{ flex: 1 }}
                        disabled={saving}
                        loading={saving}
                        contentStyle={{ height: 48 }}
                    >
                        Draft
                    </Button>
                    <Button
                        mode="contained"
                        icon="check"
                        onPress={() => handleAction('approve')}
                        style={{ flex: 1, backgroundColor: theme.colors.primary }}
                        disabled={saving}
                        contentStyle={{ height: 48 }}
                    >
                        Approve
                    </Button>
                </View>
            </View>

            {/* Upload Sync Progress Modal */}
            <Modal
                visible={showUploadModal}
                transparent={true}
                animationType="fade"
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <Surface style={{ width: '100%', padding: 24, borderRadius: 12, alignItems: 'center' }} elevation={4}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Syncing Review Photos...</Text>
                        <Text style={{ marginBottom: 12 }}>
                            {uploadStatus.completed} of {uploadStatus.total} photos uploaded
                        </Text>
                        <ProgressBar
                            progress={uploadStatus.total > 0 ? uploadStatus.completed / uploadStatus.total : 0}
                            color={theme.colors.primary}
                            style={{ width: '100%', height: 10, borderRadius: 5, marginBottom: 20 }}
                        />
                        <Text style={{ marginTop: 8, color: '#FF5722', fontWeight: 'bold', fontSize: 12 }}>
                            Please do not close the app
                        </Text>
                    </Surface>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 20,
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 14,
        marginTop: 4,
    },
    listContent: {
        padding: 20,
        paddingBottom: 100,
    },
    card: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
    },
    section: {
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    label: {
        fontWeight: '600',
        marginBottom: 4,
    },
    input: {
        marginTop: 8,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        borderTopWidth: 1,
    },
    saveButton: {
        borderRadius: 12,
    },
});
