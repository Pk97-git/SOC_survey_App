import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, FlatList } from 'react-native';
import { Text, Surface, useTheme, TextInput, Button, Divider } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { surveyService } from '../services/surveyService';
import PhotoPicker from '../components/PhotoPicker';

export default function ReviewSurveyScreen() {
    const theme = useTheme();
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { surveyId } = route.params;

    const [survey, setSurvey] = useState<any>(null);
    const [inspections, setInspections] = useState<any[]>([]);
    const [reviewComments, setReviewComments] = useState<any>({});
    const [loading, setLoading] = useState(true);

    // Get reviewer type from user context (MAG, CIT, or DGDA)
    const reviewerType = 'MAG'; // This should come from auth context

    useEffect(() => {
        loadSurveyData();
    }, [surveyId]);

    const loadSurveyData = async () => {
        try {
            setLoading(true);
            const surveyData = await surveyService.getSurveyById(surveyId);
            const inspectionsData = await surveyService.getInspections(surveyId);

            setSurvey(surveyData);
            setInspections(inspectionsData);

            // Initialize review comments
            const comments: any = {};
            inspectionsData.forEach((inspection: any) => {
                comments[inspection.id] = {
                    comments: '',
                    photos: [],
                };
            });
            setReviewComments(comments);
        } catch (error) {
            console.error('Failed to load survey:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveReview = async () => {
        try {
            // Save review comments to backend
            // This would call a review API endpoint
            console.log('Saving review:', reviewComments);

            // Navigate back
            navigation.goBack();
        } catch (error) {
            console.error('Failed to save review:', error);
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
            <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]} elevation={2}>
                <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                    Review Survey
                </Text>
                <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                    {survey?.site_name} • {survey?.trade}
                </Text>
                <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                    Surveyor: {survey?.surveyor_name}
                </Text>
            </Surface>

            {/* Inspections List */}
            <FlatList
                data={inspections}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item: inspection }) => (
                    <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
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

            {/* Save Button */}
            <View style={styles.footer}>
                <Button
                    mode="contained"
                    onPress={handleSaveReview}
                    style={styles.saveButton}
                    contentStyle={{ height: 50 }}
                >
                    Save Review
                </Button>
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
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    saveButton: {
        borderRadius: 12,
    },
});
