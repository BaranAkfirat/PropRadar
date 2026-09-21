document.getElementById('extractBtn').addEventListener('click', async () => {
    const statusText = document.getElementById('statusText');
    statusText.innerText = "Extraction started...";
    
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: "START_EXTRACTION" });    
});

document.getElementById('stopBtn').addEventListener('click', () => {
    const statusText = document.getElementById('statusText');
    statusText.innerText = "Stopping queue...";
    
    // Durdurma komutunu Service Worker'a (background.js) gönderiyoruz
    chrome.runtime.sendMessage({ action: "STOP_EXTRACTION" }, (response) => {
        if (response && response.status) {
            statusText.innerText = response.status;
        }
    });
});