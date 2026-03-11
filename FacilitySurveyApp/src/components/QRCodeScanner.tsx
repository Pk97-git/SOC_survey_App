import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { Button, Text, useTheme } from 'react-native-paper';
import { Typography, Spacing, Colors } from '../constants/design';

interface QRCodeScannerProps {
    onScan: (data: string) => void;
    onCancel: () => void;
}

export const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScan, onCancel }) => {
    const theme = useTheme();
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        const getCameraPermissions = async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        };

        getCameraPermissions();
    }, []);

    const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
        if (!scanned) {
            setScanned(true);
            onScan(data);
        }
    };

    if (hasPermission === null) {
        return (
            <View style={styles.container}>
                <Text style={Typography.bodyLg}>Requesting camera permission...</Text>
            </View>
        );
    }
    if (hasPermission === false) {
        return (
            <View style={styles.container}>
                <Text style={Typography.bodyLg}>No access to camera</Text>
                <Button mode="contained" onPress={onCancel} style={{ marginTop: Spacing[4] }}>
                    Go Back
                </Button>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView
                style={StyleSheet.absoluteFillObject}
                barcodeScannerSettings={{
                    barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e'],
                }}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />

            <View style={styles.overlay}>
                <View style={styles.header}>
                    <Text style={[Typography.h2, { color: 'white', textAlign: 'center' }]}>
                        Scan Asset Tag
                    </Text>
                    <Text style={[Typography.bodyMd, { color: 'white', textAlign: 'center', opacity: 0.8, marginTop: Spacing[2] }]}>
                        Point your camera at a QR code or barcode
                    </Text>
                </View>

                {/* Target box in the middle */}
                <View style={styles.targetBoxContainer}>
                    <View style={styles.targetBox}>
                        <View style={[styles.corner, styles.topLeft, { borderColor: theme.colors.primary }]} />
                        <View style={[styles.corner, styles.topRight, { borderColor: theme.colors.primary }]} />
                        <View style={[styles.corner, styles.bottomLeft, { borderColor: theme.colors.primary }]} />
                        <View style={[styles.corner, styles.bottomRight, { borderColor: theme.colors.primary }]} />
                    </View>
                </View>

                <View style={styles.footer}>
                    <Button
                        mode="contained"
                        onPress={onCancel}
                        buttonColor={theme.colors.error}
                        style={styles.cancelButton}
                    >
                        Cancel Scanning
                    </Button>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing[6],
    },
    header: {
        marginTop: Spacing[8],
        alignItems: 'center',
    },
    footer: {
        marginBottom: Spacing[8],
        width: '100%',
        alignItems: 'center',
    },
    cancelButton: {
        width: '80%',
        paddingVertical: Spacing[2],
    },
    targetBoxContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    targetBox: {
        width: 250,
        height: 250,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 4,
        borderLeftWidth: 4,
    },
    topRight: {
        top: 0,
        right: 0,
        borderTopWidth: 4,
        borderRightWidth: 4,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 4,
        borderRightWidth: 4,
    },
});
