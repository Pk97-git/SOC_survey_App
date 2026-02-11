import React from 'react';
import { View, Platform, StyleSheet, LogBox } from 'react-native';

if (Platform.OS !== 'web') {
  require('react-native-gesture-handler');
}

import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { AppNavigator } from './src/navigation/AppNavigator';
import { theme } from './src/theme';

// Fix Icons for Web
// This is a common workaround for RN Paper icons on Expo Web if not using the font plugin
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { AuthProvider } from './src/context/AuthContext';
import { seedDefaultTemplate } from './src/services/seedTemplate';

export default function App() {
  // Seed default template on first launch
  React.useEffect(() => {
    seedDefaultTemplate();

    // Ignore noisy warnings
    LogBox.ignoreLogs([
      'RangeError',
      'Maximum call stack size exceeded',
      'Require cycle:',
      'Non-serializable values were found in the navigation state'
    ]);
  }, []);

  return (
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
      </PaperProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    backgroundColor: '#000', // Black background for the "outside" area
    alignItems: 'center',
    justifyContent: 'center',
  },
  appWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 600 : '100%', // Limit width on web
    height: '100%',
    backgroundColor: '#000',
    // shadow for web polish
    shadowColor: "#FFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: Platform.OS === 'web' ? 0.1 : 0,
    shadowRadius: 20,
  }
});
