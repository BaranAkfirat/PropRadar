const { app, BrowserWindow, ipcMain, dialog } = require('electron'); // dialog EKLENDİ
const path = require('path');
const LocalWSServer = require('./src/webSocketServer');
const ExcelExporter = require('./src/excelExporter');

let mainWindow;
let wsServer;
let extractedData = []; 

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            nodeIntegration: true, 
            contextIsolation: false
        },
        autoHideMenuBar: true, 
        title: "Prop Radar - Control Panel"
    });
    
    // Uygulamayı başlatıldığında tam ekran (maximize) yap
    mainWindow.maximize(); 
    mainWindow.loadFile('renderer/index.html');
}

app.whenReady().then(() => {
    createWindow();

    wsServer = new LocalWSServer(
        8080, 
        (data) => {
            if (mainWindow) mainWindow.webContents.send('ws-message', data);
            if (data.type === "DATA" && data.payload) {
                extractedData.push(data.payload);
            }
        },
        (isConnected, clientCount) => {
            if (mainWindow) mainWindow.webContents.send('ws-status', { isConnected, clientCount });
        }
    );
    
    wsServer.start();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

ipcMain.on('ui-command', async (event, command) => { 
    
    if (command === 'START_SCAN') {
        extractedData = []; 
        const success = wsServer.sendCommandToExtension({ action: 'START_SCAN' });
        event.reply('ui-command-reply', { success: success, message: success ? 'Tarama başlatıldı!' : 'Hata!' });
    } 
    
    // YENİ: Sadece durdurur, eklentiye emri yollar.
    else if (command === 'STOP_SCAN') {
        wsServer.sendCommandToExtension({ action: 'STOP_SCAN' });
        event.reply('ui-command-reply', { success: true, message: 'Tarama durduruldu.' });
    }

    // YENİ: Sadece hafızadaki (extractedData) verileri dışa aktarır.
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
                    .then(() => {
                        event.reply('ui-command-reply', { success: true, message: `Excel başarıyla oluşturuldu: ${filePath}` });
                    })
                    .catch(err => {
                        event.reply('ui-command-reply', { success: false, message: `Hata: ${err.message}` });
                    });
            } else {
                event.reply('ui-command-reply', { success: true, message: 'Excel aktarımı iptal edildi.' });
            }
        } else {
            event.reply('ui-command-reply', { success: false, message: 'Dışa aktarılacak veri bulunamadı.' });
        }
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});