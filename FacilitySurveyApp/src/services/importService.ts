import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { read, utils } from 'xlsx';
import { storage } from './storage';
import { Alert } from 'react-native';

export const importAssetsFromExcel = async (): Promise<any[] | null> => {
    try {
        // 1. Pick the file
        const result = await DocumentPicker.getDocumentAsync({
            type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'],
            copyToCacheDirectory: true
        });

        if (result.canceled) return null;

        const fileUri = result.assets[0].uri;

        // 2. Read the file
        // On web, we might need a Blob or ArrayBuffer. On native, readAsStringAsync with base64 works well for xlsx.
        const fileContent = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64
        });

        // 3. Parse Workbook
        const wb = read(fileContent, { type: 'base64' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];

        // 4. Convert to JSON
        // Expected columns: Name, Type, Site, Latitude, Longitude, Description
        const data: any[] = utils.sheet_to_json(ws);

        if (data.length === 0) {
            Alert.alert("Error", "No data found in the Excel file.");
            return [];
        }

        // 5. Map and Validate
        const assets: any[] = [];
        for (const row of data) {
            // Flexible column mapping (case insensitive check could be better, but keeping simple first)
            const name = row['Name'] || row['name'] || row['Asset Name'];
            const type = row['Type'] || row['type'] || row['Category'];
            const site = row['Project Site'] || row['Site'] || row['site'] || row['Location'];

            // Skip empty rows
            if (!name) continue;

            const asset = {
                id: `ast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: String(name),
                type: String(type || 'General'),
                project_site: String(site || 'Unknown Site'),
                service_line: String(row['Service Line'] || row['service_line'] || ''),
                floor: String(row['Floor'] || row['floor'] || ''),
                area: String(row['Area'] || row['area'] || ''),
                age: String(row['Age'] || row['age'] || ''),
                ref_code: String(row['Ref'] || row['ref_code'] || row['Reference'] || ''),
                location_lat: parseFloat(row['Latitude'] || row['lat'] || '0') || 0,
                location_lng: parseFloat(row['Longitude'] || row['lng'] || row['long'] || '0') || 0,
                description: String(row['Description'] || row['desc'] || '')
            };

            assets.push(asset);
        }

        return assets;

    } catch (error) {
        console.error("Asset Import Error:", error);
        Alert.alert("Import Failed", "Could not parse or save the Excel file. Please check the format.");
        throw error;
    }
};
