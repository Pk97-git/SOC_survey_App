import { registerRootComponent } from 'expo';

// Fix for gesture handler on web
// Removed to avoid 'is not iterable' error on web


import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
