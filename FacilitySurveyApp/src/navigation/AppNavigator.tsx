import React from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme, Text as PaperText, Avatar, Divider } from 'react-native-paper';
import { View, Platform, Pressable, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Auth
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';

// Screens
import HomeScreen from '../screens/HomeScreen';
import AssetsScreen from '../screens/AssetsScreen';
import AssetFormScreen from '../screens/AssetFormScreen';
import SurveyManagementScreen from '../screens/SurveyManagementScreen';
import StartSurveyScreen from '../screens/StartSurveyScreen';
import AssetInspectionScreen from '../screens/AssetInspectionScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SiteManagementScreen from '../screens/SiteManagementScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import SavedReportsScreen from '../screens/SavedReportsScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import ReviewerDashboardScreen from '../screens/ReviewerDashboardScreen';
import ReviewSurveyScreen from '../screens/ReviewSurveyScreen';
import HelpScreen from '../screens/HelpScreen';
import { Colors, Radius, Typography, Spacing } from '../constants/design';

const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

// ─────────────────────────────────────────────────────────────────────────────
// Stack navigators
// ─────────────────────────────────────────────────────────────────────────────

const SurveyStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Dashboard" component={HomeScreen} />
        <Stack.Screen name="StartSurvey" component={StartSurveyScreen} />
        <Stack.Screen name="AssetInspection" component={AssetInspectionScreen} />
        <Stack.Screen name="AssetForm" component={AssetFormScreen} />
    </Stack.Navigator>
);

const AssetStack = () => (
    <Stack.Navigator>
        <Stack.Screen name="AssetList" component={AssetsScreen} options={{ title: 'Asset Register', headerShown: false }} />
        <Stack.Screen name="AssetForm" component={AssetFormScreen} options={{ title: 'New Asset' }} />
        <Stack.Screen name="SiteManagement" component={SiteManagementScreen} options={{ title: 'Manage Sites', headerShown: false }} />
    </Stack.Navigator>
);

const AdminStack = () => (
    <Stack.Navigator>
        <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ headerShown: false }} />
        <Stack.Screen name="UserManagement" component={UserManagementScreen} options={{ title: 'Manage Users', headerShown: false }} />
        <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
);

const SurveyManagementStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="SurveyManagement" component={SurveyManagementScreen} />
        <Stack.Screen name="StartSurvey" component={StartSurveyScreen} />
        <Stack.Screen name="AssetInspection" component={AssetInspectionScreen} />
        <Stack.Screen name="AssetForm" component={AssetFormScreen} />
        <Stack.Screen name="SavedReports" component={SavedReportsScreen} />
        <Stack.Screen name="ReviewSurvey" component={ReviewSurveyScreen} />
    </Stack.Navigator>
);

const ReviewerStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="ReviewerDashboard" component={ReviewerDashboardScreen} />
        <Stack.Screen name="ReviewSurvey" component={ReviewSurveyScreen} />
    </Stack.Navigator>
);

const ProfileStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Help" component={HelpScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
    </Stack.Navigator>
);

// ─────────────────────────────────────────────────────────────────────────────
// Custom Drawer Content (Mobile & Web)
// ─────────────────────────────────────────────────────────────────────────────

