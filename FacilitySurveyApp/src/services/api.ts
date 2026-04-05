import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform, DeviceEventEmitter } from 'react-native';

// ==================== Shared Domain Types ====================

export interface ApiSite {
    id: string;
    name: string;
    location?: string;
    client?: string;
    created_at: string;
}

export interface ApiAsset {
    id: string;
    site_id: string;
    site_name?: string;
    ref_code: string;
    name: string;
    service_line: string;
    status: string;
    asset_tag: string;
    zone: string;
    building: string;
    location: string;
    floor?: string;
    area?: string;
    age?: string;
    description?: string;
    created_at: string;
}

export interface ApiSurvey {
    id: string;
    site_id: string;
    site_name?: string;
    surveyor_id?: string;
    surveyor_name?: string;
    trade: string;
    location?: string;
    status: 'draft' | 'in_progress' | 'submitted' | 'under_review' | 'completed';
    created_at: string;
    updated_at: string;
}

export interface ApiInspection {
    id: string;
    survey_id: string;
    asset_id: string;
    condition_rating?: string;
    overall_condition?: string;
    quantity_installed?: number;
    quantity_working?: number;
    remarks?: string;
    gps_lat?: number;
    gps_lng?: number;
    created_at: string;
    updated_at: string;
}

export interface ApiUser {
    id: string;
    email: string;
    fullName: string;
    role: 'admin' | 'surveyor' | 'reviewer';
    isActive: boolean;
    createdAt?: string;
    lastLogin?: string;
}

export interface DashboardFilters {
    status?: string;
    siteId?: string;
    startDate?: string;
    endDate?: string;
}

export interface AssetUpdateData {
    siteId?: string;
    refCode?: string;
    name?: string;
    serviceLine?: string;
    status?: string;
    assetTag?: string;
    zone?: string;
    building?: string;
    location?: string;
    floor?: string;
    area?: string;
    age?: string;
    description?: string;
}

export interface InspectionUpdateData {
    conditionRating?: string;
    overallCondition?: string;
    quantityInstalled?: number;
    quantityWorking?: number;
    remarks?: string;
    gpsLat?: number;
    gpsLng?: number;
    magReview?: { comments?: string; photos?: string[] };
    citReview?: { comments?: string; photos?: string[] };
    dgdaReview?: { comments?: string; photos?: string[] };
    photos?: string[];
}

// API Configuration
const getApiBaseUrl = () => {
    // For web platform, always use relative URL to go through nginx/proxy
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // In development on web, we might need an absolute URL if the dev server doesn't proxy
        if (__DEV__ && window.location.port === '8081') {
            return 'http://localhost:3000/socsurvey/api';
        }
        return '/socsurvey/api';
    }

    // Production / Fallback URL (e.g., when building APK)
    const PRODUCTION_URL = 'https://phrenologic-lynnette-nontelepathically.ngrok-free.dev/socsurvey/api';
    
    if (__DEV__) {
        return Platform.select({
            ios: PRODUCTION_URL,
            android: PRODUCTION_URL,
            default: PRODUCTION_URL
        });
    }

    return process.env.EXPO_PUBLIC_API_URL || PRODUCTION_URL;
};

const API_BASE_URL = getApiBaseUrl();

// Create axios instance
// withCredentials=true on web ensures the browser sends the httpOnly auth cookie
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    withCredentials: Platform.OS === 'web',
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
    },
});

// Token management
// On web: JWT is stored in an httpOnly cookie (set by the server, invisible to JS - XSS safe)
// On native: JWT is stored in SecureStore (OS keychain)
const TOKEN_KEY = 'auth_token';

