import React, { useState, useCallback } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { IconButton, useTheme, Text, Button, Surface, ProgressBar } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import ImageViewing from 'react-native-image-viewing';
import { photoService } from '../services/photoService';
import { Colors, Radius, Spacing, Typography } from '../constants/design';

interface PhotoPickerProps {
    photos: string[]; // Array of photo IDs (UUIDs)
    onPhotosChange: (photos: string[]) => void;
    surveyId: string;
    assetInspectionId: string;
    assetId?: string;
    maxPhotos?: number;
}

export default function PhotoPicker({
    photos,
    onPhotosChange,
    surveyId,
    assetInspectionId,
    assetId,
    maxPhotos = 10
}: PhotoPickerProps) {
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [lightboxVisible, setLightboxVisible] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    const uploadPhotoToServer = async (uri: string): Promise<string> => {
        try {
            console.log('[PhotoPicker Web] Uploading to server:', uri);
            const uploadedPhoto = await photoService.uploadPhoto(assetInspectionId, surveyId, uri, undefined, assetId);
            console.log('[PhotoPicker Web] Upload success, photo ID:', uploadedPhoto.id);
            return uploadedPhoto.id;
        } catch (error) {
            console.error('[PhotoPicker Web] Upload error:', error);
            throw error;
        }
    };

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (photos.length >= maxPhotos) {
            alert(`Maximum ${maxPhotos} photos allowed`);
            return;
        }

        const files = Array.from(e.dataTransfer.files).filter(file =>
            file.type.startsWith('image/')
        );

        const remaining = maxPhotos - photos.length;
        const filesToAdd = files.slice(0, remaining);

        if (filesToAdd.length > 0) {
            setLoading(true);
            try {
                const uploadPromises = filesToAdd.map(async (file, index) => {
                    const uri = URL.createObjectURL(file);
                    const photoId = await uploadPhotoToServer(uri);
                    setUploadProgress(((index + 1) / filesToAdd.length) * 100);
                    return photoId;
                });

                const newPhotoIds = await Promise.all(uploadPromises);
                onPhotosChange([...photos, ...newPhotoIds]);
            } catch (error) {
                console.error('Error uploading dropped photos:', error);
                alert('Failed to upload photos');
            } finally {
                setLoading(false);
                setUploadProgress(0);
            }
        }
    }, [photos, maxPhotos, onPhotosChange, assetInspectionId, surveyId, assetId]);

    const pickFromGallery = async () => {
        if (photos.length >= maxPhotos) {
            alert(`You can only add up to ${maxPhotos} photos.`);
            return;
        }

        setLoading(true);
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.8,
                allowsMultipleSelection: true,
            });

            if (!result.canceled) {
                const assetsToProcess = result.assets.slice(0, maxPhotos - photos.length);

                const uploadPromises = assetsToProcess.map(async (asset, index) => {
                    const photoId = await uploadPhotoToServer(asset.uri);
                    setUploadProgress(((index + 1) / assetsToProcess.length) * 100);
                    return photoId;
                });

                const newPhotoIds = await Promise.all(uploadPromises);
                onPhotosChange([...photos, ...newPhotoIds]);
            }
        } catch (error) {
            console.error('Error picking photo:', error);
            alert('Failed to select photos');
        } finally {
            setLoading(false);
            setUploadProgress(0);
        }
    };

    const removePhoto = (index: number) => {
        const confirmed = window.confirm('Are you sure you want to remove this photo?');
        if (confirmed) {
            const newPhotos = photos.filter((_, i) => i !== index);
            onPhotosChange(newPhotos);
        }
    };

    const openLightbox = (index: number) => {
        setLightboxIndex(index);
        setLightboxVisible(true);
    };

    const photoImages = photos.map(photoId => ({
        uri: photoService.getPhotoUrl(photoId)
    }));

    const remainingSlots = maxPhotos - photos.length;

    return (
        <View style={styles.container}>
            {/* Drag & Drop Zone */}
            {remainingSlots > 0 && (
                <div
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    style={{ width: '100%', marginBottom: 16 }}
                >
                    <Surface
                        style={[
                            styles.dropZone,
                            {
                                backgroundColor: isDragging
                                    ? theme.colors.primaryContainer
                                    : theme.colors.surfaceVariant,
                                borderColor: isDragging
                                    ? theme.colors.primary
                                    : theme.colors.outline,
                            }
                        ]}
                        elevation={isDragging ? 2 : 0}
                    >
                        <IconButton
                            icon={isDragging ? "download" : "cloud-upload"}
                            size={40}
                            iconColor={theme.colors.primary}
                        />

                        <Text style={[Typography.h4, { color: theme.colors.onSurface, marginTop: Spacing[2] }]}>
                            {isDragging ? 'Drop photos here' : 'Drag & Drop Photos'}
                        </Text>

                        <Text style={[Typography.bodyMd, { color: theme.colors.onSurfaceVariant, marginTop: Spacing[2] }]}>
                            or
                        </Text>

                        <Button
                            mode="contained"
                            onPress={pickFromGallery}
                            style={{ marginTop: Spacing[3] }}
                            icon="folder-open"
                            disabled={loading}
                        >
                            Browse Files
                        </Button>

                        <Text style={[Typography.bodyXs, { color: theme.colors.onSurfaceVariant, marginTop: Spacing[3] }]}>
                            {remainingSlots} of {maxPhotos} photos remaining • Max 10MB per photo
                        </Text>
                    </Surface>
                </div>
            )}

            {/* Upload Progress */}
            {loading && (
                <View style={styles.progressContainer}>
                    <Text style={[Typography.bodyMd, { color: theme.colors.primary, marginBottom: Spacing[2] }]}>
                        Uploading photos... {Math.round(uploadProgress)}%
                    </Text>
                    <ProgressBar progress={uploadProgress / 100} color={theme.colors.primary} />
                </View>
            )}

            {/* Photo Grid */}
            {photos.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                    {photos.map((photoId, index) => (
                        <View key={index} style={styles.photoContainer}>
                            <TouchableOpacity onPress={() => openLightbox(index)}>
                                <Image
                                    source={{ uri: photoService.getPhotoUrl(photoId) }}
                                    style={styles.photoThumb}
                                />
                            </TouchableOpacity>
                            <IconButton
                                icon="close-circle"
                                size={24}
                                iconColor={theme.colors.error}
                                style={styles.removeButton}
                                onPress={() => removePhoto(index)}
                            />
                        </View>
                    ))}
                </ScrollView>
            )}

            {/* Lightbox for full-screen view */}
            <ImageViewing
                images={photoImages}
                imageIndex={lightboxIndex}
                visible={lightboxVisible}
                onRequestClose={() => setLightboxVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: Spacing[3],
    },
    dropZone: {
        borderWidth: 2,
        borderStyle: 'dashed',
        borderRadius: Radius.lg,
        padding: Spacing[6],
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 180,
    },
    progressContainer: {
        marginBottom: Spacing[4],
        padding: Spacing[3],
        backgroundColor: Colors.green[50],
        borderRadius: Radius.md,
    },
    photoScroll: {
        marginTop: Spacing[2],
    },
    photoContainer: {
        marginRight: Spacing[2],
        position: 'relative',
    },
    photoThumb: {
        width: 120,
        height: 120,
        borderRadius: Radius.md,
        backgroundColor: Colors.neutral[100],
    },
    removeButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: 'white',
        borderRadius: 16,
    },
});
