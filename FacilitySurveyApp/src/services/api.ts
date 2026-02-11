import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// API Configuration
const API_BASE_URL = __DEV__
    ? Platform.select({
        ios: 'http://localhost:3000/api',
        android: 'http://10.0.2.2:3000/api', // Android emulator
        web: 'http://localhost:3000/api'
    })
    : 'https://your-production-api.com/api'; // Replace with production URL

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Token management
const TOKEN_KEY = 'auth_token';

export const setAuthToken = async (token: string) => {
    try {
        if (Platform.OS === 'web') {
            localStorage.setItem(TOKEN_KEY, token);
        } else {
            await SecureStore.setItemAsync(TOKEN_KEY, token);
        }
    } catch (error: any) {
        console.error('Error saving token:', error.message || String(error));
    }
};

export const getAuthToken = async (): Promise<string | null> => {
    try {
        if (Platform.OS === 'web') {
            return localStorage.getItem(TOKEN_KEY);
        } else {
            return await SecureStore.getItemAsync(TOKEN_KEY);
        }
    } catch (error: any) {
        console.error('Error getting token:', error.message || String(error));
        return null;
    }
};

export const removeAuthToken = async () => {
    try {
        if (Platform.OS === 'web') {
            localStorage.removeItem(TOKEN_KEY);
        } else {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
        }
    } catch (error: any) {
        console.error('Error removing token:', error.message || String(error));
    }
};

// Request interceptor to add auth token
api.interceptors.request.use(
    async (config) => {
        const token = await getAuthToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid - clear token
            await removeAuthToken();
            // You could also trigger a logout/redirect here
        }
        return Promise.reject(error);
    }
);

// ==================== Authentication API ====================

export const authApi = {
    register: async (data: { email: string; password: string; fullName: string; role: string }) => {
        const response = await api.post('/auth/register', data);
        return response.data;
    },

    login: async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.token) {
            await setAuthToken(response.data.token);
        }
        return response.data;
    },

    logout: async () => {
        await api.post('/auth/logout');
        await removeAuthToken();
    },

    getCurrentUser: async () => {
        const response = await api.get('/auth/me');
        return response.data;
    },

    forgotPassword: async (email: string) => {
        const response = await api.post('/auth/forgot-password', { email });
        return response.data;
    },

    resetPassword: async (token: string, password: string) => {
        const response = await api.post('/auth/reset-password', { token, password });
        return response.data;
    },
};

// ==================== Sites API ====================

export const sitesApi = {
    getAll: async () => {
        const response = await api.get('/sites');
        return response.data.sites;
    },

    getById: async (id: string) => {
        const response = await api.get(`/sites/${id}`);
        return response.data.site;
    },

    create: async (data: { name: string; location?: string }) => {
        const response = await api.post('/sites', data);
        return response.data.site;
    },

    update: async (id: string, data: { name?: string; location?: string }) => {
        const response = await api.put(`/sites/${id}`, data);
        return response.data.site;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/sites/${id}`);
        return response.data;
    },
};

// ==================== Assets API ====================

export const assetsApi = {
    getAll: async (siteId?: string) => {
        const params = siteId ? { siteId } : {};
        const response = await api.get('/assets', { params });
        return response.data.assets;
    },

    getById: async (id: string) => {
        const response = await api.get(`/assets/${id}`);
        return response.data.asset;
    },

    create: async (data: {
        siteId: string;
        refCode?: string;
        name: string;
        serviceLine?: string;
        status?: string;
        assetTag?: string;
        building?: string;
        location?: string;
        description?: string;
    }) => {
        const response = await api.post('/assets', data);
        return response.data.asset;
    },

    bulkImport: async (siteId: string, assets: any[]) => {
        const response = await api.post('/assets/bulk-import', { siteId, assets });
        return response.data.assets;
    },

    uploadExcel: async (siteId: string, fileUri: string, onProgress?: (progress: number) => void) => {
        const formData = new FormData();
        formData.append('siteId', siteId);

        const filename = fileUri.split('/').pop() || 'import.xlsx';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` : `application/vnd.ms-excel`;

        // file matches the expected key in backend
        formData.append('file', { uri: fileUri, name: filename, type } as any);

        const response = await api.post('/assets/import-excel', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            timeout: 300000, // 5 minutes for large files
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(percentCompleted);
                }
            },
        });
        return response.data;
    },

    update: async (id: string, data: any) => {
        const response = await api.put(`/assets/${id}`, data);
        return response.data.asset;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/assets/${id}`);
        return response.data;
    },
};

// ==================== Surveys API ====================

export const surveysApi = {
    getAll: async () => {
        const response = await api.get('/surveys');
        return response.data.surveys;
    },

    getById: async (id: string) => {
        const response = await api.get(`/surveys/${id}`);
        return response.data.survey;
    },

    create: async (data: { siteId: string; trade: string }) => {
        const response = await api.post('/surveys', data);
        return response.data.survey;
    },

    update: async (id: string, data: { status?: string; trade?: string }) => {
        const response = await api.put(`/surveys/${id}`, data);
        return response.data.survey;
    },

    submit: async (id: string) => {
        const response = await api.post(`/surveys/${id}/submit`);
        return response.data.survey;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/surveys/${id}`);
        return response.data;
    },
};

