class HepsiemlakAnalyzer {
    constructor() {
        this.selectors = {
            detailTitle: '.det-title-upper h1, .detail-summary__title, .listing-title h1', 
            captcha: '#challenge-running, iframe[src*="captcha"]' 
        };
    }

    isCaptchaPage() { return document.querySelector(this.selectors.captcha) !== null; }
    isListingPage() { return document.querySelectorAll('script[type="application/ld+json"]').length > 0; }
    isDetailPage() { return document.querySelector(this.selectors.detailTitle) !== null; }

    extractUrls(knownIds = []) {
        let urlsToQueue = [];
        
        // Yöntem: article ID'lerinden yakalama
        const articles = document.querySelectorAll('article.listingCard__box');
        
        if (articles.length > 0) {
            articles.forEach(article => {
                const ilanId = article.id; 
                
                // Eğer bu ID kayıtlılarımızda varsa atla
                if (ilanId && knownIds.includes(ilanId)) return;
                
                const linkEl = article.querySelector('a.listingCard__media-link');
                if (linkEl && linkEl.href) {
                    urlsToQueue.push(linkEl.href);
                }
            });
        } else {
            // Fallback: A etiketlerinin URL'inden numarayı ayıklama
            const links = document.querySelectorAll('a[href*="/daire/"], a[href*="/isyeri/"], a[href*="/arsa/"]');
            links.forEach(a => {
                const href = a.href;
                if (!href) return;
                
                // URL'in sonundaki ilan nosunu regex ile çek
                const match = href.match(/(\d+-\d+)$/);
                const ilanId = match ? match[1] : null;
                
                if (ilanId && knownIds.includes(ilanId)) return;
                
                urlsToQueue.push(href);
            });
        }

        const uniqueUrls = [...new Set(urlsToQueue)]
            .filter(href => href && !href.includes('/proje/')) 
            .filter(href => href.includes('hepsiemlak.com') && /\d+-\d+$/.test(href));

        if (uniqueUrls.length > 0) {
            chrome.runtime.sendMessage({ action: "URLS_GATHERED", urls: uniqueUrls });
        } else {
            chrome.runtime.sendMessage({ type: "LOG", message: "Bu sayfadaki tüm ilanlar veritabanında mevcut. Atlanıyor..." });
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

        // --- YENİ EKLENEN KISIM: JSON-LD ÜZERİNDEN DURUM TESPİTİ ---
        let durum = 'Diğer';
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        
        scripts.forEach(script => {
            try {
                const json = JSON.parse(script.innerText);
                const graph = json['@graph'] || (Array.isArray(json) ? json : [json]);
                
                graph.forEach(node => {
                    if (node['@type'] === 'BreadcrumbList' && node.itemListElement) {
                        node.itemListElement.forEach(el => {
                            if (el.item && el.item.name) {
                                const lowerName = el.item.name.toLowerCase();
                                if (lowerName === 'satılık' || lowerName === 'kiralık' || lowerName === 'devren' || lowerName.includes('günlük kiralık')) {
                                    durum = el.item.name;
                                }
                            }
                        });
                    }
                });
            } catch (e) {
                // Parse hatası olursa atla
            }
        });

        if (durum === 'Diğer') {
            const urlLower = window.location.href.toLowerCase();
            if (urlLower.includes('satilik')) durum = 'Satılık';
            else if (urlLower.includes('kiralik')) durum = 'Kiralık';
            else if (urlLower.includes('devren')) durum = 'Devren';
        }
        // ---------------------------------------------------------

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
            
            durum: durum, 
            
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

    run() {
        if (this.isCaptchaPage()) {
            chrome.runtime.sendMessage({ action: "CAPTCHA_DETECTED" });
        } else if (this.isDetailPage()) {
            setTimeout(() => this.extractDetailData(), 2000); 
        }
        
        chrome.runtime.onMessage.addListener((request) => {
            if (request.action === "GATHER_URLS") this.extractUrls(request.knownIds || []);
        });
    }
}