class TableManager {
    constructor(uiManager, ipcRenderer) {
        this.ui = uiManager;
        this.ipcRenderer = ipcRenderer;
        
        this.listingsBody = document.getElementById('listingsBody');
        this.searchInput = document.getElementById('searchInput');
        this.tableContainer = document.querySelector('.table-container');
        
        this.appStateListings = [];
        this.trMonths = { 'ocak': 1, 'şubat': 2, 'mart': 3, 'nisan': 4, 'mayıs': 5, 'haziran': 6, 'temmuz': 7, 'ağustos': 8, 'eylül': 9, 'ekim': 10, 'kasım': 11, 'aralık': 12 };

        this.initSearch();
        this.initSorting();
    }

    addListing(item, shouldSave = true) {
        this.appStateListings.push(item);
        
        // Yeni gelen veriyse JSON'a kaydetmesi için main process'e gönder
        if (shouldSave) {
            this.ipcRenderer.send('save-data', this.appStateListings);
        }
        
        let firstPhoto = '';
        if (item.photos && item.photos !== 'N/A') {
            firstPhoto = item.photos.split(',')[0].trim();
        }

        const tr = document.createElement('tr');
        
        // Görsel Kolonu
        const tdImg = document.createElement('td');
        if (firstPhoto) {
            tdImg.innerHTML = `<img src="${firstPhoto}" class="thumb-img" alt="thumb">`;
        } else {
            tdImg.innerHTML = `<div class="empty-thumb">Yok</div>`;
        }

        // Platform Tespiti
        let platform = 'Bilinmiyor';
        try {
            platform = new URL(item.url).hostname.replace('www.', '');
        } catch(e) {
            platform = 'sahibinden.com';
        }

        // Tablo İçeriği
        tr.innerHTML = `
            <td><span class="platform-badge">${platform.split('.')[0]}</span></td>
            <td>${item.ilanTarihi && item.ilanTarihi !== 'N/A' ? item.ilanTarihi : '-'}</td>
            <td>${item.title}</td>
            <td style="font-weight: bold; color: #4CAF50;">${item.price}</td>
            <td>${item.emlakTipi}</td>
            <td>${item.odaSayisi}</td>
            <td><span style="font-weight:600;">${item.locationCity}</span><br><span style="font-size:12px; color:#888;">${item.locationTown}</span></td>
            <td>${item.sellerName} <br><small style="color:#888;">${item.kimden}</small></td>
            <td>${item.phone}</td>
        `;
        
        tr.prepend(tdImg);

        // Satıra Tıklayınca Detay Sayfasını Aç
        tr.addEventListener('click', () => {
            this.ui.openDetailPage(item);
        });

        this.listingsBody.appendChild(tr);
        // Otomatik aşağı kaydırma
        this.tableContainer.scrollTop = this.tableContainer.scrollHeight;
    }

    initSearch() {
        this.searchInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value.toLowerCase();
            const rows = this.listingsBody.querySelectorAll('tr');
            
            rows.forEach(row => {
                const rowText = row.innerText.toLowerCase();
                if (rowText.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    parseTurkishDate(dateStr) {
        const parts = dateStr.trim().toLowerCase().split(' ');
        if (parts.length >= 3) {
            const day = parseInt(parts[0]) || 1;
            const month = this.trMonths[parts[1]] || 1;
            const year = parseInt(parts[2]) || 1970;
            return new Date(year, month - 1, day).getTime();
        }
        return 0; 
    }

    initSorting() {
        document.querySelectorAll('th.sortable').forEach(th => {
            th.dataset.dir = 'asc'; 

            th.addEventListener('click', () => {
                const rows = Array.from(this.listingsBody.querySelectorAll('tr'));
                const idx = Array.from(th.parentNode.children).indexOf(th);
                
                const isAsc = th.dataset.dir === 'asc';
                th.dataset.dir = isAsc ? 'desc' : 'asc';
                
                // İkonları sıfırla ve ayarlananı güncelle
                document.querySelectorAll('th.sortable span').forEach(span => span.innerText = '↕');
                th.querySelector('span').innerText = isAsc ? '↓' : '↑';

                rows.sort((a, b) => {
                    let v1 = a.children[idx].innerText.trim();
                    let v2 = b.children[idx].innerText.trim();
                    
                    // 4. İndeks Fiyat Kolonu
                    if (idx === 4) {
                        const num1 = parseInt(v1.replace(/[^0-9]/g, '')) || 0;
                        const num2 = parseInt(v2.replace(/[^0-9]/g, '')) || 0;
                        return isAsc ? num1 - num2 : num2 - num1;
                    }
                    
                    // 2. İndeks Tarih Kolonu
                    if (idx === 2) {
                        const date1 = this.parseTurkishDate(v1);
                        const date2 = this.parseTurkishDate(v2);
                        return isAsc ? date1 - date2 : date2 - date1;
                    }
                    
                    return isAsc ? v1.localeCompare(v2, 'tr') : v2.localeCompare(v1, 'tr');
                });

                rows.forEach(row => this.listingsBody.appendChild(row));
            });
        });
    }
}

module.exports = TableManager;