import 'react-native-gesture-handler';
import React from 'react';
import { View, Platform, StyleSheet, LogBox, ActivityIndicator } from 'react-native';
import * as Font from 'expo-font';

import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { AppNavigator } from './src/navigation/AppNavigator';
import { theme } from './src/theme';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthProvider } from './src/context/AuthContext';
import { seedDefaultTemplate } from './src/services/seedTemplate';
import { SyncToast } from './src/components/SyncToast';
import { syncService } from './src/services/syncService';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// --- Web Font Fix ---
if (Platform.OS === 'web') {
  const iconFontStyles = `
    @font-face {
      src: url(${require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf')});
      font-family: MaterialCommunityIcons;
    }
    @font-face {
      src: url(${require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf')});
      font-family: 'Material Design Icons';
    }
  `;
  const style = document.createElement('style');
  style.type = 'text/css';
  style.appendChild(document.createTextNode(iconFontStyles));
  document.head.appendChild(style);
}

export default function App() {
  // Seed default template on first launch
  React.useEffect(() => {
    seedDefaultTemplate();
    console.log('📱 App initialized. Sync Service online:', syncService.isOnline);

    // Ignore noisy warnings
    LogBox.ignoreLogs([
      'RangeError',
      'Maximum call stack size exceeded',
      'Require cycle:',
      'Non-serializable values were found in the navigation state'
    ]);
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <PaperProvider
          theme={theme}
          settings={{
            icon: (props: any) => <MaterialCommunityIcons {...props} />,
          }}
        >
          <View style={styles.webContainer}>
            <View style={styles.appWrapper}>
              <NavigationContainer theme={{
                ...theme,
                colors: {
                  ...theme.colors,
                  background: theme.colors.background,
                  card: theme.colors.surface,
                  text: theme.colors.onSurface,
                  border: theme.colors.outline,
                  primary: theme.colors.primary,
                  notification: theme.colors.error,
                },
                dark: true
              }}>
                <AppNavigator />
              </NavigationContainer>
            </View>
          </View>
          <SyncToast />
        </PaperProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  appWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
  }
});
