class PageAnalyzer {
    constructor() {
        this.selectors = {
            listingLinks: '.searchResultsItem .classifiedTitle',
            detailTitle: '.classifiedDetailTitle h1',
            price: '.classifiedInfo h3',
            description: '#classifiedDescription', 
            photos: '.classifiedDetailMainPhoto img, .mega-photo img, .uiBox.showcase img', 
            captcha: '#sec-text-container, .g-recaptcha, iframe[src*="captcha"], #challenge-running'
        };
    }

    isCaptchaPage() {
        return document.querySelector(this.selectors.captcha) !== null || document.title.toLowerCase().includes("doğrulama") || document.title.toLowerCase().includes("captcha");
    }

    isListingPage() {
        return document.querySelectorAll(this.selectors.listingLinks).length > 0;
    }

    isDetailPage() {
        return document.querySelector(this.selectors.detailTitle) !== null;
    }

    extractUrls() {
        const linkElements = document.querySelectorAll(this.selectors.listingLinks);
        const urls = Array.from(linkElements).map(el => el.href).filter(href => href);
        
        if (urls.length > 0) {
            chrome.runtime.sendMessage({ action: "URLS_GATHERED", urls: urls });
        }
    }

    extractDetailData() {
        const titleEl = document.querySelector(this.selectors.detailTitle);
        const priceEl = document.querySelector(this.selectors.price);
        const descEl = document.querySelector(this.selectors.description);

        const photoElements = document.querySelectorAll(this.selectors.photos);
        const photosArray = Array.from(photoElements)
            .map(img => img.dataset.src || img.src)
            .filter(url => url && !url.includes('blank'));

        // YENİ: Telefon Numarasını Çekme Mantığı
        let phone = 'Bulunamadı';
        
        // 1. Öncelik: Senin keşfettiğin data-opened attribute'u
        const phoneEl = document.querySelector('[data-opened]');
        if (phoneEl && phoneEl.dataset.opened) {
            phone = phoneEl.dataset.opened;
        } 
        // 2. Öncelik (Yedek): Bazen kurumsal mağazalarda doğrudan 'tel:' linki verilir
        else {
            const telLink = document.querySelector('a[href^="tel:"]');
            if (telLink) {
                phone = telLink.getAttribute('href').replace('tel:', '').trim();
            }
        }

        const data = {
            url: window.location.href,
            title: titleEl ? titleEl.innerText.trim() : 'N/A',
            price: priceEl ? priceEl.innerText.trim() : 'N/A',
            phone: phone, // TELEFON EKLENDİ
            description: descEl ? descEl.innerText.replace(/\s+/g, ' ').trim() : 'N/A',
            photos: photosArray.length > 0 ? photosArray.join(', ') : 'N/A'
        };

        chrome.runtime.sendMessage({ action: "DATA_EXTRACTED", data: data });
    }

    run() {
        // Sayfa yüklendiğinde CAPTCHA varsa arka planı durdur
        if (this.isCaptchaPage()) {
            chrome.runtime.sendMessage({ action: "CAPTCHA_DETECTED" });
            // Emlakçının dikkatini çekmek için küçük bir bildirim sesi veya alert opsiyonel eklenebilir
        } 
        // İlan detay sayfasıysa veriyi çek
        else if (this.isDetailPage()) {
            // JS ile render olan içeriklerin tam oturması için kısa bir bekleme süresi
            setTimeout(() => this.extractDetailData(), 1500);
        } 
        
        // Sadece Listeleme sayfasında (Ana Sahibinden arama sekmesinde) masaüstünden gelen komutu dinle
        chrome.runtime.onMessage.addListener((request) => {
            if (request.action === "GATHER_URLS") {
                this.extractUrls();
            }
        });
    }
}

// DOM tamamen hazır olduğunda analizörü başlat
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        new PageAnalyzer().run();
    });
} else {
    new PageAnalyzer().run();
}

// Sayfa her yüklendiğinde arka plan servisine uyandırma sinyali gönder
chrome.runtime.sendMessage({ action: "WAKE_UP" }).catch(() => {
    // Eklenti tamamen uykuya daldıysa ilk mesaj hata verebilir, Chrome bunu tolere eder.
});