const { ipcRenderer, shell } = require('electron');
const TableManager = require('./js/tableManager'); // DOM Tablo işlemleri (sıralama, render)
const SettingsManager = require('./js/settingsManager'); // YENİ EKLENDİ: Ayarlar modülü
const UrlBuilder = require('./js/urlBuilder');     // Filtre ve tarayıcı linkleri
const UIManager = require('./js/uiManager');       // View geçişleri, log güncellemeleri

const ui = new UIManager();
const settings = new SettingsManager(); // Ayarlar nesnesi oluşturuldu
const urlBuilder = new UrlBuilder(ui.updateLog.bind(ui), settings); // Ayarlar nesnesi urlBuilder'a gönderildi
const tableManager = new TableManager(ui, ipcRenderer);

document.addEventListener('DOMContentLoaded', async () => {
    const savedListings = await ipcRenderer.invoke('load-data');
    if (savedListings && savedListings.length > 0) {
        savedListings.forEach(item => tableManager.addListing(item, false));
        ui.updateLog(`[SİSTEM] ${savedListings.length} geçmiş ilan yüklendi.`);
        document.getElementById('exportBtn').disabled = false;
    }
});

document.getElementById('startBtn').addEventListener('click', () => {
    ipcRenderer.send('ui-command', 'START_SCAN');
    ui.setScanState(true);
});

document.getElementById('stopBtn').addEventListener('click', () => {
    ipcRenderer.send('ui-command', 'STOP_SCAN');
    ui.setScanState(false);
});

document.getElementById('exportBtn').addEventListener('click', () => {
    ipcRenderer.send('ui-command', 'EXPORT_EXCEL');
    ui.updateLog('Excel dosyası oluşturuluyor...');
});

ipcRenderer.on('ws-status', (event, { isConnected, clientCount }) => {
    ui.updateConnectionStatus(isConnected, clientCount);
});

ipcRenderer.on('ws-message', (event, data) => {
    if (data.type === "LOG") {
        ui.updateLog(data.message);
    } else if (data.type === "DATA" && data.payload) {
        tableManager.addListing(data.payload, true);
    }
});

ipcRenderer.on('ui-command-reply', (event, response) => {
    ui.updateLog(response.message, !response.success);
});