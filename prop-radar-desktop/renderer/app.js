const { ipcRenderer } = require('electron');

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusText = document.getElementById('statusText');
const connectionDot = document.getElementById('connectionDot');
const logConsole = document.getElementById('logConsole');

// Terminal ekranına yeni satır ekleyen yardımcı fonksiyon
function addLog(message, type = 'system') {
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerText = `[${time}] ${message}`;
    logConsole.appendChild(entry);
    
    // Her yeni log geldiğinde scroll'u en aşağıya kaydır
    logConsole.scrollTop = logConsole.scrollHeight;
}

// 1. Buton Tıklamalarını Yakala ve Backend'e Gönder
startBtn.addEventListener('click', () => {
    ipcRenderer.send('ui-command', 'START_SCAN');
    startBtn.disabled = true;
    stopBtn.disabled = false;
    addLog('Sending START command to connected extension...', 'system');
});

stopBtn.addEventListener('click', () => {
    ipcRenderer.send('ui-command', 'STOP_SCAN');
    startBtn.disabled = false;
    stopBtn.disabled = true;
    addLog('Sending STOP command. Finalizing queue...', 'system');
});

// 2. Backend'den (main.js) Gelen Bağlantı Durumu Değişikliklerini Dinle
ipcRenderer.on('ws-status', (event, { isConnected, clientCount }) => {
    if (isConnected) {
        statusText.innerText = `Connected (${clientCount} Extension)`;
        connectionDot.className = 'indicator connected';
        startBtn.disabled = false; // Eklenti bağlandı, butonu aç
        addLog(`Extension successfully connected via WebSocket.`, 'system');
    } else {
        statusText.innerText = 'Disconnected';
        connectionDot.className = 'indicator disconnected';
        startBtn.disabled = true;
        stopBtn.disabled = true;
        addLog(`Extension disconnected. Waiting for connection...`, 'error');
    }
});

// 3. Eklentiden Gelen Anlık Verileri Ekrana Bas
ipcRenderer.on('ws-message', (event, data) => {
    if (data.type === "LOG") {
        addLog(data.message, 'system');
    } else if (data.type === "DATA") {
        addLog(`Extracted: ${data.payload.title} | ${data.payload.price}`, 'data');
    }
});

// 4. Komutlara Verilen Yanıtları Dinle (Hata kontrolü)
ipcRenderer.on('ui-command-reply', (event, response) => {
    if (!response.success) {
        addLog(`Error: ${response.message}`, 'error');
        startBtn.disabled = false; // Hata olduysa başlat butonunu tekrar aktif et
        stopBtn.disabled = true;
    }
});