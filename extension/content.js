(async function () {
  const ilanKartlari = Array.from(document.querySelectorAll('.searchResultsItem')); // İlan kartlarını seç
  const ilk10 = ilanKartlari.slice(0, 10);

  for (const ilan of ilk10) {
    const baslikEl = ilan.querySelector('.classifiedTitle');
    const fiyatEl = ilan.querySelector('.searchResultsPriceValue');
    const link = ilan.querySelector('a.classifiedTitle')?.href;

    const baslik = baslikEl?.innerText.trim() || "Bilinmiyor";
    const fiyat = fiyatEl?.innerText.trim().replace(/\n/g, '').replace(/\s+/g, ' ') || "Bilinmiyor";

    if (!link) continue;

    try {
      // Detay sayfasına gir, verileri çek
      const detayHtml = await fetch(link).then(r => r.text());
      const parser = new DOMParser();
      const doc = parser.parseFromString(detayHtml, "text/html");

      const kisiAdi = doc.querySelector(".classifiedUserName")?.innerText.trim() || "Bilinmiyor";
      const telefonNo = doc.querySelector("#phoneInfo")?.getAttribute("data-phone") || "Bilinmiyor";

      const ilanVerisi = {
        baslik,
        fiyat,
        ilanLinki: link,
        kisiAdi,
        kisiAdiMaskeli: kisiAdi.replace(/.(?=.{2})/g, '*'), // Son 2 harf hariç maskeli
        telefon: telefonNo,
        telefonMaskeli: telefonNo.replace(/\d(?=\d{2})/g, '*'), // Son 2 rakam hariç maskeli
        olusturmaTarihi: new Date().toISOString()
      };

      // Backend'e POST gönder
      await fetch("http://localhost:3000/api/ilan-ekle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(ilanVerisi)
      });

      console.log("İlan gönderildi:", ilanVerisi);

    } catch (error) {
      console.error("İlan verisi alınamadı:", error);
    }
  }

  alert("İlk 10 ilan başarıyla gönderildi.");
})();
