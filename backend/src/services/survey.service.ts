import { SurveyRepository } from '../repositories/survey.repository';
import { Survey, CreateSurveyDTO, UpdateSurveyDTO, SurveyFilter } from '../models/survey.model';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

export class SurveyService {
    private repo: SurveyRepository;

    constructor() {
        this.repo = new SurveyRepository();
    }

    async getAll(user: any, filter: SurveyFilter): Promise<Survey[]> {
        // Apply role-based filtering
        if (user.role === 'surveyor') {
            filter.surveyorId = user.userId;
        }
        // Admin sees all

        return this.repo.findAll(filter);
    }

    async getById(user: any, id: string): Promise<Survey | null> {
        const survey = await this.repo.findById(id);
        if (!survey) return null;

        // Authorization check
        if (user.role === 'surveyor' && survey.surveyor_id !== user.userId) {
            return null; // Or throw specialized error
        }

        return survey;
    }

    async create(user: any, data: CreateSurveyDTO): Promise<Survey> {
        // Force surveyor ID to be current user for surveyors
        // Admin could potentially create for others (not implemented yet, but flexible)
        if (user.role === 'surveyor') {
            data.surveyorId = user.userId;
        }
        return this.repo.create(data);
    }

    async update(user: any, id: string, data: UpdateSurveyDTO): Promise<Survey | null> {
        const survey = await this.repo.findById(id);
        if (!survey) return null;

        if (user.role === 'surveyor' && survey.surveyor_id !== user.userId) {
            throw new Error('Unauthorized'); // Using generic error for now, should use AppError
        }

        return this.repo.update(id, data);
    }

    async submit(user: any, id: string): Promise<Survey | null> {
        const survey = await this.repo.findById(id);
        if (!survey) return null;

        if (user.role === 'surveyor' && survey.surveyor_id !== user.userId) {
            throw new Error('Unauthorized');
        }

        return this.repo.submit(id);
    }

    async delete(user: any, id: string): Promise<boolean> {
        const survey = await this.repo.findById(id);
        if (!survey) return false;

        // Admin or Owner can delete
        if (user.role !== 'admin' && survey.surveyor_id !== user.userId) {
            throw new Error('Unauthorized');
        }

        return this.repo.delete(id);
    }

