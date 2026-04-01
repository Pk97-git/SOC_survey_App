import React from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Text, TouchableRipple, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Typography, Spacing, Radius } from '../constants/design';

interface BreadcrumbNavProps {
    path: Array<{ label: string; icon?: string }>;
    onNavigate?: (index: number) => void;
    currentIndex?: number;
}

export const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({
    path,
    onNavigate,
    currentIndex,
}) => {
    const theme = useTheme();
    const activeIndex = currentIndex !== undefined ? currentIndex : path.length - 1;

    // Default icons for each level
    const getDefaultIcon = (index: number): string => {
        if (index === 0) return 'home';
        if (index === 1) return 'office-building';
        if (index === 2) return 'map-marker';
        return 'file-document';
    };

    // Truncate long labels on small screens
    const truncateLabel = (label: string, isActive: boolean): string => {
        if (Platform.OS === 'web') return label;
        const maxLength = isActive ? 25 : 15;
        return label.length > maxLength ? `${label.substring(0, maxLength)}...` : label;
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {path.map((item, index) => {
                    const isActive = index === activeIndex;
                    const isClickable = index < activeIndex && onNavigate;
                    const icon = item.icon || getDefaultIcon(index);

                    return (
                        <View key={index} style={styles.crumbWrapper}>
                            {isClickable ? (
                                <TouchableRipple
                                    onPress={() => onNavigate!(index)}
                                    borderless
                                    style={[styles.crumb, { borderRadius: Radius.sm }]}
                                >
                                    <View style={styles.crumbContent}>
                                        <MaterialCommunityIcons
                                            name={icon as any}
                                            size={16}
                                            color={theme.colors.primary}
                                            style={{ marginRight: 6 }}
                                        />
                                        <Text
                                            style={[
                                                Typography.labelSm,
                                                {
                                                    color: theme.colors.primary,
                                                    fontWeight: '600',
                                                },
                                            ]}
                                        >
                                            {truncateLabel(item.label, isActive)}
                                        </Text>
                                    </View>
                                </TouchableRipple>
                            ) : (
                                <View style={styles.crumb}>
                                    <View style={styles.crumbContent}>
                                        <MaterialCommunityIcons
                                            name={icon as any}
                                            size={16}
                                            color={isActive ? theme.colors.onSurface : theme.colors.onSurfaceVariant}
                                            style={{ marginRight: 6 }}
                                        />
                                        <Text
                                            style={[
                                                Typography.labelSm,
                                                {
                                                    color: isActive ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
                                                    fontWeight: isActive ? '700' : '500',
                                                },
                                            ]}
                                        >
                                            {truncateLabel(item.label, isActive)}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* Chevron separator */}
                            {index < path.length - 1 && (
                                <MaterialCommunityIcons
                                    name="chevron-right"
                                    size={16}
                                    color={theme.colors.onSurfaceVariant}
                                    style={{ marginHorizontal: 4, opacity: 0.5 }}
                                />
                            )}
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderWidth: 1,
        borderRadius: Radius.md,
        paddingVertical: Spacing[2],
        paddingHorizontal: Spacing[3],
        marginBottom: Spacing[4],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    scrollContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    crumbWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    crumb: {
        paddingVertical: 4,
        paddingHorizontal: 6,
    },
    crumbContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
