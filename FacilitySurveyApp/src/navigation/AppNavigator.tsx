import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { IconButton, useTheme, Button } from 'react-native-paper';
import { View, Text, Platform } from 'react-native';

// Auth
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';

// Screens
import HomeScreen from '../screens/HomeScreen';
import AssetsScreen from '../screens/AssetsScreen';
import AssetFormScreen from '../screens/AssetFormScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ReportsScreen from '../screens/ReportsScreen';
import StartSurveyScreen from '../screens/StartSurveyScreen';
import AssetInspectionScreen from '../screens/AssetInspectionScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SiteManagementScreen from '../screens/SiteManagementScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import SavedReportsScreen from '../screens/SavedReportsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack for surveying process
const SurveyStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Dashboard" component={HomeScreen} />
        <Stack.Screen name="StartSurvey" component={StartSurveyScreen} />
        <Stack.Screen name="AssetInspection" component={AssetInspectionScreen} />
        <Stack.Screen name="AssetForm" component={AssetFormScreen} />
    </Stack.Navigator>
);

// Stack for Assets & Sites
const AssetStack = () => (
    <Stack.Navigator>
        <Stack.Screen name="AssetList" component={AssetsScreen} options={{ title: 'Asset Register', headerShown: false }} />
        <Stack.Screen name="AssetForm" component={AssetFormScreen} options={{ title: 'New Asset' }} />
        <Stack.Screen name="SiteManagement" component={SiteManagementScreen} options={{ title: 'Manage Sites' }} />
    </Stack.Navigator>
);

// Stack for Admin Dashboard
const AdminStack = () => (
    <Stack.Navigator>
        <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ headerShown: false }} />
        <Stack.Screen name="UserManagement" component={UserManagementScreen} options={{ title: 'Manage Users', headerShown: false }} />
        <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
);


// Stack for Survey Management (Reports, Resume, Edit)
const SurveyManagementStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="SurveyManagement" component={ReportsScreen} />
        <Stack.Screen name="StartSurvey" component={StartSurveyScreen} />
        <Stack.Screen name="AssetInspection" component={AssetInspectionScreen} />

        <Stack.Screen name="AssetForm" component={AssetFormScreen} />
        <Stack.Screen name="SavedReports" component={SavedReportsScreen} />
    </Stack.Navigator>
);

// Templates removed - surveys are now asset-driven, not template-driven


// Surveyor Bottom Tab Navigator
const SurveyorTabs = () => {
    const theme = useTheme();
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: 'gray',
                tabBarStyle: {
                    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
                    height: Platform.OS === 'ios' ? 85 : 65,
                    backgroundColor: theme.colors.surface,
                    borderTopColor: theme.colors.outlineVariant,
                    paddingTop: 8
                },
            })}
        >
            <Tab.Screen
                name="HomeTab"
                component={SurveyStack}
                options={{
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <IconButton icon="home" iconColor={color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="ReportsTab"
                component={SurveyManagementStack}
                options={{
                    tabBarLabel: 'Surveys',
                    tabBarIcon: ({ color, size }) => (
                        <IconButton icon="file-document-edit" iconColor={color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="ProfileTab"
                component={ProfileScreen}
                options={{
                    tabBarLabel: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <IconButton icon="account" iconColor={color} size={size} />
                    ),
                    headerShown: false,
                    headerTitle: 'My Profile',
                    headerStyle: { backgroundColor: theme.colors.surface },
                    headerTintColor: theme.colors.onSurface
                }}
            />
        </Tab.Navigator>
    );
};

// Admin Bottom Tab Navigator
const AdminTabs = () => {
    const theme = useTheme();
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: 'gray',
                tabBarStyle: {
                    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
                    height: Platform.OS === 'ios' ? 85 : 65,
                    backgroundColor: theme.colors.surface,
                    borderTopColor: theme.colors.outlineVariant,
                    paddingTop: 8
                },
            })}
        >
            <Tab.Screen
                name="DashboardTab"
                component={AdminStack}
                options={{
                    tabBarLabel: 'Dashboard',
                    tabBarIcon: ({ color, size }) => (
                        <IconButton icon="view-dashboard" iconColor={color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="SitesTab"
                component={SiteManagementScreen}
                options={{
                    tabBarLabel: 'Sites',
                    tabBarIcon: ({ color, size }) => (
                        <IconButton icon="office-building" iconColor={color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="AssetsTab"
                component={AssetStack}
                options={{
                    tabBarLabel: 'Assets',
                    tabBarIcon: ({ color, size }) => (
                        <IconButton icon="cube-outline" iconColor={color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="ReportsTab"
                component={SurveyManagementStack}
                options={{
                    tabBarLabel: 'Surveys',
                    tabBarIcon: ({ color, size }) => (
                        <IconButton icon="file-document-edit" iconColor={color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="ProfileTab"
                component={ProfileScreen}
                options={{
                    tabBarLabel: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <IconButton icon="account" iconColor={color} size={size} />
                    ),
                    headerShown: false,
                    headerTitle: 'My Profile',
                    headerStyle: { backgroundColor: theme.colors.surface },
                    headerTintColor: theme.colors.onSurface
                }}
            />
        </Tab.Navigator>
    );
};

export const AppNavigator = () => {
    const { user, isLoading } = useAuth();

    // Debug logging
    if (user) {
        console.log('AppNavigator User:', JSON.stringify(user, null, 2));
        console.log('AppNavigator isAdmin check:', user.role?.toLowerCase() === 'admin');
    }

    if (isLoading) {
        return <View style={styles.loadingContainer} />; // Loading splash
    }

    const isAdmin = user?.role?.toLowerCase() === 'admin';

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {user ? (
                isAdmin ? (
                    <Stack.Screen name="AdminMain" component={AdminTabs} />
                ) : (
                    <Stack.Screen name="SurveyorMain" component={SurveyorTabs} />
                )
            ) : (
                <Stack.Screen name="Login" component={LoginScreen} />
            )}
        </Stack.Navigator>
    );
};

const styles = {
    loadingContainer: {
        flex: 1,
        backgroundColor: '#000'
    }
};
