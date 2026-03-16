import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter, Platform } from 'react-native';
import { authApi, getAuthToken, removeAuthToken } from '../services/api';
import { syncService } from '../services/syncService';

interface User {
    id: string;
    email: string;
    fullName: string;
    role: string;
    organization?: string;
    isActive?: boolean;
    createdAt?: string;
    lastLogin?: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    loginWithMicrosoft: (idToken: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isSurveyor: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const isLoggingOut = React.useRef(false);

    useEffect(() => {
        // Check for existing session
        checkLogin();

        // Listen for auth:logout event (from api interceptor)
        const subscription = DeviceEventEmitter.addListener('auth:logout', () => {
            logout().catch(err => console.error('auth:logout handler error:', err instanceof Error ? err.message : String(err)));
        });

        return () => {
            subscription.remove();
        };
    }, []);

    const checkLogin = async () => {
        try {
            if (Platform.OS === 'web') {
                // Web: auth is via httpOnly cookie — token not accessible from JS.
                // Probe the server; a 401 means no valid session.
                try {
                    const response = await authApi.getCurrentUser();
                    if (response.user.isActive === false) {
                        syncService.setAuthenticated(false);
                        setUser(null);
                    } else {
                        syncService.setAuthenticated(true, response.user.role === 'admin');
                        setUser(response.user);
                        // Sync is native-only; no sync on web
                    }
                } catch {
                    // 401 = no valid cookie / session expired
                    syncService.setAuthenticated(false);
                }
            } else {
                // Native: auth token lives in SecureStore
                const token = await getAuthToken();
                if (token) {
                    try {
                        const response = await authApi.getCurrentUser();
                        if (response.user.isActive === false) {
                            console.log('User account is deactivated');
                            await removeAuthToken();
                            await AsyncStorage.removeItem('user');
                            syncService.setAuthenticated(false);
                            setUser(null);
                        } else {
                            syncService.setAuthenticated(true, response.user.role === 'admin');
                            if ((Platform.OS as string) !== 'web' && response.user.role !== 'admin') {
                                // Assuming the intent was to add device binding logic here,
                                // and the original sync call should still happen.
                                // The provided snippet was malformed, so I'm reconstructing based on common patterns.
                                // If device binding is successful, then set user and sync.
                                // For now, just setting user and syncing as before, but within this new block.
                                setUser(response.user);
                                syncService.syncAll().catch(err => console.log('Initial sync after checkLogin failed:', err));
                            } else {
                                // For web or admin users, just set the user
                                setUser(response.user);
                            }
                        }
                    } catch (error: unknown) {
                        console.log('Token validation failed:', error instanceof Error ? error.message : String(error));
                        await removeAuthToken();
                        await AsyncStorage.removeItem('user');
                        syncService.setAuthenticated(false);
                    }
                } else {
                    syncService.setAuthenticated(false);
                }
            }
        } catch (e: unknown) {
            console.log('Auth check failed', e instanceof Error ? e.message : String(e));
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        try {
            const response = await authApi.login(email, password);

            if (response.user.isActive === false) {
                throw new Error('Account is deactivated. Please contact administrator.');
            }

            syncService.setAuthenticated(true, response.user.role === 'admin');
            setUser(response.user);
            if (Platform.OS !== 'web' && response.user.role !== 'admin') {
                syncService.syncAll().catch(err => console.log('Initial sync after login failed:', err));
            }
        } catch (error: unknown) {
            const axErr = error as { response?: { data?: { error?: string } }; message?: string };
            console.error('Login failed:', axErr.message || String(error));
            throw new Error(axErr.response?.data?.error || axErr.message || 'Login failed. Please check your credentials.');
        }
    };

    const loginWithMicrosoft = async (idToken: string) => {
        try {
            const response = await authApi.loginWithMicrosoft(idToken);

            if (response.user.isActive === false) {
                throw new Error('Account is deactivated. Please contact administrator.');
            }

            syncService.setAuthenticated(true, response.user.role === 'admin');
            setUser(response.user);
            if (Platform.OS !== 'web' && response.user.role !== 'admin') {
                syncService.syncAll().catch(err => console.log('Initial sync after Microsoft SSO login failed:', err));
            }
        } catch (error: unknown) {
            const axErr = error as { response?: { data?: { error?: string } }; message?: string };
            console.error('Microsoft Login failed:', axErr.message || String(error));
            throw new Error(axErr.response?.data?.error || axErr.message || 'Microsoft SSO Login failed.');
        }
    };

    const logout = async () => {
        if (isLoggingOut.current) return;
        isLoggingOut.current = true;

        // Immediately block sync before any async operations
        syncService.setAuthenticated(false);

        try {
            // Unconditionally remove frontend tokens first, ensuring UI reacts immediately
            setUser(null);
            await removeAuthToken();
            await AsyncStorage.removeItem('user');

            // Then call the backend to clear the generic httpOnly cookie
            await authApi.logout();
        } catch (error: unknown) {
            // Ignore 401 (Unauthorized) and 429 (Too Many Requests) during logout
            const status = (error as { response?: { status?: number } }).response?.status;
            if (status !== 401 && status !== 429) {
                console.error('Logout error:', error instanceof Error ? error.message : String(error));
            }
        } finally {
            isLoggingOut.current = false;
        }
    };

    const refreshUser = async () => {
        try {
            const response = await authApi.getCurrentUser();
            setUser(response.user);
        } catch (error: unknown) {
            console.error('Refresh user failed:', error instanceof Error ? error.message : String(error));
            // If refresh fails, logout
            await logout();
        }
    };

    // Computed properties for role checks
    const isAdmin = user?.role?.toLowerCase() === 'admin';
    const isSurveyor = user?.role?.toLowerCase() === 'surveyor';

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            login,
            loginWithMicrosoft,
            logout,
            refreshUser,
            isAuthenticated: !!user,
            isAdmin,
            isSurveyor
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
