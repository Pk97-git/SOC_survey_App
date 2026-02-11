import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme, Surface, IconButton, List, Divider, Appbar, Menu } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { DataTable, Modal, Portal, Button as PaperButton } from 'react-native-paper';


// Root directory for saved reports
const REPORTS_DIR = FileSystem.documentDirectory + 'SavedReports/';

interface FileItem {
    name: string;
    isDirectory: boolean;
    path: string;
    size?: number;
    modificationTime?: number;
}

export default function SavedReportsScreen() {
    const theme = useTheme();
    const navigation = useNavigation();

    // Current path relative to REPORTS_DIR
    const [currentPath, setCurrentPath] = useState('');
    const [items, setItems] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(false);

    // Preview State
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewData, setPreviewData] = useState<any[][]>([]);
    const [previewTitle, setPreviewTitle] = useState('');
    const [parsing, setParsing] = useState(false);

    useEffect(() => {
        ensureDirectoryExists();
        loadDir(currentPath);
    }, [currentPath]);

    const ensureDirectoryExists = async () => {
        const dirInfo = await FileSystem.getInfoAsync(REPORTS_DIR);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(REPORTS_DIR, { intermediates: true });
        }
    };

    const loadDir = async (relativePath: string) => {
        setLoading(true);
        try {
            const absolutePath = REPORTS_DIR + relativePath;
            const dirContents = await FileSystem.readDirectoryAsync(absolutePath);

            const fileItems: FileItem[] = [];

            for (const item of dirContents) {
                if (item === '.DS_Store') continue;

                const itemPath = absolutePath + (relativePath ? '/' : '') + item;
                const info = await FileSystem.getInfoAsync(itemPath); // Works with full path

                fileItems.push({
                    name: item,
                    isDirectory: info.isDirectory,
                    path: relativePath ? `${relativePath}/${item}` : item,
                    size: info.exists ? info.size : 0,
                    modificationTime: info.exists ? info.modificationTime : 0
                });
            }

            // Sort: Directories first, then files. Alphabetical.
            fileItems.sort((a, b) => {
                if (a.isDirectory === b.isDirectory) {
                    return a.name.localeCompare(b.name);
                }
                return a.isDirectory ? -1 : 1;
            });

            setItems(fileItems);
        } catch (error) {
            console.error('Error reading directory:', error);
            Alert.alert('Error', 'Failed to load files.');
        } finally {
            setLoading(false);
        }
    };

    const handleItemPress = async (item: FileItem) => {
        if (item.isDirectory) {
            setCurrentPath(item.path);
        } else {
            handlePreview(item);
        }
    };

    const handlePreview = async (item: FileItem) => {
        setParsing(true);
        try {
            const uri = REPORTS_DIR + item.path;
            const fileContent = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
            const workbook = XLSX.read(fileContent, { type: 'base64' });

            if (workbook.SheetNames.length > 0) {
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

                // Extract Header Info (Rows 0-2)
                // Extract Header Info (Rows 0-2)
                // A1, B1, A2, B2, A3, B3
                const locLabel = jsonData[0] && jsonData[0][0] ? String(jsonData[0][0]) : '';
                const locVal = jsonData[0] && jsonData[0][1] ? String(jsonData[0][1]) : '';

                const tradeLabel = jsonData[1] && jsonData[1][0] ? String(jsonData[1][0]) : '';
                const tradeVal = jsonData[1] && jsonData[1][1] ? String(jsonData[1][1]) : '';

                const dateLabel = jsonData[2] && jsonData[2][0] ? String(jsonData[2][0]) : '';
                const dateVal = jsonData[2] && jsonData[2][1] ? String(jsonData[2][1]) : '';

                const headerInfo = [
                    `${locLabel} ${locVal}`,
                    `${tradeLabel} ${tradeVal}`,
                    `${dateLabel} ${dateVal}`
                ].filter(s => s.trim().length > 0).join('\n');
                setPreviewTitle(headerInfo || item.name);

                // Data starts from Row 3 (Index 3) effectively, but let's just show from Row 3 onwards
                // Row 3: Main Headers, Row 4: Sub Headers, Row 5: Data
                // We'll keep them in the table for alignment
                const tableData = jsonData.slice(3, 53); // Limit to 50 rows from row 3

                setPreviewData(tableData);
                setPreviewVisible(true);
            } else {
                Alert.alert('Error', 'No sheets found in this Excel file.');
            }
        } catch (error) {
            console.error('Error parsing Excel:', error);
            Alert.alert('Error', 'Failed to preview file.');
        } finally {
            setParsing(false);
        }
    };

    const handleShare = async (item: FileItem) => {
        const uri = REPORTS_DIR + item.path;
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri);
        }
    };

    const handleBackPress = () => {
        if (currentPath === '') {
            navigation.goBack();
        } else {
            // Go up one level
            const parts = currentPath.split('/');
            parts.pop();
            setCurrentPath(parts.join('/'));
        }
    };

    const handleDelete = (item: FileItem) => {
        Alert.alert(
            'Delete',
            `Are you sure you want to delete "${item.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const uri = REPORTS_DIR + item.path;
                            await FileSystem.deleteAsync(uri);
                            loadDir(currentPath); // Refresh
                        } catch (e) {
                            console.error('Delete failed:', e);
                            Alert.alert('Error', 'Failed to delete item.');
                        }
                    }
                }
            ]
        );
    };

    const getBreadcrumbs = () => {
        if (!currentPath) return 'Saved Reports';
        // Replace slashes with arrows for display
        return `Saved Reports > ${currentPath.split('/').join(' > ')}`;
    };

    const renderItem = ({ item }: { item: FileItem }) => (
        <List.Item
            title={item.name}
            description={!item.isDirectory && item.size ? `${(item.size / 1024).toFixed(1)} KB` : undefined}
            left={props => <List.Icon {...props} icon={item.isDirectory ? 'folder' : 'file-excel'} color={item.isDirectory ? theme.colors.primary : '#107c41'} />}
            right={props => (
                <View style={{ flexDirection: 'row' }}>
                    {!item.isDirectory && (
                        <>
                            <IconButton icon="eye" onPress={() => handlePreview(item)} iconColor={theme.colors.primary} />
                            <IconButton icon="share-variant" onPress={() => handleShare(item)} iconColor={theme.colors.secondary} />
                        </>
                    )}
                    <IconButton
                        {...props}
                        icon="delete-outline"
                        onPress={() => handleDelete(item)}
                        iconColor={theme.colors.error}
                    />
                </View>
            )}
            onPress={() => handleItemPress(item)}
            style={{
                backgroundColor: theme.colors.surface,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.surfaceVariant
            }}
        />
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['left', 'right', 'bottom']}>
            <Appbar.Header style={{ backgroundColor: theme.colors.background }}>
                <Appbar.BackAction onPress={handleBackPress} />
                <Appbar.Content title={currentPath ? (currentPath.split('/').pop() || "Folder") : "Saved Reports"} titleStyle={{ fontSize: 18, fontWeight: 'bold' }} />
                <Appbar.Action icon="reload" onPress={() => loadDir(currentPath)} />
            </Appbar.Header>

            {currentPath !== '' && (
                <Surface style={styles.breadcrumb} elevation={1}>
                    <Text style={{ color: theme.colors.secondary, fontSize: 12 }} numberOfLines={1}>
                        {getBreadcrumbs()}
                    </Text>
                </Surface>
            )}

            <FlatList
                data={items}
                keyExtractor={item => item.path}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={{ color: theme.colors.secondary }}>Folder is empty</Text>
                    </View>
                }
            />
            <Portal>
                <Modal visible={previewVisible} onDismiss={() => setPreviewVisible(false)} contentContainerStyle={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Report Preview</Text>
                        <IconButton icon="close" onPress={() => setPreviewVisible(false)} />
                    </View>
                    <View style={{ padding: 10, backgroundColor: theme.colors.surfaceVariant }}>
                        <Text style={{ fontWeight: 'bold', color: theme.colors.onSurfaceVariant }}>{previewTitle}</Text>
                    </View>
                    <Divider />
                    <ScrollView horizontal>
                        <View>
                            <ScrollView style={{ maxHeight: 500 }}>
                                <DataTable>
                                    {previewData.map((row, rowIndex) => (
                                        <DataTable.Row key={rowIndex}>
                                            {row.map((cell: any, cellIndex: number) => (
                                                <DataTable.Cell key={cellIndex} style={{ width: 100, borderRightWidth: 1, borderRightColor: '#eee' }}>
                                                    <Text numberOfLines={2} style={{ fontSize: 11 }}>{String(cell || '')}</Text>
                                                </DataTable.Cell>
                                            ))}
                                        </DataTable.Row>
                                    ))}
                                </DataTable>
                            </ScrollView>
                        </View>
                    </ScrollView>
                    <Divider />
                    <View style={{ padding: 10, alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: theme.colors.secondary }}>Showing first 50 rows</Text>
                    </View>
                </Modal>
            </Portal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    listContent: { paddingBottom: 20 },
    breadcrumb: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: 'rgba(0,0,0,0.02)',
        marginBottom: 1
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 40
    },
    modalContent: {
        backgroundColor: 'white',
        margin: 20,
        borderRadius: 8,
        paddingBottom: 20
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1
    }
});