    async exportExcel(user: any, id: string, locationFilter?: string): Promise<ExcelJS.Buffer | null> {
        const data = await this.repo.findWithDetails(id);
        if (!data) return null;

        if (user.role === 'surveyor' && data.surveyor_id !== user.userId) {
            throw new Error('Unauthorized');
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Survey');

        // Define Styles
        const maroonFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF800000' } }; // Dark Red
        const whiteFont: Partial<ExcelJS.Font> = { color: { argb: 'FFFFFFFF' }, bold: true };
        const centerStyle: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle', wrapText: true };
        const borderStyle: Partial<ExcelJS.Borders> = {
            top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
        };

        // Condition Colors (Approximate based on image)
        const conditionColors: { [key: string]: string } = {
            'A': 'FF0070C0', // Blue
            'B': 'FF00B050', // Green
            'C': 'FF92D050', // Light Green
            'D': 'FFFFFF00', // Yellow
            'E': 'FFFFC000', // Orange
            'F': 'FFFF0000', // Red
            'G': 'FFBFBFBF'  // Grey
        };

        // --- 1. Header Information (Rows 1-3) ---
        // Labels in Col A (Maroon), Values in Col B (White)

        ['A', 'B'].forEach(col => worksheet.getColumn(col).width = 20);

        const setHeaderRow = (rowIdx: number, label: string, value: string) => {
            const labelCell = worksheet.getCell(`A${rowIdx}`);
            labelCell.value = label;
            labelCell.fill = maroonFill;
            labelCell.font = whiteFont;
            labelCell.border = borderStyle;

            // Merge B-C for value to give space
            worksheet.mergeCells(`B${rowIdx}:F${rowIdx}`);
            const valCell = worksheet.getCell(`B${rowIdx}`);
            valCell.value = value;
            valCell.font = { bold: true };
            valCell.border = borderStyle;
        };

        setHeaderRow(1, 'Location:', `${data.site_name || ''} ${locationFilter ? '- ' + locationFilter : ''}`);
        setHeaderRow(2, 'Trade:', data.trade || 'All');
        setHeaderRow(3, 'Date:', new Date(data.created_at).toLocaleDateString());


        // --- 2. Table Headers (Rows 4-5) ---

        // Row 4 Background (Maroon)
        const row4 = worksheet.getRow(4);
        row4.height = 30;

        // AutoFilter on Row 5 (headers)
        worksheet.autoFilter = {
            from: 'A5',
            to: 'X5',
        };

        // Helper to set main header
        const setMainHeader = (cellRef: string, text: string, mergeTo?: string) => {
            if (mergeTo) worksheet.mergeCells(`${cellRef}:${mergeTo}`);
            const cell = worksheet.getCell(cellRef);
            cell.value = text;
            cell.fill = maroonFill;
            cell.font = whiteFont;
            cell.alignment = centerStyle;
            cell.border = borderStyle;
        };

        // A4, B4 (Empty Group Headers)
        ['A4', 'B4'].forEach(ref => {
            const c = worksheet.getCell(ref);
            c.fill = maroonFill;
            c.border = borderStyle;
        });

        // Columns A and B Headers in Row 5 (Aligned with Sub-headers)
        const setColHeader = (cellRef: string, text: string) => {
            const cell = worksheet.getCell(cellRef);
            cell.value = text;
            cell.fill = maroonFill;
            cell.font = whiteFont;
            cell.alignment = centerStyle;
            cell.border = borderStyle;
        };

        setColHeader('A5', 'Ref');
        setColHeader('B5', 'Service Line');

        // Group: Location (Cols C-E) in Row 4
        setMainHeader('C4', 'Location', 'E4');
        const setSubHeader = (cellRef: string, text: string) => {
            const cell = worksheet.getCell(cellRef);
            cell.value = text;
            cell.fill = maroonFill;
            cell.font = whiteFont;
            cell.alignment = centerStyle; // Center alignment for sub-headers
            cell.border = borderStyle;
        };
        setSubHeader('C5', 'Floor');
        setSubHeader('D5', 'Area');
        setSubHeader('E5', 'Age');

        setMainHeader('F4', 'Description', 'F5'); // Description spans 4-5

        // Group: Condition Rating (Cols G-M)
        setMainHeader('G4', 'Condition Rating', 'M4');

        // Group: Overall Condition (Cols N-P)
        setMainHeader('N4', 'Overall Condition', 'P4');

        // Quantities (Vertical Headers)
        setMainHeader('Q4', 'Quantity\nInstalled', 'Q5');
        worksheet.getCell('Q4').alignment = { textRotation: 90, horizontal: 'center', vertical: 'middle', wrapText: true };
        setMainHeader('R4', 'Quantity\nWorking', 'R5');
        worksheet.getCell('R4').alignment = { textRotation: 90, horizontal: 'center', vertical: 'middle', wrapText: true };

        // Other Headers
        setMainHeader('S4', 'Photos', 'S5');
        setMainHeader('T4', 'Remarks', 'T5');
        setMainHeader('U4', 'MAG Comments', 'U5');
        setMainHeader('V4', 'MAG Pictures', 'V5');
        setMainHeader('W4', 'CIT Verification/\nComments', 'W5');
        setMainHeader('X4', 'DGDA Comments', 'X5');


        // --- 3. Colored Sub-Headers (Row 5) ---

        const conditionLabels = ['A >> NEW', 'B >> Excellent', 'C >> Good', 'D >> Average', 'E >> Poor', 'F >> Very Poor', 'G >> T.B.D'];
        const conditionKeys = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
        const conditionCols = ['G', 'H', 'I', 'J', 'K', 'L', 'M'];

        conditionCols.forEach((col, idx) => {
            const cell = worksheet.getCell(`${col}5`);
            cell.value = conditionLabels[idx];
            cell.alignment = { textRotation: 90, horizontal: 'center', vertical: 'middle' }; // Vertical text
            cell.border = borderStyle;
            cell.font = { bold: true };
            // Apply specific background color
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: conditionColors[conditionKeys[idx]] } };
        });

        const overallLabels = ['- Satisfactory', '- Unsatisfactory', '- Satisfactory with Comment'];
        const overallCols = ['N', 'O', 'P'];
        overallCols.forEach((col, idx) => {
            const cell = worksheet.getCell(`${col}5`);
            cell.value = overallLabels[idx];
            cell.fill = maroonFill;
            cell.font = whiteFont;
            cell.alignment = { textRotation: 0, horizontal: 'left', vertical: 'middle', wrapText: true }; // Horizontal based on image
            cell.border = borderStyle;
        });

