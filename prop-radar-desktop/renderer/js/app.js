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
    // YENİ: Masada kayıtlı olan tüm ilan numaralarını bir listeye alıyoruz
    const knownIds = tableManager.appStateListings
        .map(item => item.ilanNo)
        .filter(no => no && no !== 'N/A');
    
    // YENİ: 'START_SCAN' komutunun yanına bu listeyi de paketleyip gönderiyoruz
    ipcRenderer.send('ui-command', { command: 'START_SCAN', knownIds: knownIds });
    
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

// --- YEDEK ALMA VE YÜKLEME (BACKUP) SİSTEMİ ---

// 1. Yedek Al Butonu
const exportBackupBtn = document.getElementById('exportBackupBtn');
if (exportBackupBtn) {
    exportBackupBtn.addEventListener('click', () => {
        // Tarayıcı önbelleğindeki (localStorage) ayarları paketle
        const backupData = {
            templates: localStorage.getItem('prop_radar_templates'),
            customStatuses: localStorage.getItem('prop_radar_custom_statuses'),
            preferences: localStorage.getItem('prop_radar_preferences')
        };
        // Arka plana yolla
        ipcRenderer.send('export-backup', backupData);
    });
}

// 2. Yedeği Yükle Butonu
const importBackupBtn = document.getElementById('importBackupBtn');
if (importBackupBtn) {
    importBackupBtn.addEventListener('click', () => {
        ipcRenderer.send('import-backup');
    });
}

// 3. Yükleme Başarılı Olduğunda
ipcRenderer.on('import-backup-success', (event, localData) => {
    // Gelen yedekteki ayarları localStorage'a yaz
    if (localData.templates) localStorage.setItem('prop_radar_templates', localData.templates);
    if (localData.customStatuses) localStorage.setItem('prop_radar_custom_statuses', localData.customStatuses);
    if (localData.preferences) localStorage.setItem('prop_radar_preferences', localData.preferences);
    
    alert('Yedek başarıyla yüklendi! Yeni verilerin uygulanması için sistem yeniden başlatılacak.');
    location.reload(); // Sayfayı yenileyerek yeni verilerin tabloya gelmesini sağla
});