// ==================== Inspections API ====================

export const inspectionsApi = {
    getBySurvey: async (surveyId: string) => {
        const response = await api.get(`/surveys/${surveyId}/inspections`);
        return response.data.inspections;
    },

    create: async (surveyId: string, data: {
        assetId: string;
        conditionRating?: string;
        overallCondition?: string;
        quantityInstalled?: number;
        quantityWorking?: number;
        remarks?: string;
        gpsLat?: number;
        gpsLng?: number;
    }) => {
        const response = await api.post(`/surveys/${surveyId}/inspections`, data);
        return response.data.inspection;
    },

    update: async (inspectionId: string, data: any) => {
        const response = await api.put(`/surveys/inspections/${inspectionId}`, data);
        return response.data.inspection;
    },
};

// ==================== Photos API ====================

export const photosApi = {
    upload: async (formData: FormData) => {
        const response = await api.post('/photos/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data.photo;
    },

    getByInspection: async (inspectionId: string) => {
        const response = await api.get(`/photos/inspection/${inspectionId}`);
        return response.data.photos;
    },

    getPhotoUrl: (photoId: string) => {
        return `${API_BASE_URL}/photos/${photoId}`;
    },

    delete: async (photoId: string) => {
        const response = await api.delete(`/photos/${photoId}`);
        return response.data;
    },
};

// ==================== Users API ====================

export const usersApi = {
    getAll: async () => {
        const response = await api.get('/users');
        return response.data.users;
    },

    update: async (id: string, data: { fullName?: string; role?: string; email?: string, password?: string }) => {
        const response = await api.put(`/users/${id}`, data);
        return response.data.user;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/users/${id}`);
        return response.data;
    },

    activate: async (id: string) => {
        const response = await api.post(`/users/${id}/activate`);
        return response.data;
    },

    deactivate: async (id: string) => {
        const response = await api.post(`/users/${id}/deactivate`);
        return response.data;
    },

    getAuditLogs: async (id: string) => {
        const response = await api.get(`/users/${id}/audit-logs`);
        return response.data.logs;
    },
};

// ==================== Dashboard API ====================

export const dashboardApi = {
    getStats: async () => {
        const response = await api.get('/dashboard/stats');
        return response.data;
    },

    getSurveys: async (filters: any) => {
        const response = await api.get('/dashboard/surveys', { params: filters });
        return response.data.surveys;
    },

    getUsers: async () => {
        const response = await api.get('/dashboard/users');
        return response.data.users;
    },
};

export default api;
