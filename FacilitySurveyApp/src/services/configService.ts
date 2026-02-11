import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { read, utils } from 'xlsx';
import { getDb } from '../db';
import mockSurvey from '../config/mockSurvey.json';

export interface SurveyTemplate {
    id: string;
    title: string;
    sections: SurveySection[];
}

export interface SurveySection {
    id: string;
    title: string;
    questions: SurveyQuestion[];
}

export interface SurveyQuestion {
    id: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'yes_no' | 'photo' | 'select' | 'rating' | 'header'; // Added header
    required?: boolean;
    options?: string[];
    dependsOn?: string;
}

export interface FacilityItem {
    ref: string;
    serviceLine: string;
    floor: string;
    area: string;
    age: string;
    description: string;
}

export interface SurveyTemplate {
    id: string;
    title: string;
    mode: 'standard' | 'facility_grid'; // New discriminator
    sections: SurveySection[];
    items?: FacilityItem[]; // For Grid mode
}

export const loadDefaultTemplate = async (): Promise<SurveyTemplate> => {
    // In the future, this will load from SQLite 'templates' table
    // For now, return the mock JSON
    return mockSurvey as unknown as SurveyTemplate;
};

export const importExcelTemplate = async (): Promise<SurveyTemplate | null> => {
    try {
        const res = await DocumentPicker.getDocumentAsync({
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            copyToCacheDirectory: true
        });

        if (res.canceled) return null;

        const uri = res.assets[0].uri;
        const fileContent = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64
        });

        return await parseExcelTemplate(fileContent, res.assets[0].name);
    } catch (e) {
        console.error("Error importing Excel:", e);
        throw e;
    }
};

export const parseExcelTemplate = async (base64Content: string, fileName: string): Promise<SurveyTemplate> => {
    const wb = read(base64Content, { type: 'base64' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data: any[] = utils.sheet_to_json(ws);

    // Expected Excel Columns: "Section", "Question", "Type", "Required"
    // OR Grid Columns: "Ref", "Service Line", "Description"...

    const isGridFormat = data.length > 0 && (data[0]['Service Line'] !== undefined || data[0]['Description'] !== undefined);

    let template: SurveyTemplate;

    if (isGridFormat) {
        // Parse as Facility Grid
        const items: FacilityItem[] = data.map(row => ({
            ref: row['Ref'] ? String(row['Ref']) : '',
            serviceLine: row['Service Line'] || '',
            floor: row['Floor'] || '',
            area: row['Area'] || '',
            age: row['Age'] || '',
            description: row['Description'] || ''
        })).filter(i => i.description); // Filter empty rows

        template = {
            id: `tpl_${Date.now()}`,
            title: fileName.replace('.xlsx', ''),
            mode: 'facility_grid',
            sections: [], // Not used in grid mode
            items: items
        };

    } else {
        // Parse as Standard Survey
        const sectionsMap = new Map<string, SurveySection>();

        data.forEach((row, index) => {
            const sectionTitle = row['Section'] || 'General';
            const questionLabel = row['Question'];
            const typeRaw = row['Type']?.toLowerCase() || 'text';

            if (!questionLabel) return;

            if (!sectionsMap.has(sectionTitle)) {
                sectionsMap.set(sectionTitle, {
                    id: `sec_${sectionsMap.size}`,
                    title: sectionTitle,
                    questions: []
                });
            }

            const section = sectionsMap.get(sectionTitle)!;

            // Map Excel types to App types
            let type: SurveyQuestion['type'] = 'text';
            if (typeRaw.includes('photo')) type = 'photo';
            else if (typeRaw.includes('date')) type = 'date';
            else if (typeRaw.includes('number')) type = 'number';
            else if (typeRaw.includes('yes')) type = 'yes_no';

            section.questions.push({
                id: `q_${index}`,
                label: questionLabel,
                type: type,
                required: !!row['Required']
            });
        });

        template = {
            id: `tpl_${Date.now()}`,
            title: fileName.replace('.xlsx', ''),
            mode: 'standard',
            sections: Array.from(sectionsMap.values())
        };
    }

    // Save to DB
    const db = await getDb();
    await db.runAsync(
        'INSERT INTO templates (id, name, file_path, parsed_structure_json) VALUES (?, ?, ?, ?)',
        template.id, template.title, 'imported', JSON.stringify(template)
    );

    return template;
};
