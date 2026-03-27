import { SurveyRepository } from '../repositories/survey.repository';
import pool from '../config/database';
import { Survey, CreateSurveyDTO, UpdateSurveyDTO, SurveyFilter } from '../models/survey.model';
import { UserRole } from '../middleware/auth.middleware';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import path from 'path';
import fs from 'fs';

interface AuthUser {
    userId: string;
    email: string;
    role: UserRole;
}

export class SurveyService {
    private repo: SurveyRepository;

    constructor() {
        this.repo = new SurveyRepository();
    }

    async getAll(_user: AuthUser, filter: SurveyFilter): Promise<Survey[]> {
        // Assignments removed. All roles can see all surveys matching the filter.
        return this.repo.findAll(filter);
    }

    async getById(_user: AuthUser, id: string): Promise<Survey | null> {
        const survey = await this.repo.findById(id);
        if (!survey) return null;

        // Assignments removed. All roles can get any survey.
        return survey;
    }

    async create(user: AuthUser, data: CreateSurveyDTO): Promise<Survey> {
        // surveyorId is now just an audit field. If not provided from the front-end, assign to creator.
        data.surveyorId = data.surveyorId || user.userId;
        return this.repo.create(data);
    }

    async update(user: AuthUser, id: string, data: UpdateSurveyDTO): Promise<Survey | null> {
        const survey = await this.repo.findById(id);
        if (!survey) return null;

        if (survey.status === 'submitted' || survey.status === 'completed') {
            if (user.role !== 'admin') {
                throw new Error('Unauthorized: Only admins can edit submitted surveys');
            }
        }

        // Assignments removed. Surveyors and Admins can update any survey.
        return this.repo.update(id, data);
    }

    async submit(_user: AuthUser, id: string): Promise<Survey | null> {
        const survey = await this.repo.findById(id);
        if (!survey) return null;

        return this.repo.submit(id);
    }

    async delete(user: AuthUser, id: string): Promise<boolean> {
        const survey = await this.repo.findById(id);
        if (!survey) return false;

        // Any role can delete for now, or we can restrict deletion to admins only.
        if (user.role !== 'admin' && user.role !== 'surveyor') {
            throw new Error('Unauthorized');
        }

        return this.repo.delete(id);
    }

    async exportExcel(_user: AuthUser, id: string, locationFilter?: string): Promise<ExcelJS.Buffer | null> {
        const data = await this.repo.findWithDetails(id);
        if (!data) return null;

        return this.buildExcelBuffer(data, locationFilter);
    }

