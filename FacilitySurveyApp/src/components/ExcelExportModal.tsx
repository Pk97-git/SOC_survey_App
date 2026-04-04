import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Portal, Dialog, Button, Text, Checkbox, Divider, Chip, useTheme, TextInput } from 'react-native-paper';
import { Typography, Spacing, Radius } from '../constants/design';

interface ExcelExportModalProps {
    visible: boolean;
    onDismiss: () => void;
    onExport: (options: ExportOptions) => void;
    loading?: boolean;
}

export interface ExportOptions {
    exportType: 'standard' | 'custom';
    customColumns?: string[];
}

// Predefined additional columns that users can add
const AVAILABLE_COLUMNS = [
    { id: 'warranty_expiry', label: 'Warranty Expiry Date', description: 'When warranty expires' },
    { id: 'last_maintenance', label: 'Last Maintenance Date', description: 'Date of last service' },
    { id: 'next_maintenance', label: 'Next Maintenance Date', description: 'Scheduled next service' },
    { id: 'manufacturer', label: 'Manufacturer', description: 'Equipment manufacturer' },
    { id: 'model_number', label: 'Model Number', description: 'Model/serial number' },
    { id: 'installation_date', label: 'Installation Date', description: 'When asset was installed' },
    { id: 'estimated_life', label: 'Estimated Life (years)', description: 'Expected lifespan' },
    { id: 'replacement_cost', label: 'Replacement Cost', description: 'Cost to replace' },
    { id: 'criticality', label: 'Criticality Level', description: 'How critical is this asset' },
    { id: 'location_details', label: 'Detailed Location', description: 'Specific location within building' },
    { id: 'responsible_person', label: 'Responsible Person', description: 'Who manages this asset' },
    { id: 'responsible_contact', label: 'Contact Number', description: 'Contact for asset owner' },
    { id: 'additional_notes', label: 'Additional Notes', description: 'Extra information' },
];

