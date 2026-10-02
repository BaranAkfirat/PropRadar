class SettingsManager {
    constructor() {
        this.konutTipleri = ["Daire", "Rezidans", "Müstakil Ev", "Villa", "Çiftlik Evi", "Köşk & Konak", "Yalı", "Yalı Dairesi", "Yazlık", "Kooperatif"];
        this.isyeriTipleri = ["Akaryakıt İstasyonu", "Apartman Dairesi", "Atölye", "Çiftlik", "Depo & Antrepo", "Dükkan & Mağaza", "Fabrika & Üretim Tesisi", "Garaj & Park Yeri", "Hamam, Sauna & Spa", "İmalathane", "İş Hanı Katı & Ofisi", "Komple Bina", "Maden Ocağı", "Ofis & Büro", "Okul", "Otopark", "Pazar Yeri", "Plaza", "Plaza Katı & Ofisi", "Rezidans Katı & Ofisi", "Spor Tesisi", "Toplantı & Etkinlik Salonu", "Villa"];
        
        this.initUI();
    }

    initUI() {
        this.renderGrid('konutTipleriGrid', 'konutType', this.konutTipleri, 'konutTumu');
        this.renderGrid('isyeriTipleriGrid', 'isyeriType', this.isyeriTipleri, 'isyeriTumu');
    }

    renderGrid(containerId, groupName, items, selectAllId) {
        const container = document.getElementById(containerId);
        const selectAllCb = document.getElementById(selectAllId);
        
        items.forEach((item, index) => {
            const label = document.createElement('label');
            label.className = 'radio-label disabled-text';
            
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = groupName;
            radio.value = item;
            radio.disabled = true; // Başlangıçta hepsi disable çünkü "Tümü" seçili
            if(index === 0) radio.checked = true; // Varsayılan ilki
            
            label.appendChild(radio);
            label.appendChild(document.createTextNode(' ' + item));
            container.appendChild(label);
        });

        // "Tümünü Seç" Checkbox Dinleyicisi
        selectAllCb.addEventListener('change', (e) => {
            const isAll = e.target.checked;
            const radios = container.querySelectorAll(`input[name="${groupName}"]`);
            const labels = container.querySelectorAll('.radio-label');
            
            radios.forEach(r => r.disabled = isAll);
            labels.forEach(l => isAll ? l.classList.add('disabled-text') : l.classList.remove('disabled-text'));
        });
    }

    // Seçilen verileri UrlBuilder'a vermek için paketle
    getPreferences() {
        const isKonutAll = document.getElementById('konutTumu').checked;
        const isIsyeriAll = document.getElementById('isyeriTumu').checked;
        
        return {
            il: document.getElementById('setIl').value.trim().toLowerCase(),
            ilce: document.getElementById('setIlce').value.trim().toLowerCase(),
            minFiyat: document.getElementById('setMinFiyat').value.trim(),
            maxFiyat: document.getElementById('setMaxFiyat').value.trim(),
            minM2: document.getElementById('setMinM2').value.trim(),
            maxM2: document.getElementById('setMaxM2').value.trim(),
            konutOzelSecim: isKonutAll ? null : document.querySelector('input[name="konutType"]:checked').value,
            isyeriOzelSecim: isIsyeriAll ? null : document.querySelector('input[name="isyeriType"]:checked').value
        };
    }
}
module.exports = SettingsManager;