import { Platform } from 'react-native';

if (Platform.OS === 'web') {
    // Web specific polyfills
    const ReactNative = require('react-native');
    // React Native Paper still uses findNodeHandle heavily in Menu/Tooltip positioning, 
    // but it was removed in React Native Web 0.19+. We must mock it to prevent crashes.
    if (!ReactNative.findNodeHandle) {
        ReactNative.findNodeHandle = () => null;
    }
}

import { registerRootComponent } from 'expo';

// Fix for gesture handler on web
// Removed to avoid 'is not iterable' error on web


import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
