const apiService = require('./apiService');
const storageService = require('./storageService');

class SettingsManager {
    constructor() {
        this.konutTipleri = ["Daire", "Rezidans", "Müstakil Ev", "Villa", "Çiftlik Evi", "Köşk & Konak", "Yalı", "Yalı Dairesi", "Yazlık", "Kooperatif"];
        this.isyeriTipleri = ["Akaryakıt İstasyonu", "Apartman Dairesi", "Atölye", "Çiftlik", "Depo & Antrepo", "Dükkan & Mağaza", "Fabrika & Üretim Tesisi", "Garaj & Park Yeri", "Hamam, Sauna & Spa", "İmalathane", "İş Hanı Katı & Ofisi", "Komple Bina", "Maden Ocağı", "Ofis & Büro", "Okul", "Otopark", "Pazar Yeri", "Plaza", "Plaza Katı & Ofisi", "Rezidans Katı & Ofisi", "Spor Tesisi", "Toplantı & Etkinlik Salonu", "Villa"];
        
        this.templates = []; 
        this.currentTemplateId = null;
        this.provinces = [];

        this.initUI();
    }

    async initUI() {
        // Arayüzü hazırla
        this.renderGrid('konutTipleriGrid', 'konutType', this.konutTipleri, 'konutTumu');
        this.renderGrid('isyeriTipleriGrid', 'isyeriType', this.isyeriTipleri, 'isyeriTumu');
        this.initTabs();
        this.initTemplateListeners();
        
        // Verileri servislerden çek
        await this.loadProvincesFromAPI();
        this.loadTemplatesFromStorage();
    }

    // --- API ENTEGRASYONU ---
    
