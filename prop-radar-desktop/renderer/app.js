const { ipcRenderer, shell } = require('electron');

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const exportBtn = document.getElementById('exportBtn'); 
const statusText = document.getElementById('statusText');
const connectionDot = document.getElementById('connectionDot');
const miniLog = document.getElementById('miniLog');
const listingsBody = document.getElementById('listingsBody');

const mainView = document.getElementById('mainView');
const detailView = document.getElementById('detailView');
const backBtn = document.getElementById('backBtn');

let appStateListings = []; 

function updateLog(message, isError = false) {
    miniLog.innerText = message;
    miniLog.style.color = isError ? '#ff5252' : '#8bc34a';
}

startBtn.addEventListener('click', () => {
    ipcRenderer.send('ui-command', 'START_SCAN');
    startBtn.disabled = true;
    stopBtn.disabled = false;
    exportBtn.disabled = true;
    listingsBody.innerHTML = ''; 
    appStateListings = [];
    updateLog('Tarama başlatıldı. İlanlar bekleniyor...');
});

stopBtn.addEventListener('click', () => {
    ipcRenderer.send('ui-command', 'STOP_SCAN');
    startBtn.disabled = false;
    stopBtn.disabled = true;
    exportBtn.disabled = false; 
    updateLog('Durdurma sinyali gönderildi.');
});

