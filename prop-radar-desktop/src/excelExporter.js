const ExcelJS = require('exceljs');

class ExcelExporter {
    constructor() {
        this.workbook = new ExcelJS.Workbook();
        this.workbook.creator = 'Prop Radar';
        this.workbook.created = new Date();
        this.worksheet = this.workbook.addWorksheet('İlan Detayları');

        // TÜM İSTENEN SÜTUNLAR TANIMLANDI
        this.worksheet.columns = [
            { header: 'İlan No', key: 'ilanNo', width: 15 },
            { header: 'İlan Tarihi', key: 'ilanTarihi', width: 15 },
            { header: 'Satıcı Adı', key: 'sellerName', width: 20 },
            { header: 'Kimden', key: 'kimden', width: 15 },
            { header: 'Telefon', key: 'phone', width: 20 },
            { header: 'İlan Başlığı', key: 'title', width: 45 },
            { header: 'Fiyat', key: 'price', width: 15 },
            { header: 'Emlak Tipi', key: 'emlakTipi', width: 15 },
            { header: 'm² (Net)', key: 'm2Net', width: 10 },
            { header: 'Oda Sayısı', key: 'odaSayisi', width: 12 },
            { header: 'Bina Yaşı', key: 'binaYasi', width: 10 },
            { header: 'Kat Sayısı', key: 'katSayisi', width: 10 },
            { header: 'Bulunduğu Kat', key: 'bulunduguKat', width: 15 },
            { header: 'Aidat (TL)', key: 'aidat', width: 12 },
            { header: 'Depozito (TL)', key: 'depozito', width: 15 },
            { header: 'Eşyalı', key: 'esyali', width: 10 },
            { header: 'Site Adı', key: 'siteAdi', width: 20 },
            { header: 'İlan Linki', key: 'url', width: 50 },
            { header: 'Açıklama', key: 'description', width: 80 },
            { header: 'Fotoğraflar', key: 'photos', width: 80 }
        ];

        // Başlık stili
        const headerRow = this.worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    }

    async saveToFile(dataArray, filePath) {
        if (!dataArray || dataArray.length === 0) {
            throw new Error("Kaydedilecek ilan verisi bulunamadı.");
        }

        // Gelen diziyi satır satır Excel'e işle
        dataArray.forEach(data => {
            this.worksheet.addRow({
                ilanNo: data.ilanNo,
                ilanTarihi: data.ilanTarihi,
                sellerName: data.sellerName,
                kimden: data.kimden,
                phone: data.phone,
                title: data.title,
                price: data.price,
                emlakTipi: data.emlakTipi,
                m2Net: data.m2Net,
                odaSayisi: data.odaSayisi,
                binaYasi: data.binaYasi,
                katSayisi: data.katSayisi,
                bulunduguKat: data.bulunduguKat,
                aidat: data.aidat,
                depozito: data.depozito,
                esyali: data.esyali,
                siteAdi: data.siteAdi,
                url: data.url,
                description: data.description,
                photos: data.photos
            });
        });

        // Uzun veri hücrelerinin (açıklama, fotoğraflar) metin kaydırmasını (wrapText) ayarla
        this.worksheet.getColumn('description').alignment = { wrapText: true, vertical: 'top' };
        this.worksheet.getColumn('photos').alignment = { wrapText: true, vertical: 'top' };

        await this.workbook.xlsx.writeFile(filePath);
        return filePath;
    }
}

module.exports = ExcelExporter;