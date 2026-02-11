import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';
import { getAuthToken } from './api';
import api from './api';

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
        const response = await api.get(`/surveys/${surveyId}/export${location ? `?location=${encodeURIComponent(location)}` : ''}`, {
            responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Survey_${surveyId}${location ? `_${location}` : ''}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        return url;
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
    destinationPath?: string
) => {
    try {
        console.log(`Requesting export for survey ${survey.id}...`);

        const uri = await downloadSurveyReport(survey.id, undefined, destinationPath);

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
 * Legacy function - kept for backward compatibility
 */
export const generateAndShareExcelLegacy = async (surveyId: string) => {
    throw new Error('Legacy Excel generation not supported.');
};
