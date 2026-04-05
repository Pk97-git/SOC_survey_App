import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Portal, Dialog, TextInput, Button, Text, useTheme } from 'react-native-paper';

export interface NewAssetData {
    ref_code: string;
    asset_name: string;
    description?: string;
    building?: string;
    location?: string;
    service_line: string;
    age?: string;
}

interface AddAssetModalProps {
    visible: boolean;
    onDismiss: () => void;
    onSave: (assetData: NewAssetData) => void;
    siteId: string;
    siteName: string;
    defaultLocation?: string;
    defaultServiceLine?: string;
}

export const AddAssetModal: React.FC<AddAssetModalProps> = ({
    visible,
    onDismiss,
    onSave,
    siteId,
    siteName,
    defaultLocation = '',
    defaultServiceLine = ''
}) => {
    const theme = useTheme();

    const [refCode, setRefCode] = useState('');
    const [assetName, setAssetName] = useState('');
    const [description, setDescription] = useState('');
    const [building, setBuilding] = useState(defaultLocation);
    const [location, setLocation] = useState('');
    const [serviceLine, setServiceLine] = useState(defaultServiceLine);
    const [age, setAge] = useState('');

    const resetForm = () => {
        setRefCode('');
        setAssetName('');
        setDescription('');
        setBuilding(defaultLocation);
        setLocation('');
        setServiceLine(defaultServiceLine);
        setAge('');
    };

    const handleSave = () => {
        if (!refCode.trim() || !assetName.trim() || !serviceLine.trim()) {
            return; // Validation - required fields
        }

        const assetData: NewAssetData = {
            ref_code: refCode.trim(),
            asset_name: assetName.trim(),
            description: description.trim() || undefined,
            building: building.trim() || undefined,
            location: location.trim() || undefined,
            service_line: serviceLine.trim(),
            age: age.trim() || undefined
        };

        onSave(assetData);
        resetForm();
    };

    const handleCancel = () => {
        resetForm();
        onDismiss();
    };

    const isValid = refCode.trim() && assetName.trim() && serviceLine.trim();

    return (
        <Portal>
            <Dialog visible={visible} onDismiss={handleCancel} style={{ maxHeight: '90%' }}>
                <Dialog.Title>Add New Asset</Dialog.Title>
                <Dialog.ScrollArea>
                    <ScrollView>
                        <View style={{ paddingHorizontal: 24 }}>
                            {/* Site Info (Read-only) */}
                            <Text style={styles.infoText}>Site: {siteName}</Text>

                            {/* Ref Code - Required */}
                            <TextInput
                                mode="outlined"
                                label="Reference Code *"
                                placeholder="e.g., SS-001, HVAC-101"
                                value={refCode}
                                onChangeText={setRefCode}
                                style={styles.input}
                                autoFocus
                            />

                            {/* Asset Name - Required */}
                            <TextInput
                                mode="outlined"
                                label="Asset Name *"
                                placeholder="e.g., Lobby Cleaning"
                                value={assetName}
                                onChangeText={setAssetName}
                                style={styles.input}
                            />

                            {/* Description */}
                            <TextInput
                                mode="outlined"
                                label="Description"
                                placeholder="Additional details..."
                                value={description}
                                onChangeText={setDescription}
                                style={styles.input}
                                multiline
                                numberOfLines={2}
                            />

                            {/* Building/Floor */}
                            <TextInput
                                mode="outlined"
                                label="Building / Floor"
                                placeholder="e.g., Main Building"
                                value={building}
                                onChangeText={setBuilding}
                                style={styles.input}
                            />

                            {/* Location/Area */}
                            <TextInput
                                mode="outlined"
                                label="Location / Area"
                                placeholder="e.g., North Wing"
                                value={location}
                                onChangeText={setLocation}
                                style={styles.input}
                            />

                            {/* Service Line - Required */}
                            <TextInput
                                mode="outlined"
                                label="Service Line *"
                                placeholder="e.g., SOFT SERVICES"
                                value={serviceLine}
                                onChangeText={setServiceLine}
                                style={styles.input}
                            />

                            {/* Age */}
                            <TextInput
                                mode="outlined"
                                label="Age (years)"
                                placeholder="e.g., 5"
                                value={age}
                                onChangeText={setAge}
                                style={styles.input}
                                keyboardType="numeric"
                            />

                            <Text style={styles.requiredNote}>* Required fields</Text>
                        </View>
                    </ScrollView>
                </Dialog.ScrollArea>
                <Dialog.Actions>
                    <Button onPress={handleCancel}>Cancel</Button>
                    <Button
                        mode="contained"
                        onPress={handleSave}
                        disabled={!isValid}
                    >
                        Add Asset
                    </Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
};

const styles = StyleSheet.create({
    input: {
        marginBottom: 16,
        backgroundColor: 'transparent'
    },
    infoText: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 16,
        opacity: 0.7
    },
    requiredNote: {
        fontSize: 12,
        fontStyle: 'italic',
        opacity: 0.6,
        marginTop: 8,
        marginBottom: 16
    }
});
