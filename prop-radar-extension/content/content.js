// --- 1. SAHİBİNDEN MOTORU --- //
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

    extractUrls() {
        const linkElements = document.querySelectorAll(this.selectors.listingLinks);
        const urls = Array.from(linkElements).map(el => el.href).filter(href => href);
        if (urls.length > 0) chrome.runtime.sendMessage({ action: "URLS_GATHERED", urls: urls });
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
                const key = keyEl.innerText.replace(/\s+/g, ' ').trim();
                const val = valEl.innerText.replace(/\s+/g, ' ').trim();
                features[key] = val;
            }
        });

        // Konum verilerini Regex ile yakalama
        let city = 'N/A', town = 'N/A', quarter = 'N/A';
        const pageHTML = document.documentElement.innerHTML;
        
        const cityMatch = pageHTML.match(/'cityName':\s*'([^']+)'/);
        const townMatch = pageHTML.match(/'townName':\s*'([^']+)'/);
        const quarterMatch = pageHTML.match(/'quarterName':\s*'([^']+)'/);

        if (cityMatch) city = cityMatch[1];
        if (townMatch) town = townMatch[1];
        if (quarterMatch) quarter = quarterMatch[1];

        // 4. Veriyi Paketleme
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
            if (request.action === "GATHER_URLS") this.extractUrls();
        });
    }
}

// --- 2. HEPSİEMLAK MOTORU --- //
class HepsiemlakAnalyzer {
    constructor() {
        // GÜNCELLENDİ: Artık örnek sınıfları değil, gerçek Hepsiemlak HTML başlıklarını arıyor
        this.selectors = {
            detailTitle: '.det-title-upper h1, .detail-summary__title, .listing-title h1', 
            captcha: '#challenge-running, iframe[src*="captcha"]' 
        };
    }

    isCaptchaPage() { return document.querySelector(this.selectors.captcha) !== null; }
    isListingPage() { return document.querySelectorAll('script[type="application/ld+json"]').length > 0; }
    
    // SİSTEMİN KİLİDİ BURASI: Doğru başlığı bulduğu an detay sayfası olduğunu anlayıp çalışacak
    isDetailPage() { return document.querySelector(this.selectors.detailTitle) !== null; }

    extractUrls() {
        let urls = [];

        // 1. Google SEO için bırakılan JSON-LD şemasından linkleri çal 
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        scripts.forEach(script => {
            try {
                const json = JSON.parse(script.innerText);
                const graph = json['@graph'] || (Array.isArray(json) ? json : [json]);
                
                graph.forEach(node => {
                    if (node['@type'] === 'ItemList' && node.itemListElement) {
                        node.itemListElement.forEach(el => {
                            if (el.item && el.item.url) {
                                urls.push(el.item.url);
                            }
                        });
                    }
                });
            } catch (e) {
                // Parse hatası olursa sessizce geç
            }
        });

        // 2. Eğer JSON'dan bulamazsa, klasik HTML DOM seçicileriyle ara
        if (urls.length === 0) {
            const links = document.querySelectorAll('a[href*="/daire/"], a[href*="/isyeri/"], a[href*="/arsa/"]');
            urls = Array.from(links).map(a => a.href);
        }

        // 3. FİLTRELEME: Çift linkleri (Duplicate), reklamları (/proje/) ve gereksiz URL'leri temizle
        const uniqueUrls = [...new Set(urls)]
            .filter(href => href && !href.includes('/proje/')) 
            .filter(href => href.includes('hepsiemlak.com') && /\d+-\d+$/.test(href));

        // 4. SONUÇ YÖNETİMİ
        if (uniqueUrls.length > 0) {
            chrome.runtime.sendMessage({ action: "URLS_GATHERED", urls: uniqueUrls });
        } else {
            chrome.runtime.sendMessage({ 
                type: "LOG", 
                message: "Hata: Hepsiemlak sayfasında link bulunamadı. Sayfayı manuel yenileyin." 
            });
        }
    }

