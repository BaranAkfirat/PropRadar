const ExcelJS = require('exceljs');

class ExcelExporter {
    constructor() {
        this.workbook = new ExcelJS.Workbook();
        this.workbook.creator = 'Prop Radar';
        this.workbook.created = new Date();
        this.worksheet = this.workbook.addWorksheet('İlan Detayları');

        // TELEFON SÜTUNU EKLENDİ
        this.worksheet.columns = [
            { header: 'İlan Başlığı', key: 'title', width: 50 },
            { header: 'Fiyat', key: 'price', width: 20 },
            { header: 'Telefon', key: 'phone', width: 25 }, 
            { header: 'İlan Linki', key: 'url', width: 60 },
            { header: 'Açıklama', key: 'description', width: 120 },
            { header: 'Fotoğraflar', key: 'photos', width: 100 }
        ];

        const headerRow = this.worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0070C0' }
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    }

    async saveToFile(dataArray, filePath) {
        if (!dataArray || dataArray.length === 0) {
            throw new Error("Kaydedilecek ilan verisi bulunamadı.");
        }

        dataArray.forEach(data => {
            this.worksheet.addRow({
                title: data.title,
                price: data.price,
                phone: data.phone, // TELEFON VERİSİ SATIRA EKLENDİ
                url: data.url,
                description: data.description,
                photos: data.photos
            });
        });

        this.worksheet.getColumn('description').alignment = { wrapText: true, vertical: 'top' };
        this.worksheet.getColumn('photos').alignment = { wrapText: true, vertical: 'top' };
        this.worksheet.getColumn('phone').alignment = { vertical: 'top', horizontal: 'left' }; // Telefon numarası formatı

        await this.workbook.xlsx.writeFile(filePath);
        return filePath;
    }
}

module.exports = ExcelExporter;