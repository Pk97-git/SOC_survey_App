import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';

export interface MapPickerProps {
    initialLocation?: {
        latitude: number;
        longitude: number;
    };
    onLocationSelect: (location: { latitude: number; longitude: number }) => void;
    style?: StyleProp<ViewStyle>;
}

declare const MapPicker: React.FC<MapPickerProps>;
export default MapPicker;
