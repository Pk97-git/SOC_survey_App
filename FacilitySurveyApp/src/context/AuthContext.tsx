import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { authApi, getAuthToken, removeAuthToken } from '../services/api';

interface User {
    id: string;
    email: string;
    fullName: string;
    role: string;
    isActive?: boolean;
    createdAt?: string;
    lastLogin?: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
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
            logout();
        });

        return () => {
            subscription.remove();
        };
    }, []);

    const checkLogin = async () => {
        try {
            const token = await getAuthToken();
            if (token) {
                // Token exists, verify it by fetching current user
                try {
                    const response = await authApi.getCurrentUser();
                    // Check if user is active
                    if (response.user.isActive === false) {
                        console.log('User account is deactivated');
                        await removeAuthToken();
                        await AsyncStorage.removeItem('user');
                        setUser(null);
                    } else {
                        setUser(response.user);
                    }
                } catch (error) {
                    // Token invalid or expired
                    console.log('Token validation failed:', (error as any).message || String(error));
                    await removeAuthToken();
                    await AsyncStorage.removeItem('user');
                }
            }
        } catch (e: any) {
            console.log("Auth check failed", e.message || String(e));
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        try {
            const response = await authApi.login(email, password);

            // Check if user is active
            if (response.user.isActive === false) {
                throw new Error('Account is deactivated. Please contact administrator.');
            }

            setUser(response.user);
            // Token is already stored by authApi.login
        } catch (error: any) {
            console.error('Login failed:', error.message || String(error));
            throw new Error(error.response?.data?.error || error.message || 'Login failed. Please check your credentials.');
        }
    };

    const logout = async () => {
        if (isLoggingOut.current) return;
        isLoggingOut.current = true;

        try {
            await authApi.logout();
        } catch (error: any) {
            // Ignore 401 (Unauthorized) and 429 (Too Many Requests) during logout
            if (error.response?.status !== 401 && error.response?.status !== 429) {
                console.error('Logout error:', error.message || String(error));
            }
        } finally {
            setUser(null);
            await removeAuthToken();
            await AsyncStorage.removeItem('user');
            isLoggingOut.current = false;
        }
    };

    const refreshUser = async () => {
        try {
            const response = await authApi.getCurrentUser();
            setUser(response.user);
        } catch (error: any) {
            console.error('Refresh user failed:', error.message || String(error));
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
