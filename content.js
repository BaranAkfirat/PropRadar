class PageAnalyzer {
    constructor() {
        this.selectors = {
            listingLinks: '.searchResultsItem .classifiedTitle', // Arama sonucu linkleri
            detailTitle: '.classifiedDetailTitle h1', // İlan detay başlığı
            captchaContainer: '#sec-text-container, .g-recaptcha, iframe[src*="captcha"]' // Olası bot koruma seçicileri
        };
    }

    isCaptchaPage() {
        // Sayfada bilinen bot koruması elementleri var mı?
        return document.querySelector(this.selectors.captchaContainer) !== null;
    }

    isListingPage() {
        // Arama sonuçları sayfası mı?
        return document.querySelectorAll(this.selectors.listingLinks).length > 0;
    }

    isDetailPage() {
        // İlanın kendi içi mi?
        return document.querySelector(this.selectors.detailTitle) !== null;
    }

    extractUrlsAndSendToQueue() {
        const linkElements = document.querySelectorAll(this.selectors.listingLinks);
        const urls = Array.from(linkElements).map(el => el.href).filter(href => href);
        
        if (urls.length > 0) {
            chrome.runtime.sendMessage({ action: "ADD_TO_QUEUE", urls: urls });
            alert(`Found ${urls.length} listings. Extraction started in new tabs!`);
        }
    }

    extractDetailData() {
        const titleEl = document.querySelector(this.selectors.detailTitle);
        
        const data = {
            url: window.location.href,
            title: titleEl ? titleEl.innerText.trim() : 'N/A',
            // İleride buraya fiyat, m2, telefon numarası gibi diğer veriler eklenecek
        };

        chrome.runtime.sendMessage({ action: "DATA_EXTRACTED", data: data });
    }

    run() {
        if (this.isCaptchaPage()) {
            chrome.runtime.sendMessage({ action: "CAPTCHA_DETECTED" });
            // Ekrana büyük bir uyarı basıyoruz ki emlakçı fark etsin
            alert("PROP RADAR: Captcha Detected! Please solve it to continue extraction.");
        } 
        else if (this.isDetailPage()) {
            // Sayfanın DOM'unun tam oturması için kısa bir süre bekle ve veriyi çek
            setTimeout(() => this.extractDetailData(), 1500);
        } 
        else if (this.isListingPage()) {
            // İlk tetikleme: Sadece "Tara" butonuna basıldığında linkleri topla
            chrome.runtime.onMessage.addListener((request) => {
                if (request.action === "START_EXTRACTION") {
                    this.extractUrlsAndSendToQueue();
                }
            });
        }
    }
}

const analyzer = new PageAnalyzer();
analyzer.run();