class StorageService {
    constructor() {
        this.templatesKey = 'prop_radar_templates';
        this.licenseKey = 'prop_radar_license'; // YENİ: Lisans için anahtar tanımı
    }

    // --- ARAMA ŞABLONLARI İÇİN ---
    getTemplates() {
        const saved = localStorage.getItem(this.templatesKey);
        return saved ? JSON.parse(saved) : [];
    }

    saveTemplates(templates) {
        localStorage.setItem(this.templatesKey, JSON.stringify(templates));
    }

    // --- LİSANS ANAHTARI İÇİN (YENİ) ---
    getLicenseKey() {
        return localStorage.getItem(this.licenseKey);
    }

    saveLicenseKey(key) {
        localStorage.setItem(this.licenseKey, key);
    }

    removeLicenseKey() {
        localStorage.removeItem(this.licenseKey);
    }
}

module.exports = new StorageService();