const { shell } = require('electron');
const storageService = require('./storageService'); 

class UIManager {
    constructor() {
        // --- 1. DOM ELEMENT REFERANSLARI ---
        
        // Açılış (Landing) Ekranı ve Ana Uygulama Konteyneri
        this.landingScreen = document.getElementById('landingScreen');
        this.mainApp = document.getElementById('mainApp');
        
        // Açılış Modülleri ve Login Modal
        this.btnEmlak = document.getElementById('btnEmlak');
        this.loginModalOverlay = document.getElementById('loginModalOverlay');
        this.closeLoginBtn = document.getElementById('closeLoginBtn');
        this.submitLicenseBtn = document.getElementById('submitLicenseBtn');
        this.licenseKeyInput = document.getElementById('licenseKeyInput');
        this.rememberMeCb = document.getElementById('rememberMeCb'); 
        this.loginErrorMsg = document.getElementById('loginErrorMsg');
        this.logoutBtn = document.getElementById('logoutBtn');

        // Üst Panel (Header) Log ve Durum Elemanları
        this.miniLog = document.getElementById('miniLog');
        this.statusText = document.getElementById('statusText');
        this.connectionDot = document.getElementById('connectionDot');

        // Tarama ve İşlem Butonları (3D Küp Ön Yüzü)
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.exportBtn = document.getElementById('exportBtn');

        // 3D Küp Elemanları
        this.toggleCubeBtn = document.getElementById('toggleCubeBtn');
        this.actionCube = document.getElementById('actionCube');

        // Uygulama İçi Görünümler (Views)
        this.mainView = document.getElementById('mainView');         // Tablo ekranı
        this.detailView = document.getElementById('detailView');     // İlan detay ekranı
        this.settingsView = document.getElementById('settingsView'); // Ayarlar ekranı
        
        // Ekran Arası Geçiş Butonları
        this.backBtn = document.getElementById('backBtn');
        this.openUrlBtn = document.getElementById('openUrlBtn');
        this.settingsBtn = document.getElementById('settingsBtn'); 
        this.settingsBackBtn = document.getElementById('settingsBackBtn'); 
        
        this.currentListingUrl = '';

        // --- 2. BAŞLATICI METOTLAR ---
        this.initListeners();
        this.loadSavedLicense();
    }

    // Uygulama açıldığında daha önce "Beni Hatırla" denilmiş mi diye kontrol eder
    loadSavedLicense() {
        if (!this.licenseKeyInput) return;
        
        const savedKey = storageService.getLicenseKey();
        if (savedKey) {
            this.licenseKeyInput.value = savedKey;
            this.rememberMeCb.checked = true;
        }
    }

