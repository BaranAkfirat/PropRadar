const { shell } = require('electron');

class UrlBuilder {
    constructor(updateLogCallback, settingsManager) {
        this.updateLog = updateLogCallback;
        this.settingsManager = settingsManager;
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

    // YENİ VE GÜVENLİ SLUGIFY METODU (TÜRKÇE KARAKTER SORUNUNU ÇÖZER)
    slugify(text) {
        if (!text) return "";
        
        const trMap = {
            'ç': 'c', 'Ç': 'c',
            'ğ': 'g', 'Ğ': 'g',
            'ş': 's', 'Ş': 's',
            'ö': 'o', 'Ö': 'o',
            'ü': 'u', 'Ü': 'u',
            'ı': 'i', 'İ': 'i',
            'I': 'i'
        };

        // Önce Türkçe harfleri İngilizce eşlenikleriyle değiştir
        for (let key in trMap) {
            text = text.replace(new RegExp(key, 'g'), trMap[key]);
        }

        return text
            .toLowerCase() // Artık güvenle küçültebiliriz
            .replace(/[^a-z0-9\s-]/g, '') // Harf, sayı, boşluk ve tire DIŞINDAKİ her şeyi sil
            .replace(/\s+/g, '-')         // Boşlukları tireye çevir
            .replace(/-+/g, '-')          // Yan yana birden fazla tire varsa teke düşür
            .trim();                      // Baştaki ve sondaki boşluk/tireleri temizle
    }

    generateUrl() {
        const kategori = document.getElementById('kategoriSecim').value;
        const durum = document.getElementById('durumSecim').value;
        const platform = document.getElementById('platformSecim').value;

        if (platform === "hepsiemlak") return alert("Hepsiemlak entegrasyonu yakında eklenecektir.");
        if (!kategori || !durum) return alert("Lütfen Emlak Çeşidi ve Durumu seçiniz!");

        const prefs = this.settingsManager.getPreferences();
        
        if (!prefs.il || !prefs.ilce) {
            return alert("Lütfen Ayarlar sayfasından İl ve İlçe bilgisini (Zorunlu) doldurunuz.");
        }

        let basePath = "";

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
            basePath = durum;
            if (kategori !== "konut") basePath += `-${kategori}`;
        }

        let urlStr = `https://www.sahibinden.com/${basePath}/${this.slugify(prefs.il)}-${this.slugify(prefs.ilce)}/sahibinden`;
        let url = new URL(urlStr);

        if (prefs.minFiyat) url.searchParams.append('price_min', prefs.minFiyat);
        if (prefs.maxFiyat) url.searchParams.append('price_max', prefs.maxFiyat);
        if (prefs.minM2) url.searchParams.append('a24_min', prefs.minM2);
        if (prefs.maxM2) url.searchParams.append('a24_max', prefs.maxM2);

        this.updateLog(`Tarayıcı açılıyor: ${basePath}`);
        shell.openExternal(url.toString());
    }
}
module.exports = UrlBuilder;