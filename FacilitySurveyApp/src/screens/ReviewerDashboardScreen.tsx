import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Surface, useTheme, Searchbar, Chip, FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { surveyService } from '../services/surveyService';

export default function ReviewerDashboardScreen() {
    const theme = useTheme();
    const navigation = useNavigation<any>();
    const [surveys, setSurveys] = useState<any[]>([]);
    const [filteredSurveys, setFilteredSurveys] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAssignedSurveys();
    }, []);

    useEffect(() => {
        filterSurveys();
    }, [surveys, searchQuery, statusFilter]);

    const loadAssignedSurveys = async () => {
        try {
            setLoading(true);
            // Get surveys assigned to this reviewer
            const data = await surveyService.getSurveys('submitted');
            setSurveys(data);
        } catch (error) {
            console.error('Failed to load surveys:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterSurveys = () => {
        let filtered = [...surveys];

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(s =>
                s.site_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.trade?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(s => s.status === statusFilter);
        }

        setFilteredSurveys(filtered);
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const colors: any = {
            submitted: { bg: '#fffbeb', text: '#f59e0b', border: '#f59e0b' },
            under_review: { bg: '#dbeafe', text: '#3b82f6', border: '#3b82f6' },
            completed: { bg: '#ecfdf5', text: '#22c55e', border: '#22c55e' },
        };

        const color = colors[status] || colors.submitted;

        return (
            <View style={{
                backgroundColor: color.bg,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: color.border
            }}>
                <Text style={{ color: color.text, fontSize: 10, fontWeight: '700' }}>
                    {status.toUpperCase().replace('_', ' ')}
                </Text>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.colors.onBackground }]}>
                    Assigned Reviews
                </Text>
                <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                    {filteredSurveys.length} surveys
                </Text>
            </View>

            {/* Search */}
            <Searchbar
                placeholder="Search surveys..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchBar}
            />

            {/* Status Filters */}
            <View style={styles.filterRow}>
                <Chip
                    selected={statusFilter === 'all'}
                    onPress={() => setStatusFilter('all')}
                    style={styles.chip}
                >
                    All
                </Chip>
                <Chip
                    selected={statusFilter === 'submitted'}
                    onPress={() => setStatusFilter('submitted')}
                    style={styles.chip}
                >
                    Pending
                </Chip>
                <Chip
                    selected={statusFilter === 'under_review'}
                    onPress={() => setStatusFilter('under_review')}
                    style={styles.chip}
                >
                    In Review
                </Chip>
                <Chip
                    selected={statusFilter === 'completed'}
                    onPress={() => setStatusFilter('completed')}
                    style={styles.chip}
                >
                    Completed
                </Chip>
            </View>

            {/* Survey List */}
            <FlatList
                data={filteredSurveys}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('ReviewSurvey', { surveyId: item.id })}
                            style={styles.cardContent}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.siteName, { color: theme.colors.onSurface }]}>
                                    {item.site_name}
                                </Text>
                                <Text style={[styles.details, { color: theme.colors.onSurfaceVariant }]}>
                                    {item.trade} • {item.surveyor_name}
                                </Text>
                                <Text style={[styles.date, { color: theme.colors.onSurfaceVariant }]}>
                                    Submitted: {new Date(item.submitted_at).toLocaleDateString()}
                                </Text>
                            </View>
                            <StatusBadge status={item.status} />
                        </TouchableOpacity>
                    </Surface>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={{ color: theme.colors.onSurfaceVariant }}>
                            No surveys assigned
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    header: {
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 14,
        marginTop: 4,
    },
    searchBar: {
        marginBottom: 16,
        borderRadius: 12,
    },
    filterRow: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 8,
    },
    chip: {
        marginRight: 8,
    },
    listContent: {
        paddingBottom: 20,
    },
    card: {
        marginBottom: 12,
        borderRadius: 16,
        overflow: 'hidden',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    siteName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    details: {
        fontSize: 14,
        marginBottom: 2,
    },
    date: {
        fontSize: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
    },
});