const CustomDrawerContent = (props: any) => {
    const theme = useTheme();
    const { user, logout } = useAuth();
    const { roleLabel } = props;

    return (
        <DrawerContentScrollView
            {...props}
            contentContainerStyle={{ flex: 1, paddingTop: 0 }}
            style={{ backgroundColor: theme.colors.primary }}
        >
            {/* Brand Header */}
            <View style={[drawerStyles.header, { borderBottomColor: 'rgba(255,255,255,0.2)' }]}>
                {/* Accent stripe */}
                <View style={[drawerStyles.brandStripe, { backgroundColor: theme.colors.tertiary }]} />
                {/* Logo */}
                <Image
                    source={require('../../assets/cit-logo.png')}
                    style={{ width: 28, height: 28, resizeMode: 'contain', marginLeft: Spacing[2] }}
                />
                <View style={{ marginLeft: 12, flex: 1 }}>
                    <PaperText style={[Typography.h4, { color: '#FFFFFF', letterSpacing: -0.3 }]}>
                        CIT Operations
                    </PaperText>
                    <PaperText style={[Typography.labelXs, { color: 'rgba(255,255,255,0.8)', marginTop: 1 }]}>
                        GULAID HOLDING
                    </PaperText>
                    <PaperText style={[Typography.labelXs, { color: 'rgba(255,255,255,0.7)', marginTop: 2 }]}>
                        {roleLabel || 'Portal'}
                    </PaperText>
                </View>
            </View>

            {/* User Info */}
            {user && (
                <View style={[drawerStyles.userInfo, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                    <Avatar.Text
                        size={40}
                        label={user.fullName?.substring(0, 2).toUpperCase() || 'US'}
                        style={{ backgroundColor: '#FFFFFF' }}
                        labelStyle={{ color: theme.colors.primary }}
                    />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                        <PaperText style={[Typography.labelMd, { color: '#FFFFFF' }]}>
                            {user.fullName || 'User'}
                        </PaperText>
                        <PaperText style={[Typography.bodyXs, { color: 'rgba(255,255,255,0.8)' }]}>
                            {user.email}
                        </PaperText>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                            <View style={[drawerStyles.roleBadge, { backgroundColor: theme.colors.tertiary }]}>
                                <PaperText style={[Typography.labelXs, { color: Colors.neutral[900] }]}>
                                    {user.role?.toUpperCase() || 'USER'}
                                </PaperText>
                            </View>
                        </View>
                    </View>
                </View>
            )}

            <Divider style={{ marginVertical: 8, backgroundColor: 'rgba(255,255,255,0.2)' }} />

            {/* Navigation Items */}
            <View style={{ flex: 1 }}>
                <DrawerItemList {...props} />
            </View>

            {/* Footer */}
            <View style={[drawerStyles.footer, { borderTopColor: 'rgba(255,255,255,0.2)' }]}>
                <View style={{ backgroundColor: theme.colors.tertiary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.xs, alignSelf: 'flex-start', marginBottom: 8 }}>
                    <PaperText style={{ color: Colors.neutral[900], fontWeight: 'bold', fontSize: 11 }}>V1.0</PaperText>
                </View>
                <PaperText style={[Typography.labelXs, { color: 'rgba(255,255,255,0.8)' }]}>
                    GULAID HOLDING
                </PaperText>
                <PaperText style={[Typography.bodyXs, { color: 'rgba(255,255,255,0.6)', marginTop: 2 }]}>
                    © 2026 CIT Group Ltd
                </PaperText>
            </View>
        </DrawerContentScrollView>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Web sidebar — renders instead of bottom tabs on web for all roles
// ─────────────────────────────────────────────────────────────────────────────
const WEB_SIDEBAR_WIDTH = 252;

const WebSidebar = ({ state, descriptors, navigation, roleLabel = 'Portal' }: any) => {
    const theme = useTheme();

    return (
        <View style={[webStyles.sidebar, {
            backgroundColor: theme.colors.primary,
            borderRightColor: 'rgba(255,255,255,0.2)',
        }]}>
            {/* Brand */}
            <View style={[webStyles.brand, { borderBottomColor: 'rgba(255,255,255,0.2)' }]}>
                {/* Accent stripe */}
                <View style={[webStyles.brandStripe, { backgroundColor: theme.colors.tertiary }]} />
                {/* Logo box */}
                <View style={[webStyles.brandIcon, { backgroundColor: 'transparent' }]}>
                    <Image
                        source={require('../../assets/cit-logo.png')}
                        style={{ width: 28, height: 28, resizeMode: 'contain' }}
                    />
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                    <PaperText style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 }}>
                        CIT Operations
                    </PaperText>
                    <PaperText style={[Typography.labelXs, { color: 'rgba(255,255,255,0.8)', marginTop: 1 }]}>
                        GULAID HOLDING
                    </PaperText>
                    <PaperText style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>
                        {roleLabel}
                    </PaperText>
                </View>
            </View>

            {/* Navigation items */}
            <View style={{ flex: 1, paddingTop: 8 }}>
                {state.routes.map((route: any, index: number) => {
                    const { options } = descriptors[route.key];
                    const label = (options.tabBarLabel ?? options.title ?? route.name) as string;
                    const isFocused = state.index === index;

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });
                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate({ name: route.name, merge: true });
                        }
                    };

                    return (
                        <Pressable
                            key={route.key}
                            onPress={onPress}
                            style={({ pressed }: any) => [
                                webStyles.navItem,
                                isFocused
                                    ? {
                                        backgroundColor: 'rgba(255,255,255,0.15)',
                                        borderLeftWidth: 3,
                                        borderLeftColor: theme.colors.tertiary,
                                        paddingLeft: 9,
                                    }
                                    : pressed
                                        ? { backgroundColor: 'rgba(255,255,255,0.08)' }
                                        : undefined,
                            ]}
                        >
                            {options.tabBarIcon?.({
                                focused: isFocused,
                                color: isFocused ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
                                size: 22,
                            })}
                            <PaperText style={{
                                marginLeft: 10,
                                color: isFocused ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
                                fontWeight: isFocused ? '700' : '500',
                                fontSize: 14,
                            }}>
                                {label}
                            </PaperText>
                        </Pressable>
                    );
                })}
            </View>

            {/* Footer */}
            <View style={[webStyles.sidebarFooter, { borderTopColor: 'rgba(255,255,255,0.2)' }]}>
                <View style={{ backgroundColor: theme.colors.tertiary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 10 }}>
                    <PaperText style={{ color: Colors.neutral[900], fontWeight: 'bold', fontSize: 11 }}>V1.0</PaperText>
                </View>
                <PaperText style={[Typography.labelXs, { color: 'rgba(255,255,255,0.8)' }]}>
                    GULAID HOLDING
                </PaperText>
                <PaperText style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 3 }}>
                    CIT Group Ltd © {new Date().getFullYear()}
                </PaperText>
            </View>
        </View>
    );
};

