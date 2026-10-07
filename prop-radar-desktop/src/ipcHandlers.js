const { ipcMain, dialog } = require('electron');
const dataStore = require('./dataStore');
const ExcelExporter = require('./excelExporter');
const fs = require('fs'); // YENİ: Dosya okuma/yazma kütüphanesi

module.exports = function setupIpcHandlers(mainWindow, wsServer) {
    let extractedData = []; 

    ipcMain.handle('load-data', () => {
        const parsedData = dataStore.loadData();
        extractedData = parsedData; 
        return parsedData;
    });

    ipcMain.on('save-data', (event, data) => {
        extractedData = data; 
        dataStore.saveData(data);
    });

    ipcMain.on('ui-command', async (event, data) => { 
        // YENİ: Artık data string değil, obje olarak geliyor. Komutu ve ID'leri ayıralım.
        const command = typeof data === 'string' ? data : data.command;
        const knownIds = data.knownIds || [];

        if (command === 'START_SCAN') {
            // YENİ: knownIds listesini eklentiye yolluyoruz
            const success = wsServer.sendCommandToExtension({ action: 'START_SCAN', knownIds: knownIds });
            event.reply('ui-command-reply', { success, message: success ? 'Tarama başlatıldı!' : 'Hata!' });
        } 
        else if (command === 'STOP_SCAN') {
            wsServer.sendCommandToExtension({ action: 'STOP_SCAN' });
            event.reply('ui-command-reply', { success: true, message: 'Tarama durduruldu.' });
        }
        else if (command === 'EXPORT_EXCEL') {
            if (extractedData.length > 0) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
                    title: 'İlan Verilerini Kaydet',
                    defaultPath: `PropRadar_Sonuclar_${timestamp}.xlsx`,
                    filters: [{ name: 'Excel Dosyası', extensions: ['xlsx'] }]
                });

                if (!canceled && filePath) {
                    const exporter = new ExcelExporter();
                    exporter.saveToFile(extractedData, filePath)
                        .then(() => event.reply('ui-command-reply', { success: true, message: `Excel oluşturuldu: ${filePath}` }))
                        .catch(err => event.reply('ui-command-reply', { success: false, message: `Hata: ${err.message}` }));
                } else {
                    event.reply('ui-command-reply', { success: true, message: 'Excel aktarımı iptal edildi.' });
                }
            } else {
                event.reply('ui-command-reply', { success: false, message: 'Dışa aktarılacak veri bulunamadı.' });
            }
        }
    });
    
    // YEDEK OLUŞTURMA İŞLEMİ
    ipcMain.on('export-backup', async (event, localData) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
            title: 'Prop Radar Yedeğini Kaydet',
            defaultPath: `PropRadar_Yedek_${timestamp}.propradar`,
            filters: [{ name: 'PropRadar Yedek Dosyası', extensions: ['propradar'] }]
        });

        if (!canceled && filePath) {
            try {
                // Hem localStorage ayarlarını hem de json'daki ilanları tek bir objede birleştir
                const fullBackup = {
                    localData: localData,
                    listings: extractedData 
                };
                fs.writeFileSync(filePath, JSON.stringify(fullBackup, null, 2), 'utf-8');
                event.reply('ui-command-reply', { success: true, message: 'Yedek başarıyla masaüstüne kaydedildi!' });
            } catch (err) {
                event.reply('ui-command-reply', { success: false, message: 'Yedek kaydedilemedi: ' + err.message });
            }
        }
    });

    // YEDEK YÜKLEME İŞLEMİ
    ipcMain.on('import-backup', async (event) => {
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            title: 'Yedek Dosyasını Seçin',
            filters: [{ name: 'PropRadar Yedek Dosyası', extensions: ['propradar'] }],
            properties: ['openFile']
        });

        if (!canceled && filePaths.length > 0) {
            try {
                const fileContent = fs.readFileSync(filePaths[0], 'utf-8');
                const backupData = JSON.parse(fileContent);
                
                // İlanları doğrudan dataStore.json'a yaz
                if (backupData.listings) {
                    extractedData = backupData.listings;
                    dataStore.saveData(extractedData);
                }
                
                // localStorage ayarlarını arayüze (app.js) geri yolla
                event.reply('import-backup-success', backupData.localData || {});
            } catch (err) {
                event.reply('ui-command-reply', { success: false, message: 'Hatalı veya bozuk yedek dosyası seçtiniz.' });
            }
        }
    });
};