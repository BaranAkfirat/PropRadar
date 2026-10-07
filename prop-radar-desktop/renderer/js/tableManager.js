class TableManager {
    constructor(uiManager, ipcRenderer) {
        this.ui = uiManager;
        this.ipcRenderer = ipcRenderer;
        
        this.listingsBody = document.getElementById('listingsBody');
        this.searchInput = document.getElementById('searchInput');
        
        // YENİ: Excel tipi filtre elemanları
        this.durumFilterTrigger = document.getElementById('durumFilterTrigger');
        this.durumFilterPopup = document.getElementById('durumFilterPopup');
        this.durumCheckboxes = document.querySelectorAll('.durum-checkbox');
        
        this.tableContainer = document.querySelector('.table-container');
        
        this.appStateListings = [];
        this.trMonths = { 'ocak': 1, 'şubat': 2, 'mart': 3, 'nisan': 4, 'mayıs': 5, 'haziran': 6, 'temmuz': 7, 'ağustos': 8, 'eylül': 9, 'ekim': 10, 'kasım': 11, 'aralık': 12 };

        // Eski kayıtları JSON'dan yükle
        this.ipcRenderer.on('load-data', (e, savedData) => {
            if (savedData && Array.isArray(savedData)) {
                savedData.forEach(item => this.addListing(item, false));
            }
        });

        this.initExcelFilter();
        this.initSearch();
        this.initSorting();
    }

    // YENİ: Başlığa basınca aç/kapat, dışarı basınca kapat
    initExcelFilter() {
        if (this.durumFilterTrigger && this.durumFilterPopup) {
            this.durumFilterTrigger.addEventListener('click', (e) => {
                e.stopPropagation(); // Menü açılırken sütun sıralaması (A-Z) tetiklenmesin
                const isVisible = this.durumFilterPopup.style.display === 'flex';
                this.durumFilterPopup.style.display = isVisible ? 'none' : 'flex';
            });

            // Ekranda menü dışında bir yere tıklanınca menüyü kapat
            document.addEventListener('click', (e) => {
                if (!this.durumFilterTrigger.contains(e.target) && !this.durumFilterPopup.contains(e.target)) {
                    this.durumFilterPopup.style.display = 'none';
                }
            });
            
            // Pop-up içine (tiklere) tıklanması tabloyu etkilemesin
            this.durumFilterPopup.addEventListener('click', (e) => e.stopPropagation());
        }
    }

    maskPhoneNumber(phone) {
        if (!phone || phone === 'N/A') return 'N/A';
        if (phone.includes('*')) return phone;
        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.startsWith('90') && cleanPhone.length > 10) cleanPhone = cleanPhone.substring(2);
        if (cleanPhone.length === 10) cleanPhone = '0' + cleanPhone;
        if (cleanPhone.length >= 11) return `${cleanPhone.substring(0, 4)} *** ** ${cleanPhone.substring(cleanPhone.length - 2)}`;
        else if (cleanPhone.length > 5) return `${cleanPhone.substring(0, 3)} *** ${cleanPhone.substring(cleanPhone.length - 2)}`;
        return phone; 
    }

    addListing(item, shouldSave = true) {
        item.phone = this.maskPhoneNumber(item.phone);
        
        // Emlak durumunu her zaman Satılık, Kiralık veya Diğer kategorilerine hapset
        let finalDurum = 'Diğer';
        if (item.durum) {
            const dLower = item.durum.toLowerCase();
            if (dLower.includes('satılık')) finalDurum = 'Satılık';
            else if (dLower.includes('kiralık')) finalDurum = 'Kiralık';
        } else {
            if (item.url && item.url.includes('/satilik')) finalDurum = 'Satılık';
            else if (item.url && item.url.includes('/kiralik')) finalDurum = 'Kiralık';
        }
        item.durum = finalDurum;
        
        this.appStateListings.push(item);
        if (shouldSave) this.ipcRenderer.send('save-data', this.appStateListings);
        
        let firstPhoto = '';
        if (item.photos && item.photos !== 'N/A') firstPhoto = item.photos.split(',')[0].trim();

        const tr = document.createElement('tr');
        const tdImg = document.createElement('td');
        tdImg.innerHTML = firstPhoto ? `<img src="${firstPhoto}" class="thumb-img" alt="thumb">` : `<div class="empty-thumb">Yok</div>`;

        let platform = 'Bilinmiyor';
        try { platform = new URL(item.url).hostname.replace('www.', ''); } catch(e) { platform = 'sahibinden.com'; }

        let durumClass = 'badge-devren'; // Diğer için varsayılan
        if (item.durum === 'Satılık') durumClass = 'badge-satilik';
        else if (item.durum === 'Kiralık') durumClass = 'badge-kiralik';

        tr.dataset.durum = item.durum; 

        tr.innerHTML = `
            <td><span class="platform-badge">${platform.split('.')[0]}</span></td>
            <td><span class="platform-badge ${durumClass}">${item.durum}</span></td>
            <td>${item.ilanTarihi && item.ilanTarihi !== 'N/A' ? item.ilanTarihi : '-'}</td>
            <td>${item.title}</td>
            <td style="font-weight: bold; color: #4CAF50;">${item.price}</td>
            <td>${item.emlakTipi}</td>
            <td>${item.odaSayisi}</td>
            <td><span style="font-weight:600;">${item.locationCity}</span><br><span style="font-size:12px; color:#888;">${item.locationTown}</span></td>
            <td>${item.sellerName} <br><small style="color:#888;">${item.kimden}</small></td>
            <td><span style="font-family: monospace; letter-spacing: 1px;">${item.phone}</span></td>
        `;
        
        tr.prepend(tdImg);
        tr.addEventListener('click', () => this.ui.openDetailPage(item));

        this.listingsBody.appendChild(tr);
        this.tableContainer.scrollTop = this.tableContainer.scrollHeight;
    }

    initSearch() {
        const filterTable = () => {
            const searchTerm = this.searchInput ? this.searchInput.value.toLowerCase() : '';
            
            // İşaretli (tikli) olan checkbox değerlerini diziye al: ['Satılık', 'Kiralık'] vs.
            const checkedStatuses = Array.from(this.durumCheckboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.value);
            
            const rows = this.listingsBody.querySelectorAll('tr');
            
            rows.forEach(row => {
                const rowText = row.innerText.toLowerCase();
                const rowDurum = row.dataset.durum || 'Diğer';
                
                const matchesSearch = rowText.includes(searchTerm);
                // Eğer satırın durumu, işaretli checkbox'lar arasında varsa göster
                const matchesDurum = checkedStatuses.includes(rowDurum); 
                
                if (matchesSearch && matchesDurum) row.style.display = '';
                else row.style.display = 'none';
            });
        };

        // Arama veya tikleme değiştiğinde tabloyu süz
        if (this.searchInput) this.searchInput.addEventListener('input', filterTable);
        if (this.durumCheckboxes) {
            this.durumCheckboxes.forEach(cb => {
                cb.addEventListener('change', filterTable);
            });
        }
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
                
                document.querySelectorAll('th.sortable span').forEach(span => span.innerText = '↕');
                th.querySelector('span').innerText = isAsc ? '↓' : '↑';

                rows.sort((a, b) => {
                    let v1 = a.children[idx].innerText.trim();
                    let v2 = b.children[idx].innerText.trim();
                    
                    if (idx === 5) {
                        const num1 = parseInt(v1.replace(/[^0-9]/g, '')) || 0;
                        const num2 = parseInt(v2.replace(/[^0-9]/g, '')) || 0;
                        return isAsc ? num1 - num2 : num2 - num1;
                    }
                    if (idx === 3) {
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