exportBtn.addEventListener('click', () => {
    ipcRenderer.send('ui-command', 'EXPORT_EXCEL');
    updateLog('Excel dosyası oluşturuluyor...');
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

ipcRenderer.on('ws-message', (event, data) => {
    if (data.type === "LOG") {
        updateLog(data.message);
    } else if (data.type === "DATA" && data.payload) {
        addListingToTable(data.payload);
    }
});

ipcRenderer.on('ui-command-reply', (event, response) => {
    updateLog(response.message, !response.success);
});

function addListingToTable(item) {
    appStateListings.push(item);
    
    let firstPhoto = '';
    if (item.photos && item.photos !== 'N/A') {
        firstPhoto = item.photos.split(',')[0].trim();
    }

    const tr = document.createElement('tr');
    
    const tdImg = document.createElement('td');
    if (firstPhoto) {
        tdImg.innerHTML = `<img src="${firstPhoto}" class="thumb-img" alt="thumb">`;
    } else {
        tdImg.innerHTML = `<div class="empty-thumb">Yok</div>`;
    }

    let platform = 'Bilinmiyor';
    try {
        platform = new URL(item.url).hostname.replace('www.', '');
    } catch(e) {
        platform = 'sahibinden.com';
    }

    tr.innerHTML = `
        <td><span class="platform-badge">${platform.split('.')[0]}</span></td>
        <td>${item.ilanTarihi && item.ilanTarihi !== 'N/A' ? item.ilanTarihi : '-'}</td>
        <td>${item.title}</td>
        <td style="font-weight: bold; color: #4CAF50;">${item.price}</td>
        <td>${item.emlakTipi}</td>
        <td>${item.odaSayisi}</td>
        <td><span style="font-weight:600;">${item.locationCity}</span><br><span style="font-size:12px; color:#888;">${item.locationTown}</span></td>
        <td>${item.sellerName} <br><small style="color:#888;">${item.kimden}</small></td>
        <td>${item.phone}</td>
    `;
    
    tr.prepend(tdImg);

    tr.addEventListener('click', () => {
        openDetailPage(item); 
    });

    listingsBody.appendChild(tr);
    document.querySelector('.table-container').scrollTop = document.querySelector('.table-container').scrollHeight;
}

// ---------------- DETAY SAYFASI YÖNETİMİ ---------------- //

let currentListingUrl = ''; 

document.getElementById('openUrlBtn').addEventListener('click', () => {
    if (currentListingUrl) {
        shell.openExternal(currentListingUrl); 
    }
});

function openDetailPage(item) {
    mainView.style.display = 'none';
    detailView.style.display = 'flex';

    currentListingUrl = item.url;

    document.getElementById('detailTitle').innerText = item.title;
    document.getElementById('detailPrice').innerText = item.price;
    document.getElementById('detailDesc').innerText = item.description;

    // FOTOĞRAF GALERİSİ DÖNGÜSÜ (Eksik olan kısım burasıydı)
    const gallery = document.getElementById('detailGallery');
    gallery.innerHTML = '';
    if (item.photos && item.photos !== 'N/A') {
        const photoUrls = item.photos.split(',');
        photoUrls.forEach(url => {
            const img = document.createElement('img');
            img.src = url.trim();
            gallery.appendChild(img);
        });
    } else {
        gallery.innerHTML = '<div style="color:#666; padding: 20px;">Fotoğraf bulunamadı.</div>';
    }

    const featuresContainer = document.getElementById('detailFeatures');
    featuresContainer.innerHTML = '';
    
    const specs = [
        { label: 'Adres', val: `${item.locationCity} / ${item.locationTown} / ${item.locationQuarter}` },
        { label: 'İlan No', val: item.ilanNo }, { label: 'Tarih', val: item.ilanTarihi },
        { label: 'Satıcı', val: item.sellerName }, { label: 'Telefon', val: item.phone },
        { label: 'Oda Sayısı', val: item.odaSayisi }, { label: 'm² (Net)', val: item.m2Net },
        { label: 'Bina Yaşı', val: item.binaYasi }, { label: 'Bulunduğu Kat', val: item.bulunduguKat },
        { label: 'Eşyalı', val: item.esyali }, { label: 'Aidat', val: item.aidat }
    ];

    specs.forEach(spec => {
        const div = document.createElement('div');
        div.className = 'feature-item';
        div.innerHTML = `<span class="feature-label">${spec.label}</span><span class="feature-value">${spec.val}</span>`;
        featuresContainer.appendChild(div);
    });
}

backBtn.addEventListener('click', () => {
    detailView.style.display = 'none';
    mainView.style.display = 'block';
});

// ---------------- ARAMA VE FİLTRELEME ---------------- //

const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase();
    const rows = listingsBody.querySelectorAll('tr');
    
    rows.forEach(row => {
        const rowText = row.innerText.toLowerCase();
        if (rowText.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
});

// ---------------- SIRALAMA (SORTING) MANTIĞI ---------------- //

const trMonths = { 'ocak': 1, 'şubat': 2, 'mart': 3, 'nisan': 4, 'mayıs': 5, 'haziran': 6, 'temmuz': 7, 'ağustos': 8, 'eylül': 9, 'ekim': 10, 'kasım': 11, 'aralık': 12 };

function parseTurkishDate(dateStr) {
    const parts = dateStr.trim().toLowerCase().split(' ');
    if (parts.length >= 3) {
        const day = parseInt(parts[0]) || 1;
        const month = trMonths[parts[1]] || 1;
        const year = parseInt(parts[2]) || 1970;
        return new Date(year, month - 1, day).getTime();
    }
    return 0; 
}

document.querySelectorAll('th.sortable').forEach(th => {
    th.dataset.dir = 'asc'; 

    th.addEventListener('click', () => {
        const tbody = document.getElementById('listingsBody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        const idx = Array.from(th.parentNode.children).indexOf(th);
        
        const isAsc = th.dataset.dir === 'asc';
        th.dataset.dir = isAsc ? 'desc' : 'asc';
        
        document.querySelectorAll('th.sortable span').forEach(span => span.innerText = '↕');
        th.querySelector('span').innerText = isAsc ? '↓' : '↑';

        rows.sort((a, b) => {
            let v1 = a.children[idx].innerText.trim();
            let v2 = b.children[idx].innerText.trim();
            
            if (idx === 4) {
                const num1 = parseInt(v1.replace(/[^0-9]/g, '')) || 0;
                const num2 = parseInt(v2.replace(/[^0-9]/g, '')) || 0;
                return isAsc ? num1 - num2 : num2 - num1;
            }
            
            if (idx === 2) {
                const date1 = parseTurkishDate(v1);
                const date2 = parseTurkishDate(v2);
                return isAsc ? date1 - date2 : date2 - date1;
            }
            
            return isAsc ? v1.localeCompare(v2, 'tr') : v2.localeCompare(v1, 'tr');
        });

        rows.forEach(row => tbody.appendChild(row));
    });
});