        // Column Widths
        worksheet.getColumn('A').width = 8;  // Ref
        worksheet.getColumn('B').width = 15; // Service Line
        worksheet.getColumn('C').width = 10; // Floor
        worksheet.getColumn('D').width = 10; // Area
        worksheet.getColumn('E').width = 8;  // Age
        worksheet.getColumn('F').width = 40; // Description (Wide)
        ['G', 'H', 'I', 'J', 'K', 'L', 'M'].forEach(c => worksheet.getColumn(c).width = 5); // Narrow condition cols
        ['N', 'O'].forEach(c => worksheet.getColumn(c).width = 15); // Overall
        worksheet.getColumn('P').width = 25; // Sat with comment
        worksheet.getColumn('Q').width = 5;
        worksheet.getColumn('R').width = 5;
        worksheet.getColumn('S').width = 15;
        worksheet.getColumn('T').width = 30; // Remarks
        ['U', 'V', 'W', 'X'].forEach(c => worksheet.getColumn(c).width = 15);


        // --- 4. Data Population ---
        let currentRowIndex = 6;

        for (const item of data.inspections) {
            if (locationFilter && item.building !== locationFilter) {
                continue;
            }

            const row = worksheet.getRow(currentRowIndex);

            // Content
            row.getCell('A').value = item.ref_code;
            row.getCell('B').value = item.service_line;
            row.getCell('C').value = item.building;
            row.getCell('D').value = item.location;
            row.getCell('E').value = '';
            row.getCell('F').value = `${item.asset_name}\n${item.description || ''}`;
            row.getCell('F').alignment = { wrapText: true, vertical: 'middle' };

            // --- Condition Logic ---
            const r = item.condition_rating || '';
            let matchedKey = '';

            if (r.indexOf('A') > -1 && r.includes('NEW')) matchedKey = 'A';
            else if (r.includes('Excellent')) matchedKey = 'B';
            else if (r.includes('Good')) matchedKey = 'C';
            else if (r.includes('Average')) matchedKey = 'D';
            else if (r.includes('Very Poor')) matchedKey = 'F'; // Check "Very Poor" before "Poor"
            else if (r.includes('Poor')) matchedKey = 'E';
            else if (r.includes('T.B.D')) matchedKey = 'G';

            if (matchedKey) {
                const col = conditionCols[conditionKeys.indexOf(matchedKey)];
                if (col) {
                    const cell = row.getCell(col);
                    cell.value = matchedKey; // e.g. "B"
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.font = { bold: true };
                    // Fill with matching color
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: conditionColors[matchedKey] } };
                }
            }

            // --- Overall Condition Logic ---
            const o = item.overall_condition || '';
            if (o === 'Satisfactory') {
                row.getCell('N').value = 'Satisfactory';
                row.getCell('N').alignment = { wrapText: true };
            }
            else if (o === 'Unsatisfactory') {
                row.getCell('O').value = 'Unsatisfactory';
                row.getCell('O').alignment = { wrapText: true };
            }
            else if (o.includes('Comment')) {
                row.getCell('P').value = 'Satisfactory';
                row.getCell('P').alignment = { wrapText: true };
            }

            row.getCell('Q').value = item.quantity_installed;
            row.getCell('Q').alignment = { textRotation: 90, horizontal: 'center', vertical: 'middle' };
            row.getCell('R').value = item.quantity_working;
            row.getCell('R').alignment = { textRotation: 90, horizontal: 'center', vertical: 'middle' };

            row.getCell('T').value = item.remarks;
            row.getCell('T').alignment = { wrapText: true, vertical: 'middle' };


            // --- Common Styling ---
            row.eachCell((cell) => {
                cell.border = borderStyle;
                if (!cell.alignment) cell.alignment = { vertical: 'middle', wrapText: true };
            });

            // --- Photos ---
            if (item.photos && item.photos.length > 0) {
                row.height = 80;
                const photo = item.photos[0];
                try {
                    const photoPath = path.resolve(photo.file_path);
                    if (fs.existsSync(photoPath)) {
                        const imageId = workbook.addImage({
                            filename: photoPath,
                            extension: 'jpeg',
                        });

                        worksheet.addImage(imageId, {
                            tl: { col: 18, row: currentRowIndex - 1 }, // Col S (19th col, index 18)
                            ext: { width: 100, height: 100 },
                            editAs: 'oneCell'
                        });
                    }
                } catch (e) {
                    console.error('Error embedding photo:', e);
                }
            } else {
                row.height = 30;
            }

            currentRowIndex++;
        }

        return await workbook.xlsx.writeBuffer();
    }
}
