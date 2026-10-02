const { ipcMain, dialog } = require('electron');
const dataStore = require('./dataStore');
const ExcelExporter = require('./excelExporter');

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

    ipcMain.on('ui-command', async (event, command) => { 
        if (command === 'START_SCAN') {
            const success = wsServer.sendCommandToExtension({ action: 'START_SCAN' });
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
};