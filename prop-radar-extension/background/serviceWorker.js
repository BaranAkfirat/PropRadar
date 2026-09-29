let socket = null;
let queue = [];
let isPaused = false;
let currentTabId = null;
let processedTabCount = 0; // Şişmeyi ve banlanmayı engellemek için sayaç

function connectWebSocket() {
    // Zaten bağlıysa veya şu an bağlanmaya çalışıyorsa işlemi iptal et
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return;
    }

    try {
        socket = new WebSocket('ws://localhost:8080');

        socket.onopen = () => {
            console.log("Masaüstü uygulamasına bağlandı!");
            socket.send(JSON.stringify({ type: "LOG", message: "Tarayıcı eklentisi uyandı ve entegre oldu." }));
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.action === 'START_SCAN') {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: "GATHER_URLS" });
                });
            }
            else if (data.action === 'STOP_SCAN') {
                queue = [];
                isPaused = true;
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ type: "LOG", message: "Kuyruk boşaltıldı ve tarama durduruldu." }));
                }
            }
        };

        socket.onclose = () => { socket = null; };
        socket.onerror = () => { socket = null; };
    } catch (error) {
        socket = null;
    }
}

// 1. Servis uyandığında doğrudan bağlanmayı dene
connectWebSocket();

// 2. Manifest V3 için Alarms API (Her 1 dakikada bir uyanıp bağlantıyı kontrol eder)
chrome.alarms.create("keepAlive", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "keepAlive") {
        connectWebSocket();
    }
});

async function processNextInQueue() {
    if (isPaused || queue.length === 0) {
        if (queue.length === 0 && socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "LOG", message: "Kuyruktaki tüm ilanlar başarıyla çekildi!" }));
        }
        return;
    }

    processedTabCount++;
    
    // YORULMA MANTIĞI: Her 15 sekmede bir 45 saniyelik uzun mola (Hem banı hem RAM şişmesini engeller)
    if (processedTabCount % 15 === 0) {
        if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "LOG", message: "Sistem dinleniyor... Anti-bot molası (45 sn)." }));
        }
        await new Promise(resolve => setTimeout(resolve, 45000));
    }

    const nextUrl = queue.shift(); // Diziden çıkararak oku (RAM'i rahatlat)
    
    // RASTGELE BEKLEME: 4 ile 9 saniye arası rastgele (İnsan davranışı)
    const delay = Math.floor(Math.random() * 5000) + 4000;
    await new Promise(resolve => setTimeout(resolve, delay));

    chrome.tabs.create({ url: nextUrl, active: true }, (tab) => {
        currentTabId = tab.id;
        
        // GÜVENLİK SİGORTASI: Eğer bir sekme açılır ama veri çekilemezse (hata verirse), 
        // 15 saniye sonra sekme zorla kapatılsın ve diğerine geçilsin. (ŞİŞMEYİ KESİN ENGELLER)
        setTimeout(() => {
            if (currentTabId === tab.id && !isPaused) {
                chrome.tabs.get(tab.id, (t) => {
                    if (!chrome.runtime.lastError && t) {
                        if (socket?.readyState === WebSocket.OPEN) {
                            socket.send(JSON.stringify({ type: "LOG", message: "Sekme zaman aşımı! Atlanıyor..." }));
                        }
                        chrome.tabs.remove(tab.id, () => {
                            processNextInQueue();
                        });
                    }
                });
            }
        }, 15000); // 15 Saniyelik sigorta
    });
}

// 3. İçerik (content.js) üzerinden gelen her mesajda eklentiyi uyandır ve bağlantıyı tazele
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    connectWebSocket(); // İçerikten sinyal geldiğinde hemen bağlanmayı dener

    if (request.action === "WAKE_UP") {
        return; // Sadece uyandırma amaçlı boş sinyal
    }
    else if (request.action === "URLS_GATHERED") {
        queue.push(...request.urls);
        isPaused = false;
        if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "LOG", message: `Kuyruğa ${request.urls.length} ilan eklendi.` }));
        }
        processNextInQueue();
    } 
    else if (request.action === "CAPTCHA_DETECTED") {
        isPaused = true;
        if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "LOG", message: "⚠️ Bot koruması aktif! Sayfada doğrulama bekleniyor." }));
        }
    }
    else if (request.action === "DATA_EXTRACTED") {
        isPaused = false; 
        if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "DATA", payload: request.data }));
        }
        if (sender.tab && sender.tab.id === currentTabId) {
            chrome.tabs.remove(sender.tab.id, () => {
                processNextInQueue();
            });
        }
    }
});