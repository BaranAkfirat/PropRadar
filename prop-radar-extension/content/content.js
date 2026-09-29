// --- PLATFORM YÖNLENDİRİCİSİ (ROUTER) --- //

const hostname = window.location.hostname;
let activeAnalyzer = null;

if (hostname.includes("sahibinden.com")) {
    activeAnalyzer = new SahibindenAnalyzer();
} else if (hostname.includes("hepsiemlak.com")) {
    activeAnalyzer = new HepsiemlakAnalyzer();
}

// Masaüstü uygulamasını uyandırma sinyali gönder
chrome.runtime.sendMessage({ action: "WAKE_UP" }).catch(() => {});

// Doğru motoru sayfaya enjekte et
if (activeAnalyzer) {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => activeAnalyzer.run());
    } else {
        activeAnalyzer.run();
    }
}