    async loadProvincesFromAPI() {
        const ilSelect = document.getElementById('setIl');
        this.provinces = await apiService.getProvinces();
        
        if (this.provinces.length === 0) {
            ilSelect.innerHTML = '<option value="">Bağlantı Hatası!</option>';
            return;
        }

        ilSelect.innerHTML = '<option value="">İl Seçiniz...</option>';
        this.provinces.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.name;
            opt.dataset.id = p.id;
            opt.textContent = p.name;
            ilSelect.appendChild(opt);
        });

        ilSelect.addEventListener('change', async (e) => {
            const selectedIndex = e.target.selectedIndex;
            if (selectedIndex > 0) {
                const pId = e.target.options[selectedIndex].dataset.id;
                await this.loadDistrictsFromAPI(pId);
            } else {
                const ilceSelect = document.getElementById('setIlce');
                ilceSelect.innerHTML = '<option value="">Önce İl Seçin</option>';
                ilceSelect.disabled = true;
            }
        });
    }

    async loadDistrictsFromAPI(provinceId, districtToSelect = null) {
        const ilceSelect = document.getElementById('setIlce');
        ilceSelect.innerHTML = '<option value="">İlçeler Yükleniyor...</option>';
        ilceSelect.disabled = true;

        const districts = await apiService.getDistricts(provinceId);

        if (districts.length === 0) {
            ilceSelect.innerHTML = '<option value="">Hata!</option>';
            return;
        }
        
        ilceSelect.innerHTML = '<option value="">İlçe Seçiniz...</option>';
        districts.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.name;
            opt.textContent = d.name;
            ilceSelect.appendChild(opt);
        });
        
        ilceSelect.disabled = false;
        if (districtToSelect) {
            ilceSelect.value = districtToSelect;
        }
    }

    // --- SEKME (TAB) VE EKRAN RENDER ---
    
    initTabs() {
        const tabs = document.querySelectorAll('.settings-tab');
        const contents = document.querySelectorAll('.settings-tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.style.display = 'none');
                
                e.target.classList.add('active');
                document.getElementById(e.target.dataset.target).style.display = 'block';
            });
        });
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
            radio.disabled = true;
            if(index === 0) radio.checked = true;
            
            label.appendChild(radio);
            label.appendChild(document.createTextNode(' ' + item));
            container.appendChild(label);
        });

        selectAllCb.addEventListener('change', (e) => {
            const isAll = e.target.checked;
            const radios = container.querySelectorAll(`input[name="${groupName}"]`);
            const labels = container.querySelectorAll('.radio-label');
            
            radios.forEach(r => r.disabled = isAll);
            labels.forEach(l => isAll ? l.classList.add('disabled-text') : l.classList.remove('disabled-text'));
        });
    }

    // --- ŞABLON (KAYIT ALANI) YÖNETİMİ ---
    
    initTemplateListeners() {
        document.getElementById('addNewTemplateBtn').addEventListener('click', () => this.createNewTemplate());
        document.getElementById('saveTemplateBtn').addEventListener('click', () => this.saveCurrentTemplate());
        document.getElementById('deleteTemplateBtn').addEventListener('click', () => this.deleteCurrentTemplate());
    }

    loadTemplatesFromStorage() {
        this.templates = storageService.getTemplates();
        
        if (this.templates.length === 0) {
            this.templates.push(this.getDefaultTemplateObject('Varsayılan Kayıt'));
        }
        
        this.currentTemplateId = this.templates[0].id;
        this.renderTemplateList();
        this.populateForm(this.templates[0]);
    }

    renderTemplateList() {
        const container = document.getElementById('templateList');
        container.innerHTML = '';

        this.templates.forEach(t => {
            const btn = document.createElement('button');
            btn.className = `slot-btn ${t.id === this.currentTemplateId ? 'active' : ''}`;
            btn.innerText = t.name;
            btn.addEventListener('click', () => {
                this.currentTemplateId = t.id;
                this.renderTemplateList(); 
                this.populateForm(t);
            });
            container.appendChild(btn);
        });
    }

    getDefaultTemplateObject(name) {
        return {
            id: 'tmpl_' + Date.now(),
            name: name,
            il: '', ilce: '', minFiyat: '', maxFiyat: '', minM2: '', maxM2: '',
            konutTumu: true, konutType: 'Daire',
            isyeriTumu: true, isyeriType: 'Akaryakıt İstasyonu'
        };
    }

    showCustomPrompt(defaultText, callback) {
        const overlay = document.getElementById('customPromptOverlay');
        const input = document.getElementById('customPromptInput');
        const okBtn = document.getElementById('customPromptOk');
        const cancelBtn = document.getElementById('customPromptCancel');

        input.value = defaultText;
        overlay.style.display = 'flex';
        input.focus();

        const cleanup = () => {
            overlay.style.display = 'none';
            okBtn.onclick = null;
            cancelBtn.onclick = null;
        };

        okBtn.onclick = () => {
            if (input.value.trim() !== '') {
                cleanup();
                callback(input.value.trim());
            } else {
                alert("Şablon adı boş bırakılamaz!");
            }
        };

        cancelBtn.onclick = cleanup;
    }

    createNewTemplate() {
        this.showCustomPrompt(`Yeni Kayıt ${this.templates.length + 1}`, (templateName) => {
            const newTemplate = this.getDefaultTemplateObject(templateName);
            this.templates.push(newTemplate);
            this.currentTemplateId = newTemplate.id;
            
            storageService.saveTemplates(this.templates);
            this.renderTemplateList();
            this.populateForm(newTemplate);
        });
    }

    saveCurrentTemplate() {
        const index = this.templates.findIndex(t => t.id === this.currentTemplateId);
        if (index > -1) {
            const currentName = this.templates[index].name;

            this.templates[index] = {
                id: this.currentTemplateId,
                name: currentName,
                il: document.getElementById('setIl').value,
                ilce: document.getElementById('setIlce').value,
                minFiyat: document.getElementById('setMinFiyat').value,
                maxFiyat: document.getElementById('setMaxFiyat').value,
                minM2: document.getElementById('setMinM2').value,
                maxM2: document.getElementById('setMaxM2').value,
                konutTumu: document.getElementById('konutTumu').checked,
                konutType: document.querySelector('input[name="konutType"]:checked')?.value || this.konutTipleri[0],
                isyeriTumu: document.getElementById('isyeriTumu').checked,
                isyeriType: document.querySelector('input[name="isyeriType"]:checked')?.value || this.isyeriTipleri[0]
            };
            
            storageService.saveTemplates(this.templates);
            alert(`"${currentName}" başarıyla güncellendi!`);
        }
    }

    deleteCurrentTemplate() {
        if (this.templates.length === 1) {
            return alert("Sistemde en az 1 adet şablon bulunmak zorundadır, son kalan şablonu silemezsiniz.");
        }

        if (confirm("Bu kayıtlı şablonu silmek istediğinize emin misiniz?")) {
            this.templates = this.templates.filter(t => t.id !== this.currentTemplateId);
            storageService.saveTemplates(this.templates);
            this.loadTemplatesFromStorage(); 
        }
    }

    async populateForm(t) {
        const ilSelect = document.getElementById('setIl');
        const ilceSelect = document.getElementById('setIlce');
        
        ilSelect.value = t.il || '';

        if (t.il && ilSelect.selectedIndex > 0) {
            const pId = ilSelect.options[ilSelect.selectedIndex].dataset.id;
            await this.loadDistrictsFromAPI(pId, t.ilce);
        } else {
            ilceSelect.innerHTML = '<option value="">Önce İl Seçin</option>';
            ilceSelect.disabled = true;
        }

        document.getElementById('setMinFiyat').value = t.minFiyat;
        document.getElementById('setMaxFiyat').value = t.maxFiyat;
        document.getElementById('setMinM2').value = t.minM2;
        document.getElementById('setMaxM2').value = t.maxM2;

        document.getElementById('konutTumu').checked = t.konutTumu;
        document.querySelectorAll('input[name="konutType"]').forEach(r => { if (r.value === t.konutType) r.checked = true; });

        document.getElementById('isyeriTumu').checked = t.isyeriTumu;
        document.querySelectorAll('input[name="isyeriType"]').forEach(r => { if (r.value === t.isyeriType) r.checked = true; });

        document.getElementById('konutTumu').dispatchEvent(new Event('change'));
        document.getElementById('isyeriTumu').dispatchEvent(new Event('change'));
    }

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