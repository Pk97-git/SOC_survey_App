import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert, Platform } from 'react-native';
import { Text, Surface, useTheme, TextInput, Button, Divider } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { surveyService } from '../services/surveyService';
import PhotoPicker from '../components/PhotoPicker';
import { useAuth } from '../context/AuthContext';
import * as hybridStorage from '../services/hybridStorage';

export default function ReviewSurveyScreen() {
    const theme = useTheme();
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { surveyId } = route.params;
    const { user } = useAuth(); // Get real user context

    const [survey, setSurvey] = useState<any>(null);
    const [inspections, setInspections] = useState<any[]>([]);
    const [reviewComments, setReviewComments] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Get reviewer type dynamically. Default to 'Reviewer' if role is generic.
    // If you have specific organizations (MAG, CIT, DGDA), derive it here.
    // For now, we simply capitalize the role or use a preset if available in user metadata.
    const reviewerType = user?.role ? user.role.toUpperCase() : 'REVIEWER';

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

                let parsedPhotos = [];
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

    const handleSaveReview = async (isSubmittingAndChecking: boolean = false) => {
        try {
            setSaving(true);
            const reviewsToSave = Object.keys(reviewComments).map(inspectionId => ({
                inspectionId,
                notes: reviewComments[inspectionId].comments,
                reviewerRole: reviewerType,
                photos: reviewComments[inspectionId].photos
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
            if (!isSubmittingAndChecking) {
                if (Platform.OS === 'web') {
                    window.alert("Failed to save draft. Please try again.");
                } else {
                    Alert.alert("Error", "Failed to save draft. Please try again.");
                }
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
                // First save the reviews
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

                            {reviewerType === 'MAG' && (
                                <View style={{ marginTop: 12 }}>
                                    <Text style={[styles.label, { color: theme.colors.onSurface, marginBottom: 8 }]}>
                                        MAG Pictures:
                                    </Text>
                                    <PhotoPicker
                                        photos={reviewComments[inspection.id]?.photos || []}
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
                            )}
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
