const { ipcRenderer } = require('electron');

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusText = document.getElementById('statusText');
const connectionDot = document.getElementById('connectionDot');
const miniLog = document.getElementById('miniLog');
const listingsBody = document.getElementById('listingsBody');

// Gelen verileri geçici olarak arayüzde tutacağımız dizi (Detay sayfası için gerekli olacak)
let appStateListings = []; 

function updateLog(message, isError = false) {
    miniLog.innerText = message;
    miniLog.style.color = isError ? '#ff5252' : '#8bc34a';
}

startBtn.addEventListener('click', () => {
    ipcRenderer.send('ui-command', 'START_SCAN');
    startBtn.disabled = true;
    stopBtn.disabled = false;
    listingsBody.innerHTML = ''; // Yeni taramada tabloyu temizle
    appStateListings = [];
    updateLog('Tarama başlatıldı. İlanlar bekleniyor...');
});

stopBtn.addEventListener('click', () => {
    ipcRenderer.send('ui-command', 'STOP_SCAN');
    startBtn.disabled = false;
    stopBtn.disabled = true;
    updateLog('Durdurma sinyali gönderildi.');
});

ipcRenderer.on('ws-status', (event, { isConnected, clientCount }) => {
    if (isConnected) {
        statusText.innerText = `Bağlı (${clientCount})`;
        connectionDot.className = 'indicator connected';
        startBtn.disabled = false;
        updateLog('Eklenti bağlandı. Hazır.');
    } else {
        statusText.innerText = 'Bağlantı Koptu';
        connectionDot.className = 'indicator disconnected';
        startBtn.disabled = true;
        stopBtn.disabled = true;
        updateLog('Eklenti bağlantısı bekleniyor...', true);
    }
});

// Arka plandan mesaj/veri geldiğinde
ipcRenderer.on('ws-message', (event, data) => {
    if (data.type === "LOG") {
        updateLog(data.message);
    } else if (data.type === "DATA" && data.payload) {
        addListingToTable(data.payload);
    }
});

ipcRenderer.on('ui-command-reply', (event, response) => {
    updateLog(response.message, !response.success);
    if (!response.success || response.message.includes('durdu')) {
        startBtn.disabled = false;
        stopBtn.disabled = true;
    }
});

// Gelen ilanı tabloya ekleyen fonksiyon
function addListingToTable(item) {
    appStateListings.push(item);
    
    // Fotoğraflar virgülle ayrılmış string olarak geliyor, ilkini alıyoruz
    let firstPhoto = '';
    if (item.photos && item.photos !== 'N/A') {
        firstPhoto = item.photos.split(',')[0].trim();
    }

    const tr = document.createElement('tr');
    
    // Görsel Sütunu
    const tdImg = document.createElement('td');
    if (firstPhoto) {
        tdImg.innerHTML = `<img src="${firstPhoto}" class="thumb-img" alt="thumb">`;
    } else {
        tdImg.innerHTML = `<div class="empty-thumb">Yok</div>`;
    }

    tr.innerHTML = `
        <td>${item.title}</td>
        <td style="font-weight: bold; color: #4CAF50;">${item.price}</td>
        <td>${item.emlakTipi}</td>
        <td>${item.odaSayisi}</td>
        <td>${item.sellerName} <br><small style="color:#888;">${item.kimden}</small></td>
        <td>${item.phone}</td>
    `;
    
    tr.prepend(tdImg);

    // Satıra tıklandığında detay sayfasını açmak için (Bir sonraki adımda içini dolduracağız)
    tr.addEventListener('click', () => {
        console.log("Seçilen İlan:", item);
        // openDetailPage(item); 
    });

    listingsBody.appendChild(tr);
    
    // Yeni veri eklendikçe tabloyu en aşağı kaydır
    document.querySelector('.table-container').scrollTop = document.querySelector('.table-container').scrollHeight;
}