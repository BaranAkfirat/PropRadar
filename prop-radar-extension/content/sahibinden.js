class SahibindenAnalyzer {
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

    isCaptchaPage() { return document.querySelector(this.selectors.captcha) !== null || document.title.toLowerCase().includes("doğrulama"); }
    isListingPage() { return document.querySelectorAll(this.selectors.listingLinks).length > 0; }
    isDetailPage() { return document.querySelector(this.selectors.detailTitle) !== null; }

    extractUrls(knownIds = []) {
        // Satırların (tr) tamamını seç
        const items = document.querySelectorAll('.searchResultsItem[data-id]');
        const urlsToQueue = [];

        items.forEach(item => {
            const ilanId = item.getAttribute('data-id');
            
            // Eğer ilan numarası zaten kayıtlılarımız arasındaysa bu satırı tamamen es geç
            if (ilanId && knownIds.includes(ilanId)) return;

            const linkEl = item.querySelector('.classifiedTitle');
            if (linkEl && linkEl.href) {
                urlsToQueue.push(linkEl.href);
            }
        });

        if (urlsToQueue.length > 0) {
            chrome.runtime.sendMessage({ action: "URLS_GATHERED", urls: urlsToQueue });
        } else {
            // Sayfadaki tüm ilanlar zaten kayıtlıysa sistemi bilgilendir
            chrome.runtime.sendMessage({ type: "LOG", message: "Bu sayfadaki tüm ilanlar veritabanında mevcut. Atlanıyor..." });
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

        let phone = 'Bulunamadı';
        const phoneEl = document.querySelector('[data-opened]');
        if (phoneEl && phoneEl.dataset.opened) {
            phone = phoneEl.dataset.opened;
        } else {
            const telLink = document.querySelector('a[href^="tel:"]');
            if (telLink) phone = telLink.getAttribute('href').replace('tel:', '').trim();
        }

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

        const features = {};
        const infoItems = document.querySelectorAll('.classifiedInfoItem');
        infoItems.forEach(item => {
            const keyEl = item.querySelector('dt');
            const valEl = item.querySelector('dd');
            if (keyEl && valEl) {
                const key = keyEl.innerText.replace(/\s+/g, ' ').trim();
                const val = valEl.innerText.replace(/\s+/g, ' ').trim();
                features[key] = val;
            }
        });

        let city = 'N/A', town = 'N/A', quarter = 'N/A';
        const pageHTML = document.documentElement.innerHTML;
        
        const cityMatch = pageHTML.match(/'cityName':\s*'([^']+)'/);
        const townMatch = pageHTML.match(/'townName':\s*'([^']+)'/);
        const quarterMatch = pageHTML.match(/'quarterName':\s*'([^']+)'/);

        if (cityMatch) city = cityMatch[1];
        if (townMatch) town = townMatch[1];
        if (quarterMatch) quarter = quarterMatch[1];

        // --- EKLENECEK BÖLÜM ---
        let durum = 'Diğer';
        // bc-item sınıflı tüm breadcrumb elemanlarını gezip durumu tespit ediyoruz
        const bcItems = document.querySelectorAll('.bc-item');
        bcItems.forEach(item => {
            const text = item.innerText.trim();
            const lowerText = text.toLowerCase();
            if (lowerText === 'satılık' || lowerText === 'kiralık' || lowerText === 'devren' || lowerText === 'günlük kiralık') {
                durum = text;
            }
        });

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
            
            durum: durum, // YENİ: Masaüstü uygulamasına gönderilecek durum verisi
            
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
        if (this.isCaptchaPage()) {
            chrome.runtime.sendMessage({ action: "CAPTCHA_DETECTED" });
        } else if (this.isDetailPage()) {
            setTimeout(() => {
                window.scrollTo({ top: Math.floor(Math.random() * 500) + 300, behavior: 'smooth' });
            }, 1500);
            setTimeout(() => this.extractDetailData(), 4000);
        }
        
        chrome.runtime.onMessage.addListener((request) => {
            // YENİ: knownIds parametresini fonksiyonun içine gönder[cite: 3]
            if (request.action === "GATHER_URLS") this.extractUrls(request.knownIds || []);
        });
    }
}