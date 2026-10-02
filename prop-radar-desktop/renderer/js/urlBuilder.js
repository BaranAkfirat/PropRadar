const { shell } = require('electron');

class UrlBuilder {
    constructor(updateLogCallback) {
        this.updateLog = updateLogCallback;
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

    generateUrl() {
        const kategori = document.getElementById('kategoriSecim').value;
        const durum = document.getElementById('durumSecim').value;
        const platform = document.getElementById('platformSecim').value;

        if (platform === "hepsiemlak") return alert("Hepsiemlak entegrasyonu yakında eklenecektir.");
        if (!kategori || !durum) return alert("Lütfen Emlak Çeşidi ve Durumu seçiniz!");

        let url = `https://www.sahibinden.com/${durum}`;
        if (kategori !== "konut") url += `-${kategori}`;
        
        url += "/sahibinden";
        this.updateLog(`Tarayıcı bağlantısı oluşturuldu: ${kategori} -> ${durum}`);
        shell.openExternal(url);
    }
}
module.exports = UrlBuilder;