export const setAuthToken = async (token: string) => {
    try {
        if (Platform.OS === 'web') {
            // Cookie is set server-side via Set-Cookie header - nothing to store here
            return;
        }
        await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (error: any) {
        console.error('Error saving token:', error.message || String(error));
    }
};

export const getAuthToken = async (): Promise<string | null> => {
    try {
        if (Platform.OS === 'web') {
            // httpOnly cookie is not accessible from JS by design
            // Return null - auth state is managed by the cookie on each request
            return null;
        }
        return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error: any) {
        console.error('Error getting token:', error.message || String(error));
        return null;
    }
};

export const removeAuthToken = async () => {
    try {
        if (Platform.OS === 'web') {
            // Cookie is cleared server-side on logout via clearCookie()
            return;
        }
        await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (error: any) {
        console.error('Error removing token:', error.message || String(error));
    }
};

// Request interceptor — native only: inject SecureStore token as Bearer header
// Web: cookie is sent automatically by the browser via withCredentials
api.interceptors.request.use(
    async (config) => {
        if (Platform.OS !== 'web') {
            const token = await getAuthToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
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
            const url = error.config.url || '';

            // Don't emit logout for auth endpoints (login, register, forgot-password, reset-password)
            // 401 on these endpoints is expected for invalid credentials, not session expiry
            const isAuthEndpoint = url.includes('/auth/login') ||
                url.includes('/auth/register') ||
                url.includes('/auth/forgot-password') ||
                url.includes('/auth/reset-password');

            if (!isAuthEndpoint) {
                if (Platform.OS === 'web') {
                    // On web, cookie expiry signals session end — emit logout
                    DeviceEventEmitter.emit('auth:logout');
                } else {
                    // On native, check if a token existed before clearing
                    const hadToken = await getAuthToken();
                    await removeAuthToken();
                    if (hadToken) {
                        DeviceEventEmitter.emit('auth:logout');
                    }
                }
            }
        }
        return Promise.reject(error);
    }
);

// ==================== Authentication API ====================

export const authApi = {
    register: async (data: { email: string; password: string; fullName: string; role: string; organization?: string }) => {
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

    loginWithMicrosoft: async (authCode: string, codeVerifier?: string) => {
        // Send authorization code and PKCE code verifier to backend
        // Backend will exchange the code for tokens with Microsoft
        const response = await api.post('/auth/microsoft/login', {
            authCode,
            codeVerifier
        });
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

    changePassword: async (currentPassword: string, newPassword: string) => {
        const response = await api.post('/auth/change-password', { currentPassword, newPassword });
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

    create: async (data: { name: string; location?: string; client?: string }) => {
        const response = await api.post('/sites', data);
        return response.data.site;
    },

    update: async (id: string, data: { name?: string; location?: string; client?: string }) => {
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
    getAll: async (siteId?: string, since?: string) => {
        // Paginate in chunks of 5,000 to avoid memory blowouts on large sites (50k+ assets)
        const PAGE_SIZE = 5000;
        let offset = 0;
        let allAssets: any[] = [];
        let hasMore = true;

        while (hasMore) {
            const params: Record<string, any> = { limit: PAGE_SIZE, offset };
            if (siteId) params.siteId = siteId;
            if (since) params.since = since;

            const response = await api.get('/assets', { params, timeout: 30_000 });
            const chunk = response.data.assets || [];
            allAssets = allAssets.concat(chunk);

            if (chunk.length < PAGE_SIZE) {
                hasMore = false;
            } else {
                offset += PAGE_SIZE;
            }
        }

        return allAssets;
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
        zone?: string;
        building?: string;
        location?: string;
        description?: string;
    }) => {
        const response = await api.post('/assets', data);
        return response.data.asset;
    },

    bulkImport: async (siteId: string, assets: AssetUpdateData[]) => {
        const response = await api.post('/assets/bulk-import', { siteId, assets });
        return response.data.assets as ApiAsset[];
    },

    uploadExcel: async (siteId: string, fileData: any, onProgress?: (progress: number) => void) => {
        const formData = new FormData();
        formData.append('siteId', siteId);

        const filename = fileData.name || fileData.uri.split('/').pop() || 'import.xlsx';
        const match = /\.(\w+)$/.exec(filename);
        const type = fileData.mimeType || (match ? `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` : `application/vnd.ms-excel`);

        if (Platform.OS === 'web') {
            try {
                const fetchRes = await fetch(fileData.uri);
                const blob = await fetchRes.blob();
                formData.append('file', blob, filename);
            } catch (e) {
                console.warn('Fallback to fileData.file object');
                formData.append('file', fileData.file);
            }

            // Bypass Axios entirely on Web to avoid FormData boundary destruction
            try {
                // 5-minute timeout — large Excel files can take time on the backend
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);

                const url = `${api.defaults.baseURL}/assets/import-excel`;
                console.log('[API uploadExcel] Sending to:', url);

                let fetchResponse: globalThis.Response;
                try {
                    // Cookie-based auth on web — no Authorization header needed
                    fetchResponse = await fetch(url, {
                        method: 'POST',
                        credentials: 'include',
                        body: formData,
                        signal: controller.signal,
                    });

                    if (!fetchResponse.ok) {
                        const errJson = await fetchResponse.json().catch(() => ({ error: fetchResponse.statusText }));
                        console.error('[API uploadExcel] Server error:', fetchResponse.status, errJson);
                        throw new Error(errJson.error || `Upload failed (${fetchResponse.status})`);
                    }

                    // Simulate 100% progress for fetch
                    if (onProgress) onProgress(100);

                    const data = await fetchResponse.json();
                    console.log('[API uploadExcel] Success:', data.count, 'assets inserted');
                    return data;
                } finally {
                    // Ensure the timeout is cleared whether the request succeeds, fails, or aborts
                    clearTimeout(timeoutId);
                }
            } catch (error: any) {
                console.error('[API uploadExcel] Fetch Error:', error.message);
                throw error;
            }

        } else {
            // On Native (iOS/Android), the { uri, name, type } format tells the networking layer to stream the file from the URI
            formData.append('file', { uri: fileData.uri, name: filename, type } as any);

            try {
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
            } catch (error: any) {
                console.error('[API uploadExcel] Axios Error:', error.response?.data || error.message);
                throw error;
            }
        }
    },

    update: async (id: string, data: AssetUpdateData) => {
        const response = await api.put(`/assets/${id}`, data);
        return response.data.asset as ApiAsset;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/assets/${id}`);
        return response.data;
    },
};

// ==================== Surveys API ====================

export const surveysApi = {
    getAll: async (siteId?: string, since?: string) => {
        const params: Record<string, any> = {};
        if (siteId) params.siteId = siteId;
        if (since) params.since = since;
        const response = await api.get('/surveys', { params });
        return response.data.surveys;
    },

    getById: async (id: string) => {
        const response = await api.get(`/surveys/${id}`);
        return response.data.survey;
    },

    create: async (data: { siteId: string; trade: string; location?: string; surveyorId?: string | null }) => {
        try {
            const response = await api.post('/surveys', data);
            return response.data.survey;
        } catch (error: any) {
            console.error('[API] create survey error:', error.response?.data || error.message);
            throw error;
        }
    },

    update: async (id: string, data: { status?: string; trade?: string; surveyorId?: string; location?: string }) => {
        try {
            const response = await api.put(`/surveys/${id}`, data);
            return response.data.survey;
        } catch (error: any) {
            console.error('[API] update survey error:', error.response?.data || error.message);
            throw error;
        }
    },

    submit: async (id: string) => {
        const response = await api.post(`/surveys/${id}/submit`);
        return response.data.survey;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/surveys/${id}`);
        return response.data;
    },

    deleteAllBySite: async (siteId: string) => {
        const response = await api.delete(`/surveys/site/${siteId}`);
        return response.data;
    }
};

// ==================== Inspections API ====================

export const inspectionsApi = {
    getBySurvey: async (surveyId: string) => {
        const response = await api.get(`/surveys/${surveyId}/inspections`);
        return response.data.inspections;
    },

    getBulk: async (surveyIds: string[]) => {
        const response = await api.post('/surveys/inspections/bulk', {
            surveyIds: surveyIds,
        });
        return response.data.inspections as ApiInspection[];
    },

    create: async (surveyId: string, data: {
        id?: string;
        assetId: string;
        conditionRating?: string;
        overallCondition?: string;
        quantityInstalled?: number;
        quantityWorking?: number;
        remarks?: string;
        gpsLat?: number;
        gpsLng?: number;
        photos?: string[];
        magReview?: any;
        citReview?: any;
        dgdaReview?: any;
    }) => {
        const response = await api.post(`/surveys/${surveyId}/inspections`, data);
        return response.data.inspection;
    },

    update: async (inspectionId: string, data: InspectionUpdateData) => {
        const response = await api.put(`/surveys/inspections/${inspectionId}`, data);
        return response.data.inspection as ApiInspection;
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

    update: async (id: string, data: { fullName?: string; role?: string; organization?: string; email?: string; password?: string }) => {
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

// ==================== Sync API ====================

export const syncApi = {
    logEvent: async (type: string, status: string, details?: any) => {
        try {
            const response = await api.post('/sync/log', { type, status, details });
            return response.data;
        } catch (error) {
            // checking if error is axios error
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                // Endpoint might not exist yet, ignore
                console.warn('Sync log endpoint not found');
                return;
            }
            // Silent fail for logs
            if (axios.isAxiosError(error) && error.response?.status !== 401) {
                console.warn('Failed to log sync event:', error);
            }
        }
    }
};

// ==================== Dashboard API ====================

export const dashboardApi = {
    getStats: async () => {
        const response = await api.get('/dashboard/stats');
        return response.data;
    },

    getSurveys: async (filters: DashboardFilters) => {
        const response = await api.get('/dashboard/surveys', { params: filters });
        return response.data.surveys as ApiSurvey[];
    },

    getUsers: async () => {
        const response = await api.get('/dashboard/users');
        return response.data.users;
    },

    getSiteStats: async (siteId: string) => {
        const response = await api.get('/dashboard/site-stats', { params: { siteId } });
        return response.data as {
            draft: number;
            in_progress: number;
            submitted: number;
            under_review: number;
            completed: number;
            total: number;
        };
    },
};

export default api;