    extractDetailData() {
        let title = 'N/A';
        const titleEl = document.querySelector('.det-title-upper h1, .detail-summary__title');
        if (titleEl) title = titleEl.innerText.trim();

        let price = 'N/A';
        const priceEl = document.querySelector('.det-title-upper .price, .detail-price-wrap .price');
        if (priceEl) price = priceEl.innerText.trim();

        let photosArray = [];
        const imgElements = document.querySelectorAll('.slider-main .swiper-slide img, .carousel-template-wrapper img');
        imgElements.forEach(img => {
            const src = img.getAttribute('data-src') || img.src;
            if (src && !src.includes('data:image/gif') && !src.includes('base64')) {
                photosArray.push(src);
            }
        });
        photosArray = [...new Set(photosArray)];

        let sellerName = 'N/A';
        const sellerEl = document.querySelector('.owner-firm-name, .owner-agent-name, .firm-link, .owner-name');
        if (sellerEl) sellerName = sellerEl.innerText.trim();

        let kimden = 'Emlak Ofisinden';
        const kimdenEl = document.querySelector('.member-type, .owner-member-type');
        if (kimdenEl) kimden = kimdenEl.innerText.trim();

        let phone = 'N/A';
        const phoneLink = document.querySelector('.owner-phone-numbers-list a[href^="tel:"]');
        if (phoneLink) {
            phone = phoneLink.getAttribute('href').replace('tel:', '').trim();
        } else {
            const phoneText = document.querySelector('.owner-phone-numbers-list li span:last-child');
            if (phoneText) phone = phoneText.innerText.replace(/\s+/g, '').trim();
        }

        let description = 'N/A';
        const descEl = document.querySelector('.description-content, .inner-html.description, .detail-spec.description .ql-editor');
        if (descEl) description = descEl.innerText.replace(/\s+/g, ' ').trim();

        let city = 'N/A', town = 'N/A', quarter = 'N/A';
        const locationEl = document.querySelector('.detail-info-location');
        if (locationEl) {
            const locText = locationEl.innerText.replace(/Maksimum.*|Minimum.*/g, '').trim();
            const parts = locText.split('/').map(p => p.trim());
            if (parts.length >= 2) {
                city = parts[0] || 'N/A';
                town = parts[1] || 'N/A';
                quarter = parts[2] || 'N/A';
            }
        }

        const features = {};
        const featureRows = document.querySelectorAll('.adv-info-list tr, tr.spec-item');
        featureRows.forEach(row => {
            const keyEl = row.querySelector('th');
            const valEl = row.querySelector('td');
            if (keyEl && valEl) {
                const key = keyEl.innerText.replace(/\s+/g, ' ').trim();
                // time etiketini de kapsayacak şekilde tüm boşlukları temizleyerek değeri alıyoruz
                const val = valEl.innerText.replace(/\s+/g, ' ').trim();
                features[key] = val;
            }
        });

        const shortProps = document.querySelectorAll('.short-property li');
        shortProps.forEach(prop => {
            const text = prop.innerText.trim();
            if (text.includes('m2') || text.includes('m²')) features['m2Net'] = text;
            if (text.includes('+')) features['odaSayisi'] = text;
        });

        const data = {
            url: window.location.href,
            title: title,
            price: price,
            phone: phone,
            sellerName: sellerName,
            description: description,
            photos: photosArray.length > 0 ? photosArray.join(', ') : 'N/A',
            
            locationCity: city,
            locationTown: town,
            locationQuarter: quarter,
            
            ilanNo: features['İlan no'] || features['İlan Numarası'] || features['İlan No'] || 'N/A',
            ilanTarihi: features['Son Güncelleme'] || features['İlan Güncelleme Tarihi'] || features['İlan Tarihi'] || 'N/A',
            emlakTipi: features['Konut Şekli'] || features['Emlak Tipi'] || 'N/A',
            m2Net: features['Brüt / Net M2'] || features['m² (Net)'] || features['m2Net'] || 'N/A',
            odaSayisi: features['Oda + Salon Sayısı'] || features['Oda Sayısı'] || features['odaSayisi'] || 'N/A',
            binaYasi: features['Bina Yaşı'] || 'N/A',
            katSayisi: features['Kat Sayısı'] || 'N/A',
            bulunduguKat: features['Bulunduğu Kat'] || 'N/A',
            aidat: features['Aidat'] || 'N/A',
            siteAdi: features['Site İçerisinde'] === 'Evet' ? 'Site İçi' : 'N/A',
            esyali: features['Eşya Durumu'] || 'N/A',
            depozito: features['Depozito'] || 'N/A',
            kimden: kimden
        };

        chrome.runtime.sendMessage({ action: "DATA_EXTRACTED", data: data });
    }

    // --- YENİ EKLENEN RUN METODU ---
    run() {
        if (this.isCaptchaPage()) {
            chrome.runtime.sendMessage({ action: "CAPTCHA_DETECTED" });
        } else if (this.isDetailPage()) {
            setTimeout(() => this.extractDetailData(), 2000); 
        }
        
        chrome.runtime.onMessage.addListener((request) => {
            if (request.action === "GATHER_URLS") this.extractUrls();
        });
    }
}

// --- 3. PLATFORM YÖNLENDİRİCİSİ (ROUTER) --- //
const hostname = window.location.hostname;
let activeAnalyzer = null;

if (hostname.includes("sahibinden.com")) {
    activeAnalyzer = new SahibindenAnalyzer();
} else if (hostname.includes("hepsiemlak.com")) {
    activeAnalyzer = new HepsiemlakAnalyzer();
}

// Uyandırma Sinyali
chrome.runtime.sendMessage({ action: "WAKE_UP" }).catch(() => {});

// Doğru motoru başlat
if (activeAnalyzer) {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => activeAnalyzer.run());
    } else {
        activeAnalyzer.run();
    }
}