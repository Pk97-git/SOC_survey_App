import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: string[];
    fallback?: React.ReactNode;
    showMessage?: boolean;
}

/**
 * Role-based access control component
 * Only renders children if user has one of the allowed roles
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
    children,
    allowedRoles,
    fallback,
    showMessage = false
}) => {
    const { user } = useAuth();

    if (!user) {
        if (showMessage) {
            return (
                <View style={styles.container}>
                    <Text style={styles.message}>Please login to access this content</Text>
                </View>
            );
        }
        return fallback ? <>{fallback}</> : null;
    }

    const hasRole = allowedRoles.some(role =>
        role.toLowerCase() === user.role.toLowerCase()
    );

    if (!hasRole) {
        if (showMessage) {
            return (
                <View style={styles.container}>
                    <Text style={styles.message}>
                        Access Denied: You don't have permission to view this content
                    </Text>
                    <Text style={styles.subMessage}>
                        Required role: {allowedRoles.join(', ')}
                    </Text>
                    <Text style={styles.subMessage}>Your role: {user.role}</Text>
                </View>
            );
        }
        return fallback ? <>{fallback}</> : null;
    }

    return <>{children}</>;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    message: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
    },
    subMessage: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginTop: 5,
    },
});

/**
 * Hook to check if user has required role
 */
export const useHasRole = (requiredRoles: string[]): boolean => {
    const { user } = useAuth();

    if (!user) return false;

    return requiredRoles.some(role =>
        role.toLowerCase() === user.role.toLowerCase()
    );
};

/**
 * Hook to check if user is admin
 */
export const useIsAdmin = (): boolean => {
    return useHasRole(['admin']);
};

/**
 * Hook to check if user is surveyor
 */
export const useIsSurveyor = (): boolean => {
    return useHasRole(['surveyor']);
};

/**
 * Hook to check if user is reviewer
 */
export const useIsReviewer = (): boolean => {
    return useHasRole(['reviewer']);
};
