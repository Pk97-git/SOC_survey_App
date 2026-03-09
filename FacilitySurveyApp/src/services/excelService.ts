import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';
import { getAuthToken } from './api';
import api from './api';

// On web: auth is via httpOnly cookie — use credentials:'include', no Authorization header.
// On native: auth token from SecureStore is passed separately via headers.
const webFetch = (url: string, options: RequestInit = {}): Promise<Response> =>
    fetch(url, { ...options, credentials: 'include' });

/**
 * Generate and share Excel for asset-centric survey
 * Format: One row per asset with inspection data
 * Uses exceljs for image embedding support
 */

/**
 * Generate and share Excel via Backend
 */
export const downloadSurveyReport = async (surveyId: string, location?: string, destinationPath?: string) => {
    if (Platform.OS === 'web') {
        // Use cookie-based auth (httpOnly) — no Authorization header needed on web
        const baseUrl = api.defaults.baseURL;
        const url = `${baseUrl}/surveys/${surveyId}/export${location ? `?location=${encodeURIComponent(location)}` : ''}`;

        console.log(`[excelService] Fetching survey export from: ${url}`);

        const response = await webFetch(url, { method: 'GET' });

        if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            console.error(`[excelService] Export failed (${response.status}):`, errText);
            throw new Error(`Export failed: ${errText || response.statusText}`);
        }

        const blob = await response.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        const filename = location
            ? `Survey_${location}.xlsx`
            : `Survey_${surveyId}.xlsx`;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(objectUrl);
        console.log(`[excelService] Download triggered: ${filename}`);
        return objectUrl;
    }

    const filename = `Survey_${surveyId}${location ? `_${location}` : ''}.xlsx`;
    const fileUri = destinationPath || (FileSystem.documentDirectory + filename);
    const token = await getAuthToken();
    const authToken = token ? `Bearer ${token}` : '';
    const baseUrl = api.defaults.baseURL;

    // Ensure parent directory exists
    const folder = fileUri.substring(0, fileUri.lastIndexOf('/'));
    await FileSystem.makeDirectoryAsync(folder, { intermediates: true }).catch(() => { });

    const url = `${baseUrl}/surveys/${surveyId}/export${location ? `?location=${encodeURIComponent(location)}` : ''}`;

    const downloadRes = await FileSystem.downloadAsync(
        url,
        fileUri,
        {
            headers: {
                'Authorization': authToken
            }
        }
    );

    if (downloadRes.status !== 200) {
        throw new Error('Server returned ' + downloadRes.status);
    }

    return downloadRes.uri;
};

export const generateAndShareExcel = async (
    survey: any,
    inspections: any[], // Unused now, backend fetches fresh data
    assets: any[],      // Unused now
    destinationPath?: string,
    location?: string
) => {
    try {
        console.log(`Requesting export for survey ${survey.id}...`);

        const uri = await downloadSurveyReport(survey.id, location, destinationPath);

        if (Platform.OS !== 'web') {
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    dialogTitle: 'Share Survey Report',
                    UTI: 'com.microsoft.excel.xlsx'
                });
            } else {
                Alert.alert('Saved', `File saved to ${uri}`);
            }
        }
        return uri;
    } catch (error: any) {
        console.error('Export error:', error);
        throw new Error(error.message || 'Failed to export Excel from server');
    }
};

/**
 * Download all surveys for a site as a single ZIP file.
 * On web: triggers a browser download of <siteName>_surveys.zip
 * On native: saves the ZIP to documentDirectory and opens the share sheet
 */
export const downloadAllSurveysZip = async (siteId: string, siteName: string) => {
    const safeSiteName = siteName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${safeSiteName}_surveys.zip`;

    if (Platform.OS === 'web') {
        // Use cookie-based auth (httpOnly) — no Authorization header needed on web
        const baseUrl = api.defaults.baseURL;
        const url = `${baseUrl}/surveys/export-zip?siteId=${encodeURIComponent(siteId)}`;

        console.log(`[excelService] Fetching ZIP from: ${url}`);

        const response = await webFetch(url, { method: 'GET' });

        if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            console.error(`[excelService] ZIP export failed (${response.status}):`, errText);
            throw new Error(`ZIP export failed: ${errText || response.statusText}`);
        }

        const blob = await response.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(objectUrl);
        console.log(`[excelService] ZIP download triggered: ${filename}`);
        return filename;
    }

    // Native path
    const token = await getAuthToken();
    const fileUri = `${FileSystem.documentDirectory}${filename}`;
    const url = `${api.defaults.baseURL}/surveys/export-zip?siteId=${encodeURIComponent(siteId)}`;

    const downloadRes = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
    });

    if (downloadRes.status !== 200) {
        throw new Error('Server returned ' + downloadRes.status);
    }

    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadRes.uri, {
            mimeType: 'application/zip',
            dialogTitle: 'Save Surveys ZIP',
            UTI: 'public.zip-archive',
        });
    } else {
        Alert.alert('Saved', `ZIP saved to ${downloadRes.uri}`);
    }

    return downloadRes.uri;
};

/**
 * Legacy function - kept for backward compatibility
 */
export const generateAndShareExcelLegacy = async (surveyId: string) => {
    throw new Error('Legacy Excel generation not supported.');
};
