import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, IconButton, Surface, useTheme, Button } from 'react-native-paper';
import { Typography, Spacing, Radius, Colors } from '../constants/design';

interface PhotoDropZoneProps {
    onPhotosSelected: (files: File[]) => void;
    maxPhotos?: number;
    currentPhotoCount?: number;
}

export const PhotoDropZone: React.FC<PhotoDropZoneProps> = ({
    onPhotosSelected,
    maxPhotos = 5,
    currentPhotoCount = 0
}) => {
    const theme = useTheme();
    const [isDragging, setIsDragging] = useState(false);
    const [previews, setPreviews] = useState<string[]>([]);

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

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files).filter(file =>
            file.type.startsWith('image/')
        );

        const remaining = maxPhotos - currentPhotoCount;
        const filesToAdd = files.slice(0, remaining);

        if (filesToAdd.length > 0) {
            // Create preview URLs
            const newPreviews = filesToAdd.map(file => URL.createObjectURL(file));
            setPreviews(prev => [...prev, ...newPreviews]);

            onPhotosSelected(filesToAdd);
        }
    }, [onPhotosSelected, maxPhotos, currentPhotoCount]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const imageFiles = Array.from(files).filter(file =>
            file.type.startsWith('image/')
        );

        const remaining = maxPhotos - currentPhotoCount;
        const filesToAdd = imageFiles.slice(0, remaining);

        if (filesToAdd.length > 0) {
            // Create preview URLs
            const newPreviews = filesToAdd.map(file => URL.createObjectURL(file));
            setPreviews(prev => [...prev, ...newPreviews]);

            onPhotosSelected(filesToAdd);
        }
    }, [onPhotosSelected, maxPhotos, currentPhotoCount]);

    const handleBrowseClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = (e: any) => handleFileInput(e);
        input.click();
    };

    const remainingSlots = maxPhotos - currentPhotoCount;
    const isMaxReached = remainingSlots <= 0;

    return (
        <View style={styles.container}>
            {!isMaxReached && (
                <div
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    style={{
                        width: '100%',
                        minHeight: 200,
                    }}
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
                            icon="cloud-upload"
                            size={48}
                            iconColor={theme.colors.primary}
                        />

                        <Text style={[Typography.h4, { color: theme.colors.onSurface, marginTop: Spacing[2] }]}>
                            {isDragging ? 'Drop photos here' : 'Drag & Drop Photos'}
                        </Text>

                        <Text style={[Typography.bodyMd, { color: theme.colors.onSurfaceVariant, marginTop: Spacing[2], textAlign: 'center' }]}>
                            or
                        </Text>

                        <Button
                            mode="contained"
                            onPress={handleBrowseClick}
                            style={{ marginTop: Spacing[3] }}
                            icon="folder-open"
                        >
                            Browse Files
                        </Button>

                        <Text style={[Typography.bodyXs, { color: theme.colors.onSurfaceVariant, marginTop: Spacing[4], textAlign: 'center' }]}>
                            {remainingSlots} of {maxPhotos} photos remaining
                        </Text>
                    </Surface>
                </div>
            )}

            {isMaxReached && (
                <Surface
                    style={[
                        styles.maxReachedBox,
                        { backgroundColor: theme.colors.errorContainer }
                    ]}
                >
                    <IconButton
                        icon="alert-circle"
                        size={32}
                        iconColor={theme.colors.error}
                    />
                    <Text style={[Typography.bodyMd, { color: theme.colors.error, textAlign: 'center' }]}>
                        Maximum {maxPhotos} photos reached
                    </Text>
                </Surface>
            )}

            {/* Preview thumbnails */}
            {previews.length > 0 && (
                <View style={styles.previewContainer}>
                    <Text style={[Typography.labelMd, { color: theme.colors.onSurface, marginBottom: Spacing[2] }]}>
                        Uploading ({previews.length})...
                    </Text>
                    <View style={styles.previewGrid}>
                        {previews.map((preview, index) => (
                            <Image
                                key={index}
                                source={{ uri: preview }}
                                style={styles.previewImage}
                            />
                        ))}
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    dropZone: {
        borderWidth: 2,
        borderStyle: 'dashed',
        borderRadius: Radius.lg,
        padding: Spacing[6],
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
        transition: 'all 0.3s ease',
    },
    maxReachedBox: {
        padding: Spacing[4],
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewContainer: {
        marginTop: Spacing[4],
    },
    previewGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing[2],
    },
    previewImage: {
        width: 80,
        height: 80,
        borderRadius: Radius.sm,
    },
});
