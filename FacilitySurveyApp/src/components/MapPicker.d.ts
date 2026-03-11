import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';

export interface MapPickerProps {
    initialLocation?: {
        latitude: number;
        longitude: number;
    };
    onLocationSelected?: (location: { latitude: number; longitude: number }, address?: string) => void;
    // Keep legacy prop naming just in case, though the components use onLocationSelected
    onLocationSelect?: (location: { latitude: number; longitude: number }) => void;
    style?: StyleProp<ViewStyle>;
    visible?: boolean;
    onDismiss?: () => void;
}

declare const MapPicker: React.FC<MapPickerProps>;
export default MapPicker;