    private async buildExcelBuffer(data: any, locationFilter?: string): Promise<ExcelJS.Buffer> {
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

        setHeaderRow(1, 'Location:', locationFilter || data.site_name || '');
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
        setMainHeader('W4', 'CIT Verification/ Comments', 'W5');
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
        worksheet.getColumn(19).width = 30; // Photos (S)
        worksheet.getColumn('T').width = 30;  // Remarks
        worksheet.getColumn('U').width = 25;  // MAG Comments
        worksheet.getColumn(22).width = 30; // MAG Pictures (V)
        worksheet.getColumn('W').width = 40;  // CIT Verification/ Comments
        worksheet.getColumn('X').width = 40;  // DGDA Comments


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
            const descriptionText = (item.description && item.description !== item.asset_name)
                ? `${item.asset_name}\n${item.description}`
                : item.asset_name || '';
            row.getCell('F').value = descriptionText;
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


            // --- Reviewer Comments ---
            // Safely parse review data with error handling
            const safeParseJSON = (data: any): any => {
                if (typeof data === 'string') {
                    try {
                        return JSON.parse(data);
                    } catch (e) {
                        console.warn('Failed to parse review JSON:', e);
                        return {};
                    }
                }
                return data;
            };

            const magReview = safeParseJSON(item.mag_review);
            const citReview = safeParseJSON(item.cit_review);
            const dgdaReview = safeParseJSON(item.dgda_review);

            row.getCell('U').value = magReview?.comments || '';
            row.getCell('U').alignment = { wrapText: true, vertical: 'top' };

            row.getCell('W').value = citReview?.comments || ''; // CIT Verification/ Comments
            row.getCell('W').alignment = { wrapText: true, vertical: 'top' };

            row.getCell('X').value = dgdaReview?.comments || ''; // DGDA Comments
            row.getCell('X').alignment = { wrapText: true, vertical: 'top' };

            // --- Common Styling ---
            row.eachCell((cell) => {
                cell.border = borderStyle;
                if (!cell.alignment) cell.alignment = { vertical: 'middle', wrapText: true };
            });

            // --- Photos ---
            // Photo columns (S, V, X, Z) width is set to 100 (~700px).
            // Row height is calculated dynamically based on photo count (max 409pt).
            const PHOTO_SIZE = 100; 
            const SPACING = 10;
            const POINTS_PER_PIXEL = 0.75;
            const MAX_ROW_HEIGHT = 409;
            // Note: We want a single vertical column. 
            // So we will ignore photos_per_col and just stack by index.

            const getPhotoCount = (photosData: any): number => {
                if (!photosData) return 0;
                if (Array.isArray(photosData)) return photosData.length;
                if (typeof photosData === 'string') {
                    try {
                        const parsed = JSON.parse(photosData);
                        return Array.isArray(parsed) ? parsed.length : 0;
                    } catch { return 0; }
                }
                return 0;
            };

            const surveyorPhotoCount = item.photos?.length || 0;
            const magPhotoCount = getPhotoCount(magReview?.photos);
            const citPhotoCount = getPhotoCount(citReview?.photos);
            const dgdaPhotoCount = getPhotoCount(dgdaReview?.photos);

            const maxPhotosInRow = Math.max(surveyorPhotoCount, magPhotoCount, citPhotoCount, dgdaPhotoCount);
            // verticalCount is the number of photo-rows in the cell. 
            // Since we stack all photos vertically in one column, verticalCount = maxPhotosInRow.
            const verticalCount = maxPhotosInRow; 
            
            // Set dynamic row height
            row.height = verticalCount > 0 
                ? Math.min(MAX_ROW_HEIGHT, verticalCount * (PHOTO_SIZE + SPACING) * POINTS_PER_PIXEL + 10)
                : 30;

            // Helper to get extension for exceljs
            const getExtension = (filePath: string): any => {
                const ext = path.extname(filePath).toLowerCase().replace('.', '');
                if (['png', 'jpeg', 'jpg', 'gif'].includes(ext)) {
                    return ext === 'jpg' ? 'jpeg' : ext;
                }
                return 'jpeg'; // default
            };

            // 1. Surveyor Photos (Col S - Index 18)
            // Filter: ONLY show photos that were NOT part of a review section.
            const auditPhotoPaths = new Set([
                ...(magReview?.photos || []),
                ...(citReview?.photos || []),
                ...(dgdaReview?.photos || [])
            ].map(p => typeof p === 'string' ? p : p.file_path));

            if (item.photos && item.photos.length > 0) {
                try {
                    let photoIdx = 0;
                    for (const p of item.photos) {
                        // Skip if this photo was uploaded as part of a MAG/CIT/DGDA review
                        if (auditPhotoPaths.has(p.file_path)) continue;

                        const pPath = path.resolve(p.file_path);
                        if (fs.existsSync(pPath)) {
                            const imageId = workbook.addImage({
                                filename: pPath,
                                extension: getExtension(pPath),
                            });

                            // Deep fix: ExcelJS 'oneCell' editAs ignores rowOff in some versions/contexts.
                            // The most robust way to stack vertically within a single cell is 
                            // to use fractional row coordinates.
                            // For example: row + 0.0 is top, row + 0.5 is halfway down.
                            const rowFraction = verticalCount > 1 ? (photoIdx / verticalCount) : 0;

                            worksheet.addImage(imageId, {
                                tl: { 
                                    col: 18, // Col S
                                    row: (currentRowIndex - 1) + rowFraction
                                } as any,
                                ext: { width: PHOTO_SIZE, height: PHOTO_SIZE },
                                editAs: 'oneCell'
                            });
                            photoIdx++;
                        }
                    }
                } catch (e) {
                    console.error('Error embedding surveyor photos:', e);
                }
            }

            // 2. Review Photos (MAG, CIT, DGDA)
            const embedReviewPhotos = async (photos: any, colIndex: number, label: string) => {
                let parsedPhotos: string[] = [];
                if (photos) {
                    parsedPhotos = typeof photos === 'string' ? JSON.parse(photos) : photos;
                }

                if (parsedPhotos && Array.isArray(parsedPhotos) && parsedPhotos.length > 0) {
                    try {
                        let photoIdx = 0;
                        for (const photoPathRaw of parsedPhotos) {
                            if (typeof photoPathRaw !== 'string' || !photoPathRaw.startsWith('uploads/')) continue;

                            const absolutePath = path.resolve(photoPathRaw);
                            if (fs.existsSync(absolutePath)) {
                                const imageId = workbook.addImage({
                                    filename: absolutePath,
                                    extension: getExtension(absolutePath),
                                });

                                // Stack vertically using fractional coordinates
                                const rowFraction = verticalCount > 1 ? (photoIdx / verticalCount) : 0;

                                worksheet.addImage(imageId, {
                                    tl: { 
                                        col: colIndex, 
                                        row: (currentRowIndex - 1) + rowFraction
                                    } as any,
                                    ext: { width: PHOTO_SIZE, height: PHOTO_SIZE },
                                    editAs: 'oneCell'
                                });
                                photoIdx++;
                            }
                        }
                    } catch (e) {
                        console.error(`Error embedding ${label} photos:`, e);
                    }
                }
            };

            // Consolidated Audit Photos: 
            // Pull photos from all audit stages (MAG, CIT, DGDA) into the "MAG Pictures" column (Col V).
            // This prevents overlapping with text columns W and X while ensuring all data is reported.
            const consolidatedAuditPhotos = [
                ...(magReview?.photos || []),
                ...(citReview?.photos || []),
                ...(dgdaReview?.photos || [])
            ];
            await embedReviewPhotos(consolidatedAuditPhotos, 21, 'Audit'); // Col V

            currentRowIndex++;
        }

