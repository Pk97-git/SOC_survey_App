import api, { setAuthToken, removeAuthToken } from './api';

export interface User {
    id: string;
    email: string;
    fullName: string;
    role: 'admin' | 'surveyor' | 'reviewer';
}

export interface LoginResponse {
    token: string;
    user: User;
}

export const authService = {
    // Register new user
    async register(email: string, password: string, fullName: string, role: string = 'surveyor'): Promise<User> {
        const response = await api.post('/auth/register', {
            email,
            password,
            fullName,
            role,
        });
        return response.data.user;
    },

    // Login
    async login(email: string, password: string): Promise<LoginResponse> {
        const response = await api.post('/auth/login', {
            email,
            password,
        });

        const { token, user } = response.data;

        // Save token
        await setAuthToken(token);

        return { token, user };
    },

    // Logout
    async logout(): Promise<void> {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            await removeAuthToken();
        }
    },

    // Get current user
    async getCurrentUser(): Promise<User> {
        const response = await api.get('/auth/me');
        return response.data.user;
    },

    // Check if user is authenticated
    async isAuthenticated(): Promise<boolean> {
        try {
            await this.getCurrentUser();
            return true;
        } catch (error) {
            return false;
        }
    },
};
