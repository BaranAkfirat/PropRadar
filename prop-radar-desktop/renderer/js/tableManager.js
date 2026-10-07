class TableManager {
    constructor(uiManager, ipcRenderer) {
        this.ui = uiManager;
        this.ipcRenderer = ipcRenderer;
        
        this.listingsBody = document.getElementById('listingsBody');
        this.searchInput = document.getElementById('searchInput');
        
        this.durumFilterTrigger = document.getElementById('durumFilterTrigger');
        this.durumFilterPopup = document.getElementById('durumFilterPopup');
        this.durumCheckboxes = document.querySelectorAll('.durum-checkbox');
        
        // Çoklu Seçim ve Silme
        this.selectAllCb = document.getElementById('selectAllCb');
        this.deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        
        // Düzenleme Modalı Elemanları
        this.editModalOverlay = document.getElementById('editModalOverlay');
        this.editTitle = document.getElementById('editTitle');
        this.editPrice = document.getElementById('editPrice');
        this.editPhone = document.getElementById('editPhone');
        this.editDurum = document.getElementById('editDurum');
        this.cancelEditBtn = document.getElementById('cancelEditBtn');
        this.saveEditBtn = document.getElementById('saveEditBtn');
        
        this.currentEditingId = null;
        this.tableContainer = document.querySelector('.table-container');
        this.appStateListings = [];
        this.trMonths = { 'ocak': 1, 'şubat': 2, 'mart': 3, 'nisan': 4, 'mayıs': 5, 'haziran': 6, 'temmuz': 7, 'ağustos': 8, 'eylül': 9, 'ekim': 10, 'kasım': 11, 'aralık': 12 };

        this.ipcRenderer.on('load-data', (e, savedData) => {
            if (savedData && Array.isArray(savedData)) {
                savedData.forEach(item => this.addListing(item, false));
            }
        });

        this.initExcelFilter();
        this.initSearch();
        this.initSorting();
        this.initSelection();
        this.initEditModal();
    }

    initExcelFilter() {
        if (this.durumFilterTrigger && this.durumFilterPopup) {
            this.durumFilterTrigger.addEventListener('click', (e) => {
                e.stopPropagation(); 
                const isVisible = this.durumFilterPopup.style.display === 'flex';
                this.durumFilterPopup.style.display = isVisible ? 'none' : 'flex';
            });
            document.addEventListener('click', (e) => {
                if (!this.durumFilterTrigger.contains(e.target) && !this.durumFilterPopup.contains(e.target)) {
                    this.durumFilterPopup.style.display = 'none';
                }
            });
            this.durumFilterPopup.addEventListener('click', (e) => e.stopPropagation());
        }
    }

    // YENİ: ÇOKLU SEÇİM VE SİLME İŞLEMLERİ
    initSelection() {
        if(this.selectAllCb) {
            this.selectAllCb.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                const checkboxes = this.listingsBody.querySelectorAll('.row-checkbox');
                checkboxes.forEach(cb => {
                    if (cb.closest('tr').style.display !== 'none') {
                        cb.checked = isChecked;
                    }
                });
                this.updateDeleteButtonVisibility();
            });
        }

        if(this.deleteSelectedBtn) {
            this.deleteSelectedBtn.addEventListener('click', () => {
                const checkedBoxes = this.listingsBody.querySelectorAll('.row-checkbox:checked');
                if (checkedBoxes.length === 0) return;

                if (confirm(`${checkedBoxes.length} ilanı silmek istediğinize emin misiniz?`)) {
                    const idsToDelete = Array.from(checkedBoxes).map(cb => cb.value);
                    
                    // Veriden ve Ekrandan Sil
                    this.appStateListings = this.appStateListings.filter(item => !idsToDelete.includes(item._id));
                    checkedBoxes.forEach(cb => cb.closest('tr').remove());
                    
                    // Backend'e kaydet
                    this.ipcRenderer.send('save-data', this.appStateListings);
                    
                    this.selectAllCb.checked = false;
                    this.updateDeleteButtonVisibility();
                }
            });
        }
        
        this.listingsBody.addEventListener('change', (e) => {
            if (e.target.classList.contains('row-checkbox')) {
                this.updateDeleteButtonVisibility();
                // Eğer manuel olarak biri bile kaldırılırsa "Tümünü Seç" tikini kaldır
                if (!e.target.checked && this.selectAllCb) this.selectAllCb.checked = false;
            }
        });
    }

    updateDeleteButtonVisibility() {
        if(!this.deleteSelectedBtn) return;
        const checkedCount = this.listingsBody.querySelectorAll('.row-checkbox:checked').length;
        this.deleteSelectedBtn.style.display = checkedCount > 0 ? 'block' : 'none';
        if (checkedCount > 0) {
            this.deleteSelectedBtn.innerHTML = `🗑 Seçilenleri Sil (${checkedCount})`;
        }
    }

    // YENİ: DÜZENLEME MODALI VE KAYDETME
    initEditModal() {
        if(this.cancelEditBtn) {
            this.cancelEditBtn.addEventListener('click', () => {
                this.editModalOverlay.style.display = 'none';
                this.currentEditingId = null;
            });
        }

        if(this.saveEditBtn) {
            this.saveEditBtn.addEventListener('click', () => {
                if (!this.currentEditingId) return;
                
                const itemIndex = this.appStateListings.findIndex(i => i._id === this.currentEditingId);
                if (itemIndex > -1) {
                    // Verileri Güncelle
                    this.appStateListings[itemIndex].title = this.editTitle.value.trim();
                    this.appStateListings[itemIndex].price = this.editPrice.value.trim();
                    this.appStateListings[itemIndex].phone = this.editPhone.value.trim();
                    this.appStateListings[itemIndex].durum = this.editDurum.value;

                    // Arka Plana Kaydet
                    this.ipcRenderer.send('save-data', this.appStateListings);
                    
                    // Satırı Ekranda Güncelle
                    const row = this.listingsBody.querySelector(`tr[data-id="${this.currentEditingId}"]`);
                    if (row) {
                        this.updateRowDOM(row, this.appStateListings[itemIndex]);
                    }
                }
                
                this.editModalOverlay.style.display = 'none';
                this.currentEditingId = null;
            });
        }
    }

    openEditModal(item) {
        this.currentEditingId = item._id;
        this.editTitle.value = item.title;
        this.editPrice.value = item.price;
        this.editPhone.value = item.phone;
        this.editDurum.value = item.durum;
        this.editModalOverlay.style.display = 'flex';
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

    // HTML Satır Kodunu Oluşturan Yardımcı Fonksiyon (Ekleme ve Düzenlemede Kullanılır)
    getRowHTML(item) {
        let firstPhoto = '';
        if (item.photos && item.photos !== 'N/A') firstPhoto = item.photos.split(',')[0].trim();
        const imgHtml = firstPhoto ? `<img src="${firstPhoto}" class="thumb-img" alt="thumb">` : `<div class="empty-thumb">Yok</div>`;

        let platform = 'Bilinmiyor';
        try { platform = new URL(item.url).hostname.replace('www.', ''); } catch(e) { platform = 'sahibinden.com'; }

        let durumClass = 'badge-devren';
        if (item.durum === 'Satılık') durumClass = 'badge-satilik';
        else if (item.durum === 'Kiralık') durumClass = 'badge-kiralik';

        return `
            <td style="text-align: center;" class="no-click"><input type="checkbox" class="row-checkbox" value="${item._id}" style="cursor: pointer;"></td>
            <td>${imgHtml}</td>
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
            <td style="text-align: center;" class="no-click">
                <button class="btn-icon edit-btn" title="İlanı Düzenle">✎</button>
            </td>
        `;
    }

    updateRowDOM(tr, item) {
        tr.dataset.durum = item.durum; 
        tr.innerHTML = this.getRowHTML(item);
        
        // Düzenleme Butonu Eventini Yeniden Bağla
        const editBtn = tr.querySelector('.edit-btn');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openEditModal(item);
        });
    }

    addListing(item, shouldSave = true) {
        // Her ilana eşsiz bir ID atıyoruz (Düzenleme ve Silme için kritik)
        if (!item._id) item._id = 'id_' + Date.now().toString() + Math.random().toString(36).substr(2, 5);
        
        item.phone = this.maskPhoneNumber(item.phone);
        
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
        
        const tr = document.createElement('tr');
        tr.dataset.id = item._id;
        
        this.updateRowDOM(tr, item);

        // Satıra tıklayınca detay sayfasını aç (Checkbox veya Butonlara tıklandıysa yoksay)
        tr.addEventListener('click', (e) => {
            if(e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('.no-click')) return;
            this.ui.openDetailPage(item);
        });

        this.listingsBody.appendChild(tr);
        this.tableContainer.scrollTop = this.tableContainer.scrollHeight;
    }

    initSearch() {
        const filterTable = () => {
            const searchTerm = this.searchInput ? this.searchInput.value.toLowerCase() : '';
            const checkedStatuses = Array.from(this.durumCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
            const rows = this.listingsBody.querySelectorAll('tr');
            
            rows.forEach(row => {
                const rowText = row.innerText.toLowerCase();
                const rowDurum = row.dataset.durum || 'Diğer';
                const matchesSearch = rowText.includes(searchTerm);
                const matchesDurum = checkedStatuses.includes(rowDurum); 
                
                if (matchesSearch && matchesDurum) row.style.display = '';
                else row.style.display = 'none';
            });
            
            // Filtreleme sonrası "Tümünü Seç" tikini kaldır
            if (this.selectAllCb) this.selectAllCb.checked = false;
            this.updateDeleteButtonVisibility();
        };

        if (this.searchInput) this.searchInput.addEventListener('input', filterTable);
        if (this.durumCheckboxes) {
            this.durumCheckboxes.forEach(cb => cb.addEventListener('change', filterTable));
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
                    
                    // Sütun indeksleri: 6 = Fiyat, 4 = Tarih
                    if (idx === 6) {
                        const num1 = parseInt(v1.replace(/[^0-9]/g, '')) || 0;
                        const num2 = parseInt(v2.replace(/[^0-9]/g, '')) || 0;
                        return isAsc ? num1 - num2 : num2 - num1;
                    }
                    if (idx === 4) {
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