class ExtractionController {
    constructor() {
        this.queue = [];
        this.extractedData = [];
        this.isPaused = false;
        this.currentTabId = null;
    }

    async processNext() {
        if (this.isPaused || this.queue.length === 0) {
            if (this.queue.length === 0 && this.extractedData.length > 0) {
                console.log("🏁 EXTRACTION COMPLETE! All collected data:", this.extractedData);
            }
            return;
        }

        const nextUrl = this.queue.shift();
        
        // Rastgele bekleme süresi (insan taklidi: 2-4 saniye)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 2000));

        chrome.tabs.create({ url: nextUrl, active: true }, (tab) => {
            this.currentTabId = tab.id;
        });
    }

    stopQueue() {
        // Kuyruğu boşalt ve sistemi duraklat
        const remainingItems = this.queue.length;
        this.queue = [];
        this.isPaused = true;
        console.warn(`🛑 Extraction manually stopped! Cancelled ${remainingItems} items in queue.`);
        console.table(this.extractedData); // Toplanan veriyi tablo olarak basar
    }

    handleCaptchaSolved() {
        this.isPaused = false;
        console.log("▶️ Resuming extraction...");
        this.processNext();
    }
}

const controller = new ExtractionController();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "ADD_TO_QUEUE") {
        controller.isPaused = false;
        controller.queue.push(...request.urls);
        console.log(`📥 Added ${request.urls.length} urls to queue. Total in queue: ${controller.queue.length}`);
        controller.processNext();
        sendResponse({ status: "Queue started" });
    } 
    else if (request.action === "DATA_EXTRACTED") {
        controller.extractedData.push(request.data);
        
        // HER SAYFA ÇEKİLDİĞİNDE KONSOLA YAZDIR
        console.log(`✅ Extracted [${controller.extractedData.length}]:`, request.data);

        if (sender.tab && sender.tab.id === controller.currentTabId) {
            chrome.tabs.remove(sender.tab.id);
            controller.processNext();
        }
    } 
    else if (request.action === "CAPTCHA_DETECTED") {
        controller.isPaused = true;
        console.error("⚠️ CAPTCHA Detected! Waiting for manual human intervention.");
    }
    else if (request.action === "STOP_EXTRACTION") {
        controller.stopQueue();
        sendResponse({ status: "Extraction stopped." });
    }
});