    initListeners() {
        // ==========================================
        // 1. AÇILIŞ VE LİSANS GİRİŞ (LOGIN) AKIŞI
        // ==========================================
        
        // Emlak modülüne tıklayınca Lisans Modalını açar
        if (this.btnEmlak) {
            this.btnEmlak.addEventListener('click', () => {
                this.loginModalOverlay.style.display = 'flex';
                this.licenseKeyInput.focus();
            });
        }

        // Login Kutusunu Kapatır (Vazgeç)
        if (this.closeLoginBtn) {
            this.closeLoginBtn.addEventListener('click', () => {
                this.loginModalOverlay.style.display = 'none';
                this.loginErrorMsg.style.display = 'none';
            });
        }

        // Lisans Doğrulama ve Giriş Yapma
        if (this.submitLicenseBtn) {
            this.submitLicenseBtn.addEventListener('click', () => {
                const key = this.licenseKeyInput.value.trim();
                
                // Şimdilik sahte doğrulama: 5 karakterden uzunsa kabul et
                if (key.length > 5) { 
                    
                    // Beni Hatırla işaretliyse servise kaydet, değilse servisten sil
                    if (this.rememberMeCb.checked) {
                        storageService.saveLicenseKey(key);
                    } else {
                        storageService.removeLicenseKey();
                    }

                    // Ekranları ayarla: Modal ve Landing'i gizle, Ana Uygulamayı aç
                    this.loginModalOverlay.style.display = 'none';
                    this.landingScreen.style.display = 'none';
                    this.loginErrorMsg.style.display = 'none';
                    
                    this.mainApp.style.display = 'flex';
                    this.mainApp.style.flexDirection = 'column';
                    
                    // Giriş yapıldığında her zaman ana tablo ekranının (mainView) açılmasını sağla
                    this.settingsView.style.display = 'none';
                    this.detailView.style.display = 'none';
                    this.mainView.style.display = 'block';
                    
                    this.updateLog('Sisteme başarıyla giriş yapıldı.');
                } else {
                    // Kurala uymuyorsa hata mesajını göster
                    this.loginErrorMsg.style.display = 'block';
                }
            });
        }

        // ==========================================
        // 2. ÇIKIŞ YAP (LOGOUT) AKIŞI
        // ==========================================
        
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => {
                try {
                    // Ana uygulamayı ve açık olan her view'ı gizle
                    if (this.mainApp) this.mainApp.style.display = 'none';
                    if (this.settingsView) this.settingsView.style.display = 'none';
                    if (this.mainView) this.mainView.style.display = 'none';
                    if (this.detailView) this.detailView.style.display = 'none';
                    
                    // En baştaki Modül Seçim (Landing) ekranını tekrar göster
                    if (this.landingScreen) this.landingScreen.style.display = 'flex';
                    
                    // Güvenli 'Beni Hatırla' Kontrolü
                    if (this.rememberMeCb && !this.rememberMeCb.checked) {
                        if (this.licenseKeyInput) this.licenseKeyInput.value = '';
                    }
                    
                    // Eklenti tarama işlemi devam ediyorsa durdur
                    if (this.stopBtn && !this.stopBtn.disabled) {
                        this.stopBtn.click();
                    }
                    
                    if (this.loginErrorMsg) {
                        this.loginErrorMsg.style.display = 'none';
                    }
                    
                    console.log("[SİSTEM] Başarıyla çıkış yapıldı ve ana ekrana dönüldü.");
                } catch (error) {
                    console.error("[HATA] Çıkış yapılırken sorun oluştu:", error);
                }
            });
        } else {
            console.error("[HATA] HTML'de id='logoutBtn' olan bir buton bulunamadı!");
        }

        // ==========================================
        // 3. UYGULAMA İÇİ EKRAN GEÇİŞLERİ VE KÜP
        // ==========================================
        
        // 3D Küp animasyonu (Arama formu ve Tarama butonları arası geçiş)
        this.toggleCubeBtn.addEventListener('click', () => {
            this.actionCube.classList.toggle('show-browser');
        });

        // İlan Detayından Ana Tabloya Dönüş
        this.backBtn.addEventListener('click', () => {
            this.detailView.style.display = 'none';
            this.mainView.style.display = 'block';
        });

        // İlan Detayındayken Tarayıcıda Aç
        this.openUrlBtn.addEventListener('click', () => {
            if (this.currentListingUrl) {
                shell.openExternal(this.currentListingUrl);
            }
        });

        // Sağ Üst Ayarlar İkonuna Tıklayınca Ayarlar Sayfasını Aç
        this.settingsBtn.addEventListener('click', () => {
            this.mainView.style.display = 'none';
            this.detailView.style.display = 'none';
            this.settingsView.style.display = 'flex';
        });

        // Ayarlar Sayfasından Geri (Ana Tabloya) Dönüş
        this.settingsBackBtn.addEventListener('click', () => {
            this.settingsView.style.display = 'none';
            this.mainView.style.display = 'block';
        });
    }

    // ==========================================
    // 4. DURUM VE BİLDİRİM GÜNCELLEMELERİ
    // ==========================================

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

    // ==========================================
    // 5. DETAY SAYFASI RENDER İŞLEMİ
    // ==========================================
    openDetailPage(item) {
        // Tabloyu gizle, detay sayfasını göster
        this.mainView.style.display = 'none';
        this.detailView.style.display = 'flex';
        this.currentListingUrl = item.url;

        // Başlık, fiyat ve açıklamaları bas
        document.getElementById('detailTitle').innerText = item.title;
        document.getElementById('detailPrice').innerText = item.price;
        document.getElementById('detailDesc').innerText = item.description;

        // Fotoğraf Galerisini oluştur
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

        // İlan Özellikleri Kutu (Grid) Tasarımını Doldur
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