export const ExcelExportModal: React.FC<ExcelExportModalProps> = ({
    visible,
    onDismiss,
    onExport,
    loading = false
}) => {
    const theme = useTheme();
    const [exportType, setExportType] = useState<'standard' | 'custom'>('standard');
    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const toggleColumn = (columnId: string) => {
        if (selectedColumns.includes(columnId)) {
            setSelectedColumns(selectedColumns.filter(id => id !== columnId));
        } else {
            setSelectedColumns([...selectedColumns, columnId]);
        }
    };

    const handleExport = () => {
        onExport({
            exportType,
            customColumns: exportType === 'custom' ? selectedColumns : undefined
        });
    };

    const filteredColumns = AVAILABLE_COLUMNS.filter(col =>
        col.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        col.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Portal>
            <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
                <Dialog.Title>
                    <Text style={[Typography.h3, { color: theme.colors.onSurface }]}>
                        Excel Export Options
                    </Text>
                </Dialog.Title>

                <Dialog.ScrollArea style={styles.scrollArea}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Export Type Selection */}
                        <View style={styles.section}>
                            <Text style={[Typography.h4, { color: theme.colors.onSurface, marginBottom: Spacing[3] }]}>
                                Export Type
                            </Text>

                            {/* Standard Export */}
                            <View style={[styles.optionCard, { backgroundColor: theme.colors.surfaceVariant }]}>
                                <View style={styles.optionHeader}>
                                    <Checkbox.Android
                                        status={exportType === 'standard' ? 'checked' : 'unchecked'}
                                        onPress={() => setExportType('standard')}
                                        color={theme.colors.primary}
                                    />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[Typography.labelLg, { color: theme.colors.onSurface }]}>
                                            Standard Export
                                        </Text>
                                        <Text style={[Typography.bodyMd, { color: theme.colors.onSurfaceVariant, marginTop: Spacing[1] }]}>
                                            Export with default columns as per template format
                                        </Text>
                                    </View>
                                </View>
                                <Chip icon="check-circle" style={{ alignSelf: 'flex-start', marginTop: Spacing[2] }}>
                                    Recommended
                                </Chip>
                            </View>

                            {/* Custom Export */}
                            <View style={[styles.optionCard, { backgroundColor: theme.colors.surfaceVariant, marginTop: Spacing[3] }]}>
                                <View style={styles.optionHeader}>
                                    <Checkbox.Android
                                        status={exportType === 'custom' ? 'checked' : 'unchecked'}
                                        onPress={() => setExportType('custom')}
                                        color={theme.colors.primary}
                                    />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[Typography.labelLg, { color: theme.colors.onSurface }]}>
                                            Custom Export
                                        </Text>
                                        <Text style={[Typography.bodyMd, { color: theme.colors.onSurfaceVariant, marginTop: Spacing[1] }]}>
                                            Add additional columns to the standard export
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Custom Columns Selection */}
                        {exportType === 'custom' && (
                            <>
                                <Divider style={{ marginVertical: Spacing[4] }} />

                                <View style={styles.section}>
                                    <Text style={[Typography.h4, { color: theme.colors.onSurface, marginBottom: Spacing[2] }]}>
                                        Additional Columns
                                    </Text>
                                    <Text style={[Typography.bodyMd, { color: theme.colors.onSurfaceVariant, marginBottom: Spacing[3] }]}>
                                        Select additional columns to include in your export. These will be added after the standard columns.
                                    </Text>

                                    {/* Search */}
                                    <TextInput
                                        mode="outlined"
                                        placeholder="Search columns..."
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        left={<TextInput.Icon icon="magnify" />}
                                        style={{ marginBottom: Spacing[3] }}
                                    />

                                    {/* Selected Count */}
                                    {selectedColumns.length > 0 && (
                                        <Chip
                                            icon="format-columns"
                                            style={{ alignSelf: 'flex-start', marginBottom: Spacing[3] }}
                                        >
                                            {selectedColumns.length} column{selectedColumns.length > 1 ? 's' : ''} selected
                                        </Chip>
                                    )}

                                    {/* Column List */}
                                    {filteredColumns.map((column) => (
                                        <View
                                            key={column.id}
                                            style={[
                                                styles.columnItem,
                                                {
                                                    backgroundColor: selectedColumns.includes(column.id)
                                                        ? theme.colors.primaryContainer
                                                        : theme.colors.surface,
                                                    borderColor: theme.colors.outline
                                                }
                                            ]}
                                        >
                                            <Checkbox.Android
                                                status={selectedColumns.includes(column.id) ? 'checked' : 'unchecked'}
                                                onPress={() => toggleColumn(column.id)}
                                                color={theme.colors.primary}
                                            />
                                            <View style={{ flex: 1 }}>
                                                <Text style={[Typography.labelMd, { color: theme.colors.onSurface }]}>
                                                    {column.label}
                                                </Text>
                                                <Text style={[Typography.bodyXs, { color: theme.colors.onSurfaceVariant, marginTop: 2 }]}>
                                                    {column.description}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}

                                    {filteredColumns.length === 0 && (
                                        <Text style={[Typography.bodyMd, { color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: Spacing[4] }]}>
                                            No columns match "{searchQuery}"
                                        </Text>
                                    )}
                                </View>
                            </>
                        )}
                    </ScrollView>
                </Dialog.ScrollArea>

                <Dialog.Actions>
                    <Button onPress={onDismiss} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        mode="contained"
                        onPress={handleExport}
                        loading={loading}
                        disabled={loading}
                    >
                        Export Excel
                    </Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
};

const styles = StyleSheet.create({
    dialog: {
        maxWidth: 600,
        alignSelf: 'center',
        maxHeight: '90%',
    },
    scrollArea: {
        maxHeight: 500,
        paddingHorizontal: 0,
    },
    section: {
        paddingHorizontal: Spacing[6],
    },
    optionCard: {
        padding: Spacing[4],
        borderRadius: Radius.md,
    },
    optionHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing[2],
    },
    columnItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing[2],
        padding: Spacing[3],
        borderRadius: Radius.sm,
        borderWidth: 1,
        marginBottom: Spacing[2],
    },
});