const webStyles = StyleSheet.create({
    sidebar: {
        position: 'absolute' as any,
        left: 0,
        top: 0,
        bottom: 0,
        width: WEB_SIDEBAR_WIDTH,
        borderRightWidth: 1,
        zIndex: 100,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 4,
    },
    brand: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingTop: 28,
        paddingBottom: 20,
        borderBottomWidth: 1,
        marginBottom: 8,
    },
    brandStripe: {
        width: 4,
        height: 40,
        borderRadius: 2,
        marginRight: 12,
    },
    brandIcon: {
        width: 40,
        height: 40,
        borderRadius: Radius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 11,
        marginHorizontal: 8,
        marginVertical: 1,
        borderRadius: Radius.md,
    },
    sidebarFooter: {
        padding: 20,
        borderTopWidth: 1,
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// Drawer navigators (role-based)
// ─────────────────────────────────────────────────────────────────────────────

const SurveyorDrawer = () => {
    const theme = useTheme();
    const isWeb = Platform.OS === 'web';

    return (
        <Drawer.Navigator
            drawerContent={(props) => <CustomDrawerContent {...props} roleLabel="Surveyor Portal" />}
            screenOptions={{
                headerShown: false,
                drawerStyle: isWeb ? { width: WEB_SIDEBAR_WIDTH, backgroundColor: theme.colors.primary } : { width: '80%', maxWidth: 320, backgroundColor: theme.colors.primary },
                drawerType: isWeb ? 'permanent' : 'front',
                drawerActiveTintColor: '#FFFFFF',
                drawerInactiveTintColor: 'rgba(255,255,255,0.7)',
                drawerLabelStyle: {
                    fontSize: 14,
                    fontWeight: '600',
                    marginLeft: -10,
                },
                drawerItemStyle: {
                    borderRadius: Radius.sm,
                    marginHorizontal: 8,
                    marginVertical: 2,
                },
                drawerActiveBackgroundColor: 'rgba(255,255,255,0.15)',
            }}
        >
            <Drawer.Screen
                name="HomeTab"
                component={SurveyStack}
                options={{
                    drawerLabel: 'Home',
                    drawerIcon: ({ color, size, focused }) => (
                        <MaterialCommunityIcons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen
                name="ReportsTab"
                component={SurveyManagementStack}
                options={{
                    drawerLabel: 'Surveys',
                    drawerIcon: ({ color, size, focused }) => (
                        <MaterialCommunityIcons name={focused ? 'file-document-edit' : 'file-document-edit-outline'} size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen
                name="ProfileTab"
                component={ProfileStack}
                options={{
                    drawerLabel: 'Profile',
                    drawerIcon: ({ color, size, focused }) => (
                        <MaterialCommunityIcons name={focused ? 'account-circle' : 'account-circle-outline'} size={size} color={color} />
                    ),
                }}
            />
        </Drawer.Navigator>
    );
};

// Reviewer: read-only access — survey list and profile only
const ReviewerDrawer = () => {
    const theme = useTheme();
    const isWeb = Platform.OS === 'web';

    return (
        <Drawer.Navigator
            drawerContent={(props) => <CustomDrawerContent {...props} roleLabel="Reviewer Portal" />}
            screenOptions={{
                headerShown: false,
                drawerStyle: isWeb ? { width: WEB_SIDEBAR_WIDTH, backgroundColor: theme.colors.primary } : { width: '80%', maxWidth: 320, backgroundColor: theme.colors.primary },
                drawerType: isWeb ? 'permanent' : 'front',
                drawerActiveTintColor: '#FFFFFF',
                drawerInactiveTintColor: 'rgba(255,255,255,0.7)',
                drawerLabelStyle: {
                    fontSize: 14,
                    fontWeight: '600',
                    marginLeft: -10,
                },
                drawerItemStyle: {
                    borderRadius: Radius.sm,
                    marginHorizontal: 8,
                    marginVertical: 2,
                },
                drawerActiveBackgroundColor: 'rgba(255,255,255,0.15)',
            }}
        >
            <Drawer.Screen
                name="ReportsTab"
                component={ReviewerStack}
                options={{
                    drawerLabel: 'Surveys',
                    drawerIcon: ({ color, size, focused }) => (
                        <MaterialCommunityIcons name={focused ? 'file-document-check' : 'file-document-check-outline'} size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen
                name="ProfileTab"
                component={ProfileStack}
                options={{
                    drawerLabel: 'Profile',
                    drawerIcon: ({ color, size, focused }) => (
                        <MaterialCommunityIcons name={focused ? 'account-circle' : 'account-circle-outline'} size={size} color={color} />
                    ),
                }}
            />
        </Drawer.Navigator>
    );
};

const AdminDrawer = () => {
    const theme = useTheme();
    const isWeb = Platform.OS === 'web';

    return (
        <Drawer.Navigator
            drawerContent={(props) => <CustomDrawerContent {...props} roleLabel="Admin Portal" />}
            screenOptions={{
                headerShown: false,
                drawerStyle: isWeb ? { width: WEB_SIDEBAR_WIDTH, backgroundColor: theme.colors.primary } : { width: '80%', maxWidth: 320, backgroundColor: theme.colors.primary },
                drawerType: isWeb ? 'permanent' : 'front',
                drawerActiveTintColor: '#FFFFFF',
                drawerInactiveTintColor: 'rgba(255,255,255,0.7)',
                drawerLabelStyle: {
                    fontSize: 14,
                    fontWeight: '600',
                    marginLeft: -10,
                },
                drawerItemStyle: {
                    borderRadius: Radius.sm,
                    marginHorizontal: 8,
                    marginVertical: 2,
                },
                drawerActiveBackgroundColor: 'rgba(255,255,255,0.15)',
            }}
        >
            <Drawer.Screen
                name="DashboardTab"
                component={AdminStack}
                options={{
                    drawerLabel: 'Dashboard',
                    drawerIcon: ({ color, size, focused }) => (
                        <MaterialCommunityIcons name={focused ? 'view-dashboard' : 'view-dashboard-outline'} size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen
                name="SitesTab"
                component={SiteManagementScreen}
                options={{
                    drawerLabel: 'Sites',
                    drawerIcon: ({ color, size, focused }) => (
                        <MaterialCommunityIcons name={focused ? 'office-building' : 'office-building-outline'} size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen
                name="AssetsTab"
                component={AssetStack}
                options={{
                    drawerLabel: 'Assets',
                    drawerIcon: ({ color, size, focused }) => (
                        <MaterialCommunityIcons name={focused ? 'cube' : 'cube-outline'} size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen
                name="ReportsTab"
                component={SurveyManagementStack}
                options={{
                    drawerLabel: 'Surveys',
                    drawerIcon: ({ color, size, focused }) => (
                        <MaterialCommunityIcons name={focused ? 'file-document-edit' : 'file-document-edit-outline'} size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen
                name="ProfileTab"
                component={ProfileStack}
                options={{
                    drawerLabel: 'Profile',
                    drawerIcon: ({ color, size, focused }) => (
                        <MaterialCommunityIcons name={focused ? 'account-circle' : 'account-circle-outline'} size={size} color={color} />
                    ),
                }}
            />
        </Drawer.Navigator>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Root navigator
// ─────────────────────────────────────────────────────────────────────────────

export const AppNavigator = () => {
    const { user, isLoading } = useAuth();
    const theme = useTheme();

    if (isLoading) {
        return <View style={[appStyles.loadingContainer, { backgroundColor: theme.colors.background }]} />;
    }

    const role = user?.role?.toLowerCase();

    return (
        <ErrorBoundary fallbackTitle="Navigation Error">
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {user ? (
                    role === 'admin' ? (
                        <Stack.Screen name="AdminMain" component={AdminDrawer} />
                    ) : role === 'reviewer' ? (
                        <Stack.Screen name="ReviewerMain" component={ReviewerDrawer} />
                    ) : (
                        <Stack.Screen name="SurveyorMain" component={SurveyorDrawer} />
                    )
                ) : (
                    <>
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
                    </>
                )}
            </Stack.Navigator>
        </ErrorBoundary>
    );
};

const drawerStyles = StyleSheet.create({
    header: {
        padding: Spacing[4],
        borderBottomWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing[2],
    },
    brandStripe: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
    },
    userInfo: {
        padding: Spacing[4],
        gap: Spacing[2],
        alignItems: 'center',
    },
    roleBadge: {
        paddingHorizontal: Spacing[2],
        paddingVertical: Spacing[1],
        borderRadius: Radius.xs,
        marginTop: Spacing[1],
    },
    footer: {
        padding: Spacing[4],
        marginTop: 'auto',
        alignItems: 'center',
    },
});

const appStyles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
    },
});
