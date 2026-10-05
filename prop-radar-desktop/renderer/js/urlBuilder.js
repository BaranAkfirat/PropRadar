const { shell } = require('electron');

class UrlBuilder {
    constructor(updateLogCallback, settingsManager) {
        this.updateLog = updateLogCallback;
        this.settingsManager = settingsManager; // Ayarlar yöneticisini içeri aldık
        this.durumVerileri = {
            "konut": [{ etiket: "Satılık", deger: "satilik" }, { etiket: "Kiralık", deger: "kiralik" }, { etiket: "Turistik Günlük Kiralık", deger: "gunluk-kiralik" }, { etiket: "Devren Satılık Konut", deger: "devren-satilik-konut" }],
            "is-yeri": [{ etiket: "Satılık", deger: "satilik" }, { etiket: "Kiralık", deger: "kiralik" }, { etiket: "Devren Satılık", deger: "devren-satilik" }, { etiket: "Devren Kiralık", deger: "devren-kiralik" }],
            "arsa": [{ etiket: "Kat Karşılığı Satılık", deger: "kat-karsiligi-satilik" }, { etiket: "Satılık", deger: "satilik" }, { etiket: "Kiralık", deger: "kiralik" }],
            "bina": [{ etiket: "Satılık", deger: "satilik" }, { etiket: "Kiralık", deger: "kiralik" }],
            "devre-mulk": [{ etiket: "Satılık", deger: "satilik" }, { etiket: "Kiralık", deger: "kiralik" }]
        };
        this.initListeners();
    }

    initListeners() {
        const kategoriSecim = document.getElementById('kategoriSecim');
        const durumSecim = document.getElementById('durumSecim');
        
        kategoriSecim.addEventListener('change', (e) => {
            const secilenKategori = e.target.value;
            durumSecim.innerHTML = '<option value="">Seçiniz...</option>';
            if (secilenKategori && this.durumVerileri[secilenKategori]) {
                durumSecim.disabled = false;
                this.durumVerileri[secilenKategori].forEach(durum => {
                    let option = document.createElement('option');
                    option.value = durum.deger;
                    option.textContent = durum.etiket;
                    durumSecim.appendChild(option);
                });
            } else {
                durumSecim.disabled = true;
            }
        });

        document.getElementById('araButonu').addEventListener('click', () => this.generateUrl());
    }

    // Türkçe karakterleri ve boşlukları URL formatına uygun hale getiren metod
    slugify(text) {
        return text.toString().toLowerCase()
            .replace(/&/g, '')
            .replace(/,/g, '')
            .replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/ğ/g, 'g')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }

    generateUrl() {
        const kategori = document.getElementById('kategoriSecim').value;
        const durum = document.getElementById('durumSecim').value;
        const platform = document.getElementById('platformSecim').value;

        if (platform === "hepsiemlak") return alert("Hepsiemlak entegrasyonu yakında eklenecektir.");
        if (!kategori || !durum) return alert("Lütfen Emlak Çeşidi ve Durumu seçiniz!");

        // Ayarlardan tercihleri al
        const prefs = this.settingsManager.getPreferences();
        
        if (!prefs.il || !prefs.ilce) {
            return alert("Lütfen Ayarlar sayfasından İl ve İlçe bilgisini (Zorunlu) doldurunuz.");
        }

        let basePath = "";

        // İstenilen URL Kuralı İşleyişi
        if (kategori === "konut") {
            if (prefs.konutOzelSecim) {
                basePath = `${durum}-${this.slugify(prefs.konutOzelSecim)}`;
            } else {
                basePath = durum;
            }
        } 
        else if (kategori === "is-yeri") {
            if (prefs.isyeriOzelSecim) {
                basePath = `${durum}-is-yeri-${this.slugify(prefs.isyeriOzelSecim)}`;
            } else {
                basePath = `${durum}-is-yeri`;
            }
        }
        else {
            // Arsa, bina, devre mülk için varsayılan format
            basePath = durum;
            if (kategori !== "konut") basePath += `-${kategori}`;
        }

        // URL'yi oluştur: https://www.sahibinden.com/{durum-kategori}/{il}-{ilce}/sahibinden
        let urlStr = `https://www.sahibinden.com/${basePath}/${this.slugify(prefs.il)}-${this.slugify(prefs.ilce)}/sahibinden`;
        let url = new URL(urlStr);

        // Fiyat ve m2 Parametreleri (Sahibinden Filtre Formatı)
        if (prefs.minFiyat) url.searchParams.append('price_min', prefs.minFiyat);
        if (prefs.maxFiyat) url.searchParams.append('price_max', prefs.maxFiyat);
        if (prefs.minM2) url.searchParams.append('a24_min', prefs.minM2);
        if (prefs.maxM2) url.searchParams.append('a24_max', prefs.maxM2);

        this.updateLog(`Tarayıcı açılıyor: ${basePath}`);
        shell.openExternal(url.toString());
    }
}
module.exports = UrlBuilder;