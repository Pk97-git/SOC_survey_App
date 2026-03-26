const ExcelJS = require('exceljs');
const fs = require('fs');

async function testImages() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Test');

    // Make row 1 very tall
    worksheet.getRow(1).height = 400;
    worksheet.getColumn(1).width = 30;

    // Create a dummy 100x100 png buffer
    // A tiny 1x1 transparent PNG buffer:
    const base64Png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const buffer = Buffer.from(base64Png, 'base64');

    const imageId1 = workbook.addImage({ buffer, extension: 'png' });
    const imageId2 = workbook.addImage({ buffer, extension: 'png' });
    const imageId3 = workbook.addImage({ buffer, extension: 'png' });

    worksheet.addImage(imageId1, {
        tl: { col: 0, row: 0, colOff: 0, rowOff: 0 },
        ext: { width: 100, height: 100 },
        editAs: 'oneCell'
    });

    worksheet.addImage(imageId2, {
        tl: { col: 0, row: 0, colOff: 0, rowOff: 110 * 9525 }, // 100 size + 10 gap
        ext: { width: 100, height: 100 },
        editAs: 'oneCell'
    });
    
    worksheet.addImage(imageId3, {
        tl: { col: 0, row: 0, colOff: 0, rowOff: 220 * 9525 },
        ext: { width: 100, height: 100 },
        editAs: 'oneCell'
    });

    await workbook.xlsx.writeFile('test-images.xlsx');
    console.log("Created test-images.xlsx");
}

testImages().catch(console.error);
