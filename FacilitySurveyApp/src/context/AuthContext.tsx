import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    isReviewer: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for existing session
        checkLogin();
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
        try {
            await authApi.logout();
        } catch (error: any) {
            console.error('Logout error:', error.message || String(error));
        } finally {
            setUser(null);
            await removeAuthToken();
            await AsyncStorage.removeItem('user');
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
    const isReviewer = user?.role?.toLowerCase() === 'reviewer';

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            login,
            logout,
            refreshUser,
            isAuthenticated: !!user,
            isAdmin,
            isSurveyor,
            isReviewer
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
