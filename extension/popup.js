document.addEventListener("DOMContentLoaded", function () {
  const taraBtn = document.getElementById("taraBtn");

  taraBtn.addEventListener("click", function () {
    // Aktif sekmeyi al
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const tab = tabs[0];
      
      // content.js dosyasını aktif sekmeye enjekte et
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      }, () => {
        console.log("content.js başarıyla yüklendi.");
      });
    });
  });
});
