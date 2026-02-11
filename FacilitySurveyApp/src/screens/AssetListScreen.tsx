import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, FAB, useTheme, Card, Avatar, Searchbar, Surface, Chip, IconButton } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { storage } from '../services/storage';

import { importAssetsFromExcel } from '../services/importService';
import { Alert } from 'react-native';

export default function AssetListScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const theme = useTheme();
    const { facility, department } = route.params || {};

    const [assets, setAssets] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadAssets();
        });
        return unsubscribe;
    }, [navigation]);

    const loadAssets = async () => {
        const data = await storage.getAssets();
        setAssets(data);
    };

    const handleImport = async () => {
        setImporting(true);
        try {
            const count = await importAssetsFromExcel();
            if (count && count > 0) {
                Alert.alert("Success", `Successfully imported ${count} assets.`);
                loadAssets(); // Refresh
            }
        } catch (e) {
            // Already handled in service, but ensure loading stops
        } finally {
            setImporting(false);
        }
    };

    const filteredAssets = assets.filter(a =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.project_site.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const AssetCard = ({ item }: { item: any }) => (
        <Surface style={[styles.cardWrapper, { backgroundColor: theme.colors.surface }]} elevation={2}>
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                    navigation.navigate('HomeTab', {
                        screen: 'Survey',
                        params: {
                            templateId: 'default',
                            assetId: item.id
                        }
                    });
                }}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.cardIcon, { backgroundColor: theme.colors.secondaryContainer }]}>
                        <Avatar.Icon size={32} icon="cube-outline" color={theme.colors.primary} style={{ backgroundColor: 'transparent' }} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{item.name}</Text>
                        <Text style={[styles.cardSubtitle, { color: theme.colors.onSurfaceVariant }]}>{item.type || 'General Asset'}</Text>
                    </View>
                    <View>
                        <Chip textStyle={{ fontSize: 10, lineHeight: 12, color: '#166534' }} style={{ height: 24, backgroundColor: '#DCFCE7' }} mode="flat">Active</Chip>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.row}>
                        <Avatar.Icon size={16} icon="map-marker" style={{ backgroundColor: 'transparent' }} color={theme.colors.onSurfaceVariant} />
                        <Text style={[styles.rowText, { color: theme.colors.onSurfaceVariant }]}>{item.project_site}</Text>
                    </View>
                    {item.location_lat && (
                        <View style={[styles.row, { marginTop: 4 }]}>
                            <Avatar.Icon size={16} icon="crosshairs-gps" style={{ backgroundColor: 'transparent' }} color={theme.colors.onSurfaceVariant} />
                            <Text style={[styles.rowText, { color: theme.colors.onSurfaceVariant }]}>{item.location_lat.toFixed(4)}, {item.location_lng.toFixed(4)}</Text>
                        </View>
                    )}
                </View>

                <View style={[styles.cardFooter, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surfaceVariant }]}>
                    <Text style={[styles.footerText, { color: theme.colors.primary }]}>Tap to Start Inspection</Text>
                    <Avatar.Icon size={20} icon="arrow-right" style={{ backgroundColor: 'transparent' }} color={theme.colors.primary} />
                </View>
            </TouchableOpacity>
        </Surface>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Context Header */}
            {facility && (
                <Surface style={{ padding: 16, paddingBottom: 8, backgroundColor: theme.colors.primaryContainer }} elevation={0}>
                    <Text variant="labelMedium" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.7 }}>SURVEYING AREA</Text>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onPrimaryContainer }}>{facility} • {department}</Text>
                </Surface>
            )}

            <View style={{ padding: 16, backgroundColor: theme.colors.background, flexDirection: 'row' }}>
                <Searchbar
                    placeholder="Search assets..."
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={{ flex: 1, backgroundColor: theme.colors.surface, borderRadius: 12 }}
                    inputStyle={{ fontSize: 14, color: theme.colors.onSurface }}
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    iconColor={theme.colors.onSurfaceVariant}
                />
                <Surface style={{ borderRadius: 12, backgroundColor: theme.colors.primaryContainer, justifyContent: 'center', overflow: 'hidden' }} elevation={1}>
                    <IconButton
                        icon="file-excel-box"
                        iconColor={theme.colors.onPrimaryContainer}
                        size={28}
                        onPress={handleImport}
                        loading={importing}
                        disabled={importing}
                    />
                </Surface>
            </View>

            <FlatList
                data={filteredAssets}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 80 }}
                renderItem={({ item }) => <AssetCard item={item} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Avatar.Icon size={64} icon="cube-off-outline" style={{ backgroundColor: theme.colors.surfaceVariant }} color={theme.colors.onSurfaceVariant} />
                        <Text style={{ marginTop: 16, color: theme.colors.onSurfaceVariant }}>No assets found.</Text>
                        <Text style={{ color: theme.colors.onSurfaceVariant }}>Add a new asset manually or Import Excel.</Text>
                    </View>
                }
            />
            <FAB
                icon="plus"
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                color={theme.colors.onPrimary}
                label="New Asset"
                onPress={() => navigation.navigate('AssetForm')}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    cardWrapper: {
        marginBottom: 16,
        borderRadius: 16,
        overflow: 'hidden'
    },
    cardHeader: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center'
    },
    cardIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    cardSubtitle: {
        fontSize: 12,
        marginTop: 2
    },
    cardBody: {
        paddingHorizontal: 16,
        paddingBottom: 16
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    rowText: {
        fontSize: 12,
        marginLeft: 6
    },
    cardFooter: {
        borderTopWidth: 1,
        padding: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        fontWeight: '600'
    },
    empty: {
        alignItems: 'center',
        marginTop: 50
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
        borderRadius: 16
    },
});
