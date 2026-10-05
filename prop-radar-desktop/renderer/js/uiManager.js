const { shell } = require('electron');

class UIManager {
    constructor() {
        // Log ve Durum Elemanları
        this.miniLog = document.getElementById('miniLog');
        this.statusText = document.getElementById('statusText');
        this.connectionDot = document.getElementById('connectionDot');

        // Butonlar
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.exportBtn = document.getElementById('exportBtn');

        // Küp (Mod) Elemanları
        this.toggleCubeBtn = document.getElementById('toggleCubeBtn');
        this.actionCube = document.getElementById('actionCube');

        // Görünümler (Views)
        this.mainView = document.getElementById('mainView');
        this.detailView = document.getElementById('detailView');
        this.settingsView = document.getElementById('settingsView'); // YENİ EKLENDİ
        
        // Sayfa Geçiş Butonları
        this.backBtn = document.getElementById('backBtn');
        this.openUrlBtn = document.getElementById('openUrlBtn');
        this.settingsBtn = document.getElementById('settingsBtn'); // YENİ EKLENDİ
        this.settingsBackBtn = document.getElementById('settingsBackBtn'); // YENİ EKLENDİ
        
        this.currentListingUrl = '';

        this.initListeners();
    }

    initListeners() {
        // 3D Küp Döndürme
        this.toggleCubeBtn.addEventListener('click', () => {
            this.actionCube.classList.toggle('show-browser');
        });

        // Detay Sayfasından Geri Dönme
        this.backBtn.addEventListener('click', () => {
            this.detailView.style.display = 'none';
            this.mainView.style.display = 'block';
        });

        // Detay Sayfasında İlanı Tarayıcıda Açma
        this.openUrlBtn.addEventListener('click', () => {
            if (this.currentListingUrl) {
                shell.openExternal(this.currentListingUrl);
            }
        });

        // Ayarlar Sayfasını Açma
        this.settingsBtn.addEventListener('click', () => {
            this.mainView.style.display = 'none';
            this.detailView.style.display = 'none';
            this.settingsView.style.display = 'flex';
        });

        // Ayarlar Sayfasından Geri Dönme
        this.settingsBackBtn.addEventListener('click', () => {
            this.settingsView.style.display = 'none';
            this.mainView.style.display = 'block';
        });
    }

    updateLog(message, isError = false) {
        this.miniLog.innerText = message;
        this.miniLog.style.color = isError ? '#ff5252' : '#8bc34a';
    }

    updateConnectionStatus(isConnected, clientCount) {
        if (isConnected) {
            this.statusText.innerText = `Bağlı (${clientCount})`;
            this.connectionDot.className = 'indicator connected';
            this.startBtn.disabled = false;
            this.updateLog('Eklenti bağlandı. Hazır.');
        } else {
            this.statusText.innerText = 'Bağlantı Koptu';
            this.connectionDot.className = 'indicator disconnected';
            this.startBtn.disabled = true;
            this.stopBtn.disabled = true;
            this.updateLog('Eklenti bağlantısı bekleniyor...', true);
        }
    }

    setScanState(isScanning) {
        if (isScanning) {
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.exportBtn.disabled = true;
            this.updateLog('Tarama başlatıldı. İlanlar bekleniyor...');
        } else {
            this.startBtn.disabled = false;
            this.stopBtn.disabled = true;
            this.exportBtn.disabled = false;
            this.updateLog('Durdurma sinyali gönderildi.');
        }
    }

    openDetailPage(item) {
        this.mainView.style.display = 'none';
        this.detailView.style.display = 'flex';
        this.currentListingUrl = item.url;

        // Başlık ve Temel Bilgiler
        document.getElementById('detailTitle').innerText = item.title;
        document.getElementById('detailPrice').innerText = item.price;
        document.getElementById('detailDesc').innerText = item.description;

        // Galeri Yönetimi
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

        // Özellik (Feature) Grid Yönetimi
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
}

module.exports = UIManager;