import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface, TouchableRipple, useTheme, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, Radius } from '../constants/design';

const STATUS_LEGEND_KEY = '@statusLegendExpanded';

interface StatusInfo {
    name: string;
    description: string;
    nextAction: string;
    lockInfo?: string;
    icon: string;
}

const STATUS_DESCRIPTIONS: Record<string, StatusInfo> = {
    draft: {
        name: 'Draft',
        description: 'Survey has been created but not yet started',
        nextAction: 'Start filling out asset inspections',
        icon: 'file-document-outline',
    },
    in_progress: {
        name: 'In Progress',
        description: 'Survey is being filled out by the surveyor',
        nextAction: 'Complete all asset inspections and submit',
        icon: 'file-document-edit-outline',
    },
    submitted: {
        name: 'Submitted',
        description: 'Survey has been submitted and is awaiting reviewer approval',
        nextAction: 'Reviewer will approve or return for changes',
        lockInfo: '🔒 Locked for surveyors (admins can still edit)',
        icon: 'file-document-check-outline',
    },
    under_review: {
        name: 'Under Review',
        description: 'Survey is being reviewed by MAG/CIT/DGDA reviewers',
        nextAction: 'Reviewer will approve or return for changes',
        lockInfo: '🔒 Locked for surveyors (admins can still edit)',
        icon: 'magnify',
    },
    completed: {
        name: 'Completed',
        description: 'Survey has been approved and finalized',
        nextAction: 'Export to Excel or archive',
        lockInfo: '🔒 Locked for all users (admins can still edit)',
        icon: 'check-circle-outline',
    },
    rejected: {
        name: 'Returned',
        description: 'Survey was returned by reviewer for corrections',
        nextAction: 'Make requested changes and re-submit',
        icon: 'arrow-u-left-top',
    },
};

interface StatusLegendProps {
    visibleStatuses?: string[];
    compact?: boolean;
}

export const StatusLegend: React.FC<StatusLegendProps> = ({
    visibleStatuses,
    compact = false,
}) => {
    const theme = useTheme();
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        loadExpandedState();
    }, []);

    const loadExpandedState = async () => {
        try {
            const value = await AsyncStorage.getItem(STATUS_LEGEND_KEY);
            if (value !== null) {
                setExpanded(value === 'true');
            }
        } catch (error) {
            console.error('Failed to load status legend state:', error);
        }
    };

    const toggleExpanded = async () => {
        const newValue = !expanded;
        setExpanded(newValue);
        try {
            await AsyncStorage.setItem(STATUS_LEGEND_KEY, newValue.toString());
        } catch (error) {
            console.error('Failed to save status legend state:', error);
        }
    };

    const statusesToShow = visibleStatuses || Object.keys(STATUS_DESCRIPTIONS);

    const StatusBadge = ({ status }: { status: string }) => {
        const style = Colors.surveyStatus[status] ?? Colors.surveyStatus['draft'];
        return (
            <View
                style={[
                    styles.statusBadge,
                    {
                        backgroundColor: style.bg,
                        borderColor: style.border,
                    },
                ]}
            >
                <Text style={[Typography.labelXs, { color: style.text, fontWeight: '700' }]}>
                    {STATUS_DESCRIPTIONS[status]?.name.toUpperCase() || status.toUpperCase()}
                </Text>
            </View>
        );
    };

    return (
        <Surface
            style={[
                styles.container,
                {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant,
                },
            ]}
            elevation={1}
        >
            <TouchableRipple onPress={toggleExpanded} borderless style={{ borderRadius: Radius.md }}>
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View
                            style={[
                                styles.iconBox,
                                { backgroundColor: theme.colors.primaryContainer },
                            ]}
                        >
                            <MaterialCommunityIcons
                                name="information"
                                size={18}
                                color={theme.colors.primary}
                            />
                        </View>
                        <View style={{ marginLeft: Spacing[3], flex: 1 }}>
                            <Text style={[Typography.labelLg, { color: theme.colors.onSurface }]}>
                                Survey Status Guide
                            </Text>
                            {!expanded && (
                                <Text
                                    style={[
                                        Typography.bodyXs,
                                        { color: theme.colors.onSurfaceVariant, marginTop: 2 },
                                    ]}
                                >
                                    Tap to learn about survey statuses
                                </Text>
                            )}
                        </View>
                    </View>
                    <MaterialCommunityIcons
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={theme.colors.onSurfaceVariant}
                    />
                </View>
            </TouchableRipple>

            {expanded && (
                <View style={styles.content}>
                    <Divider style={{ marginBottom: Spacing[3] }} />
                    {statusesToShow.map((status, index) => {
                        const info = STATUS_DESCRIPTIONS[status];
                        if (!info) return null;

                        return (
                            <View key={status} style={{ marginBottom: index < statusesToShow.length - 1 ? Spacing[4] : 0 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[2] }}>
                                    <MaterialCommunityIcons
                                        name={info.icon as any}
                                        size={20}
                                        color={theme.colors.primary}
                                        style={{ marginRight: Spacing[2] }}
                                    />
                                    <StatusBadge status={status} />
                                </View>

                                <Text
                                    style={[
                                        Typography.bodyMd,
                                        { color: theme.colors.onSurface, marginBottom: 4 },
                                    ]}
                                >
                                    {info.description}
                                </Text>

                                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 }}>
                                    <MaterialCommunityIcons
                                        name="arrow-right"
                                        size={14}
                                        color={theme.colors.primary}
                                        style={{ marginRight: 4, marginTop: 2 }}
                                    />
                                    <Text
                                        style={[
                                            Typography.bodyXs,
                                            { color: theme.colors.primary, flex: 1, fontWeight: '600' },
                                        ]}
                                    >
                                        Next: {info.nextAction}
                                    </Text>
                                </View>

                                {info.lockInfo && (
                                    <Text
                                        style={[
                                            Typography.bodyXs,
                                            {
                                                color: theme.colors.error,
                                                marginTop: 4,
                                                fontWeight: '600',
                                            },
                                        ]}
                                    >
                                        {info.lockInfo}
                                    </Text>
                                )}

                                {index < statusesToShow.length - 1 && <Divider style={{ marginTop: Spacing[3] }} />}
                            </View>
                        );
                    })}
                </View>
            )}
        </Surface>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: Radius.md,
        borderWidth: 1,
        marginBottom: Spacing[4],
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing[4],
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: Radius.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        paddingHorizontal: Spacing[4],
        paddingBottom: Spacing[4],
    },
    statusBadge: {
        borderRadius: Radius.xs,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
    },
});
