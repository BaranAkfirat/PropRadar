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

        // 1. Telefon Numarası
        let phone = 'Bulunamadı';
        const phoneEl = document.querySelector('[data-opened]');
        if (phoneEl && phoneEl.dataset.opened) {
            phone = phoneEl.dataset.opened;
        } else {
            const telLink = document.querySelector('a[href^="tel:"]');
            if (telLink) phone = telLink.getAttribute('href').replace('tel:', '').trim();
        }

        // 2. Satıcı İsmi
        let sellerName = 'Bulunamadı';
        const userSpan = document.querySelector('.username-info-area h5 span');
        if (userSpan) {
            const content = getComputedStyle(userSpan, '::before').getPropertyValue('content');
            if (content && content !== 'none') {
                sellerName = content.replace(/^["']|["']$/g, ''); 
            } else {
                const h5 = document.querySelector('.username-info-area h5');
                if (h5) sellerName = h5.innerText.trim();
            }
        }

        // 3. İlan Özelliklerini <dt> ve <dd> Etiketlerinden Ayrıştırma
        const features = {};
        const infoItems = document.querySelectorAll('.classifiedInfoItem');
        infoItems.forEach(item => {
            const keyEl = item.querySelector('dt');
            const valEl = item.querySelector('dd');
            if (keyEl && valEl) {
                // Etiketlerin içindeki boşlukları ve enter karakterlerini temizleyip tek satır yapıyoruz
                const key = keyEl.innerText.replace(/\s+/g, ' ').trim();
                const val = valEl.innerText.replace(/\s+/g, ' ').trim();
                features[key] = val;
            }
        });

        // YENİ: Script içinden konum verilerini Regex ile yakalama
        let city = 'N/A', town = 'N/A', quarter = 'N/A';
        const pageHTML = document.documentElement.innerHTML;
        
        const cityMatch = pageHTML.match(/'cityName':\s*'([^']+)'/);
        const townMatch = pageHTML.match(/'townName':\s*'([^']+)'/);
        const quarterMatch = pageHTML.match(/'quarterName':\s*'([^']+)'/);

        if (cityMatch) city = cityMatch[1];
        if (townMatch) town = townMatch[1];
        if (quarterMatch) quarter = quarterMatch[1];

        // 4. Veriyi Paketleme (Değerler features objesinden eşleşiyor)
        const data = {
            url: window.location.href,
            title: titleEl ? titleEl.innerText.trim() : 'N/A',
            price: priceEl ? priceEl.innerText.trim() : 'N/A',
            phone: phone,
            sellerName: sellerName,
            description: descEl ? descEl.innerText.replace(/\s+/g, ' ').trim() : 'N/A',
            photos: photosArray.length > 0 ? photosArray.join(', ') : 'N/A',
            locationCity: city,
            locationTown: town,
            locationQuarter: quarter,
            
            // Özellikler Tablosu (Sayfada yoksa veya boşsa 'N/A' döner)
            ilanNo: features['İlan No'] || 'N/A',
            ilanTarihi: features['İlan Tarihi'] || 'N/A',
            emlakTipi: features['Emlak Tipi'] || 'N/A',
            m2Net: features['m² (Net)'] || 'N/A',
            odaSayisi: features['Oda Sayısı'] || 'N/A',
            binaYasi: features['Bina Yaşı'] || 'N/A',
            katSayisi: features['Kat Sayısı'] || 'N/A',
            bulunduguKat: features['Bulunduğu Kat'] || 'N/A',
            aidat: features['Aidat (TL)'] || 'N/A',
            siteAdi: features['Site Adı'] || 'N/A',
            esyali: features['Eşyalı'] || 'N/A',
            depozito: features['Depozito (TL)'] || 'N/A',
            kimden: features['Kimden'] || 'N/A'
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