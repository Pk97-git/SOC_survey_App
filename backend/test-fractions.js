const ExcelJS = require('exceljs');

async function testImages() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Test');

    worksheet.getRow(1).height = 400; // Total height 400pt
    worksheet.getColumn(1).width = 30;

    const base64Png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const buffer = Buffer.from(base64Png, 'base64');

    const imageId1 = workbook.addImage({ buffer, extension: 'png' });
    const imageId2 = workbook.addImage({ buffer, extension: 'png' });
    const imageId3 = workbook.addImage({ buffer, extension: 'png' });

    worksheet.addImage(imageId1, {
        tl: { col: 0, row: 0 },
        ext: { width: 100, height: 100 },
        editAs: 'oneCell'
    });

    worksheet.addImage(imageId2, {
        tl: { col: 0, row: 0.33 }, 
        ext: { width: 100, height: 100 },
        editAs: 'oneCell'
    });

    worksheet.addImage(imageId3, {
        tl: { col: 0, row: 0.66 },
        ext: { width: 100, height: 100 },
        editAs: 'oneCell'
    });

    await workbook.xlsx.writeFile('test-fractions-onecell.xlsx');
    console.log("Created test-fractions-onecell.xlsx");
}

testImages().catch(console.error);
