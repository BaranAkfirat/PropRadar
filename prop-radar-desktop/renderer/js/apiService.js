// Sadece API çağrılarını ve veri formatlamayı yöneten servis katmanı
class ApiService {
    constructor() {
        this.baseUrl = 'https://api.turkiyeapi.dev/v2';
    }

    async getProvinces() {
        try {
            const res = await fetch(`${this.baseUrl}/provinces`);
            if (!res.ok) throw new Error("Sunucu yanıt vermedi");
            
            const data = await res.json();
            // Veriyi her zaman A'dan Z'ye sıralı döndür
            return data.data.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
        } catch (err) {
            console.error("API Hatası (İller):", err);
            return []; // Hata durumunda boş dizi dönerek uygulamanın çökmesini engelle
        }
    }

    async getDistricts(provinceId) {
        try {
            const res = await fetch(`${this.baseUrl}/districts?provinceId=${provinceId}`);
            if (!res.ok) throw new Error("Sunucu yanıt vermedi");
            
            const data = await res.json();
            return data.data.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
        } catch (err) {
            console.error("API Hatası (İlçeler):", err);
            return [];
        }
    }
}

// Tekil (Singleton) bir nesne olarak dışa aktarıyoruz
module.exports = new ApiService();