        return await workbook.xlsx.writeBuffer();
    }

    async deleteAllBySite(user: AuthUser, siteId: string): Promise<boolean> {
        // Only admin can delete all
        if (user.role !== 'admin') {
            throw new Error('Unauthorized');
        }

        try {
            await pool.query('BEGIN');

            const result = await pool.query(
                'DELETE FROM surveys WHERE site_id = $1 RETURNING id',
                [siteId]
            );

            await pool.query('COMMIT');
            console.log(`Deleted ${result.rowCount} surveys for site ${siteId}`);
            return true;
        } catch (error) {
            await pool.query('ROLLBACK');
            console.error('Delete all surveys error:', error);
            return false;
        }
    }

    /**
     * Generate all survey Excel files for a site and return them as a single ZIP buffer.
     * ZIP structure:
     *   LocationName/
     *     ServiceLine.xlsx
     *     AnotherServiceLine.xlsx
     *   AnotherLocation/
     *     ...
     */
    async exportAllZip(user: AuthUser, siteId: string): Promise<Buffer> {
        // Single batch fetch: 2 DB queries regardless of the number of surveys (fixes N+1)
        const surveysWithDetails = await this.repo.findAllWithDetailsBySite(siteId);

        if (surveysWithDetails.length === 0) {
            throw new Error('No surveys found for this site');
        }

        const zip = new JSZip();

        for (const surveyData of surveysWithDetails) {
            // Surveyor access filter — skip surveys they are not allowed to see
            if (user.role === 'surveyor' &&
                surveyData.surveyor_id !== null &&
                surveyData.surveyor_id !== user.userId) {
                continue;
            }

            try {
                const safeTrade = (surveyData.trade || `survey-${surveyData.id}`)
                    .replace(/[^a-zA-Z0-9\-_ ]/g, '_');

                const folderName = surveyData.location
                    ? surveyData.location.replace(/[^a-zA-Z0-9\-_ ]/g, '_')
                    : 'Unassigned';

                const filename = folderName !== 'Unassigned'
                    ? `${folderName}_${safeTrade}.xlsx`
                    : `${safeTrade}.xlsx`;
                const zipPath = `${folderName}/${filename}`;

                console.log(`📂 Adding to ZIP: ${zipPath}`);

                // No DB hit here — workbook is built from pre-fetched data
                const buffer = await this.buildExcelBuffer(surveyData, surveyData.location || undefined);
                zip.file(zipPath, buffer as unknown as Buffer);
            } catch (err: any) {
                console.warn(`Skipping survey ${surveyData.id} in ZIP: ${err.message}`);
            }
        }

        return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    }
}
