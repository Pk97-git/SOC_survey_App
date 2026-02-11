import React, { useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { IconButton, useTheme, Text } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

interface PhotoPickerProps {
    photos: string[]; // Array of file URIs
    onPhotosChange: (photos: string[]) => void;
    maxPhotos?: number;
}

export default function PhotoPicker({ photos, onPhotosChange, maxPhotos = 10 }: PhotoPickerProps) {
    const theme = useTheme();
    const [loading, setLoading] = useState(false);

    const requestPermissions = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
            return false;
        }
        return true;
    };

    const compressAndSavePhoto = async (uri: string): Promise<string> => {
        try {
            // Create a unique filename
            const filename = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
            const docDir = FileSystem.documentDirectory || '';
            const directory = `${docDir}photos/`;

            // Ensure directory exists
            const dirInfo = await FileSystem.getInfoAsync(directory);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
            }

            const newPath = directory + filename;

            // Copy/move the photo to our app directory
            await FileSystem.copyAsync({
                from: uri,
                to: newPath
            });

            return newPath;
        } catch (error) {
            console.error('Error saving photo:', error);
            throw error;
        }
    };

    const takePhoto = async () => {
        if (photos.length >= maxPhotos) {
            Alert.alert('Limit Reached', `You can only add up to ${maxPhotos} photos.`);
            return;
        }

        const hasPermission = await requestPermissions();
        if (!hasPermission) return;

        setLoading(true);
        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.8, // Compression as per tech spec
            });

            if (!result.canceled && result.assets[0]) {
                const savedPath = await compressAndSavePhoto(result.assets[0].uri);
                onPhotosChange([...photos, savedPath]);
            }
        } catch (error) {
            console.error('Error taking photo:', error);
            Alert.alert('Error', 'Failed to capture photo');
        } finally {
            setLoading(false);
        }
    };

    const pickFromGallery = async () => {
        if (photos.length >= maxPhotos) {
            Alert.alert('Limit Reached', `You can only add up to ${maxPhotos} photos.`);
            return;
        }

        setLoading(true);
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.8,
                allowsMultipleSelection: true,
            });

            if (!result.canceled) {
                const newPhotos = await Promise.all(
                    result.assets.slice(0, maxPhotos - photos.length).map(asset => compressAndSavePhoto(asset.uri))
                );
                onPhotosChange([...photos, ...newPhotos]);
            }
        } catch (error) {
            console.error('Error picking photo:', error);
            Alert.alert('Error', 'Failed to select photo');
        } finally {
            setLoading(false);
        }
    };

    const removePhoto = (index: number) => {
        Alert.alert(
            'Remove Photo',
            'Are you sure you want to remove this photo?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => {
                        const newPhotos = photos.filter((_, i) => i !== index);
                        onPhotosChange(newPhotos);
                    }
                }
            ]
        );
    };

    const showPhotoOptions = () => {
        Alert.alert(
            'Add Photo',
            'Choose an option',
            [
                { text: 'Take Photo', onPress: takePhoto },
                { text: 'Choose from Gallery', onPress: pickFromGallery },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                {photos.map((uri, index) => (
                    <View key={index} style={styles.photoContainer}>
                        <Image source={{ uri }} style={styles.photo} />
                        <TouchableOpacity
                            style={[styles.removeButton, { backgroundColor: theme.colors.error }]}
                            onPress={() => removePhoto(index)}
                        >
                            <IconButton icon="close" size={16} iconColor="#fff" style={{ margin: 0 }} />
                        </TouchableOpacity>
                    </View>
                ))}

                {photos.length < maxPhotos && (
                    <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: theme.colors.surfaceVariant }]}
                        onPress={showPhotoOptions}
                        disabled={loading}
                    >
                        <IconButton
                            icon="camera-plus"
                            size={32}
                            iconColor={theme.colors.primary}
                            style={{ margin: 0 }}
                        />
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            Add Photo
                        </Text>
                    </TouchableOpacity>
                )}
            </ScrollView>

            {photos.length > 0 && (
                <Text variant="bodySmall" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}>
                    {photos.length} / {maxPhotos} photos
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 8,
    },
    photoScroll: {
        flexDirection: 'row',
    },
    photoContainer: {
        position: 'relative',
        marginRight: 12,
    },
    photo: {
        width: 120,
        height: 120,
        borderRadius: 12,
        backgroundColor: '#f0f0f0',
    },
    removeButton: {
        position: 'absolute',
        top: 4,
        right: 4,
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButton: {
        width: 120,
        height: 120,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e0e0e0',
        borderStyle: 'dashed',
    },
});
