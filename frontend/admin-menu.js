// ===== ADMIN PANEL JS =====
const ADMIN_PASSWORD = "mingchinor123";

let menuData = [];
let waiterData = [];
let selectedEditId = null;

// ===== SAHIFA YUKLANGANDA =====
window.addEventListener('DOMContentLoaded', () => {
    // Bugungi sana ni default qilib o'rnatamiz
    const today = new Date().toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0];
    ['salesDateFrom','checksDateFrom','waiterDateFrom'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = monthAgo;
    });
    ['salesDateTo','checksDateTo','waiterDateTo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = today;
    });

    document.getElementById('searchItemInput')?.addEventListener('input', renderItemsList);
    document.getElementById('categoryFilter')?.addEventListener('change', renderItemsList);
});

// ===== LOGIN =====
function checkAdminLogin() {
    const password = document.getElementById('adminPassword').value;
    if (password === ADMIN_PASSWORD) {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('adminContent').style.display = 'flex';
        loadMenuData();
        loadWaiters();
        loadSystemConfig();
    } else {
        document.getElementById('loginError').textContent = '❌ Parol noto\'g\'ri!';
    }
}

function logout() {
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('adminContent').style.display = 'none';
    document.getElementById('adminPassword').value = '';
    document.getElementById('loginError').textContent = '';
    selectedEditId = null;
    if (document.getElementById('editItemCard')) {
        document.getElementById('editItemCard').style.display = 'none';
    }
}

// ===== TAB SWITCHING =====
function switchTab(tabId) {
    const tabs = ['reports', 'menu', 'cashier', 'waiters', 'tables'];
    tabs.forEach(id => {
        const el = document.getElementById('tab-' + id);
        if (el) el.style.display = 'none';
    });
    document.querySelectorAll('.sidebar-nav-item').forEach(btn => btn.classList.remove('active'));

    const target = document.getElementById('tab-' + tabId);
    if (target) target.style.display = 'block';

    const navBtn = document.getElementById('nav-' + tabId);
    if (navBtn) navBtn.classList.add('active');

    if (tabId === 'waiters') loadWaiters();
    if (tabId === 'tables') loadTables();
    if (tabId === 'cashier') loadActiveOrders();
}

// ===== FORMAT =====
function formatPrice(price) {
    return Number(price || 0).toLocaleString('uz-UZ') + " so'm";
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===== MENU API =====
async function loadMenuData() {
    try {
        const res = await fetch(`${API_URL}/api/menu`);
        menuData = await res.json();
        populateCategoryChoices();
        renderItemsList();
    } catch (err) {
        showToast('❌ Menyu yuklanmadi. Backend ishlayotganini tekshiring!');
    }
}

async function saveMenuToAPI() {
    try {
        const res = await fetch(`${API_URL}/api/admin/menu`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: ADMIN_PASSWORD, menu: menuData })
        });
        const result = await res.json();
        if (!result.success) showToast('❌ Saqlashda xatolik: ' + (result.error || ''));
        return result.success;
    } catch (err) {
        showToast('❌ Tarmoq xatosi!');
        return false;
    }
}

function getMenuCategories() {
    const cats = [...new Set(menuData.map(item => item.category).filter(Boolean))];
    const order = ['🍜 Birinchi taomlar', '🍽️ Ikkinchi taomlar', '🫓 Non va sneklar', '🧃 Ichimliklar', '🍰 Shirinliklar'];
    return cats.sort((a, b) => {
        const ai = order.indexOf(a);
        const bi = order.indexOf(b);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.localeCompare(b);
    });
}

function populateCategoryChoices() {
    const categories = getMenuCategories();
    const categoryFilter = document.getElementById('categoryFilter');
    const itemCategory = document.getElementById('itemCategory');
    const editItemCategory = document.getElementById('editItemCategory');
    const defaultCategories = categories.length ? categories : ['🍜 Birinchi taomlar', '🍽️ Ikkinchi taomlar', '🫓 Non va sneklar', '🧃 Ichimliklar', '🍰 Shirinliklar'];

    if (categoryFilter) {
        const selected = categoryFilter.value || 'all';
        categoryFilter.innerHTML = '<option value="all">Barcha kategoriyalar</option>' + defaultCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        if (defaultCategories.includes(selected) || selected === 'all') categoryFilter.value = selected;
    }
    if (itemCategory) {
        itemCategory.innerHTML = defaultCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    }
    if (editItemCategory) {
        editItemCategory.innerHTML = defaultCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    }
}

function readImageAsBase64(file, callback) {
    const reader = new FileReader();
    reader.onload = e => callback(e.target.result);
    reader.readAsDataURL(file);
}

// ===== MENU RENDER =====
function renderItemsList() {
    const searchTerm = document.getElementById('searchItemInput')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('categoryFilter')?.value || 'all';
    const container = document.getElementById('itemsListContainer');
    if (!container) return;

    const filtered = menuData.filter(item =>
        (item.name.toLowerCase().includes(searchTerm) || item.id.toString().includes(searchTerm)) &&
        (categoryFilter === 'all' || item.category === categoryFilter)
    );

    if (filtered.length === 0) {
        container.innerHTML = '<div style="padding:40px; text-align:center; color:#94a3b8;">Taomlar topilmadi</div>';
        return;
    }

    container.innerHTML = filtered.map(item => `
        <div class="table-row-item table-col-7 ${!item.available ? 'unavailable' : ''}" onclick="selectForEdit(${item.id})">
            <div style="font-weight:700; color:#64748b;">#${item.id}</div>
            <div>
                ${item.image
                    ? `<img src="${item.image}" class="item-image-sm" onerror="this.src='https://via.placeholder.com/52?text=?'">`
                    : `<div class="item-image-sm" style="display:flex;align-items:center;justify-content:center;font-size:24px;background:#f1f5f9;">${item.emoji}</div>`}
            </div>
            <div>
                <strong>${item.emoji} ${item.name}</strong><br>
                <small style="color:#64748b;">${(item.desc || '').substring(0,45)}</small><br>
                <small style="color:#94a3b8;">Tan narxi: ${formatPrice(item.cost || 0)}</small>
            </div>
            <div style="font-size:12px; color:#64748b;">${item.category}</div>
            <div style="font-weight:700; color:#c0522a;">${formatPrice(item.price)}</div>
            <div>
                <span class="item-status-badge ${item.available ? 'status-available' : 'status-unavailable'}">
                    ${item.available ? 'Mavjud' : 'Yo\'q'}
                </span>
            </div>
            <div class="action-btns" onclick="event.stopPropagation()">
                <button class="btn-xs edit" onclick="selectForEdit(${item.id})"><i class="fas fa-edit"></i></button>
                <button class="btn-xs toggle" onclick="toggleAvailability(${item.id})">${item.available ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>'}</button>
                <button class="btn-xs del" onclick="deleteItem(${item.id})"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function selectForEdit(id) {
    const item = menuData.find(i => i.id === id);
    if (!item) return;
    selectedEditId = id;
    document.getElementById('editItemCard').style.display = 'block';

    document.getElementById('selectedItemInfo').innerHTML = `
        ${item.image ? `<img src="${item.image}" style="width:44px;height:44px;border-radius:8px;object-fit:cover;" onerror="this.style.display='none'">` : `<span style="font-size:32px;">${item.emoji}</span>`}
        <div><strong>${item.emoji} ${item.name}</strong><br><span style="font-size:12px;color:#64748b;">ID: #${item.id}</span></div>
    `;
    document.getElementById('editItemName').value = item.name;
    document.getElementById('editItemEmoji').value = item.emoji;
    document.getElementById('editItemPrice').value = item.price;
    document.getElementById('editItemCost').value = item.cost || 0;
    document.getElementById('editItemCategory').value = item.category;
    document.getElementById('editItemDesc').value = item.desc || '';
    document.getElementById('editItemImageUrl').value = item.image || '';

    const preview = document.getElementById('editImagePreview');
    if (item.image) { preview.src = item.image; preview.style.display = 'block'; }
    else { preview.style.display = 'none'; }
    document.getElementById('editItemImageFile').value = '';
    document.getElementById('editItemCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function cancelEdit() {
    selectedEditId = null;
    document.getElementById('editItemCard').style.display = 'none';
}

async function updateSelectedItem() {
    if (!selectedEditId) return;
    const item = menuData.find(i => i.id === selectedEditId);
    if (!item) return;

    item.name = document.getElementById('editItemName').value.trim();
    item.emoji = document.getElementById('editItemEmoji').value.trim() || '🍽️';
    item.price = parseInt(document.getElementById('editItemPrice').value);
    item.cost = parseInt(document.getElementById('editItemCost').value) || 0;
    item.category = document.getElementById('editItemCategory').value;
    item.desc = document.getElementById('editItemDesc').value.trim();

    const imageUrl = document.getElementById('editItemImageUrl').value.trim();
    if (imageUrl) item.image = imageUrl;

    const fileInput = document.getElementById('editItemImageFile');
    if (fileInput.files && fileInput.files[0]) {
        readImageAsBase64(fileInput.files[0], async base64 => {
            item.image = base64;
            await saveMenuToAPI();
            renderItemsList();
            cancelEdit();
            showToast(`✅ "${item.name}" tahrirlandi!`);
        });
        return;
    }
    await saveMenuToAPI();
    populateCategoryChoices();
    renderItemsList();
    cancelEdit();
    showToast(`✅ "${item.name}" tahrirlandi!`);
}

async function toggleAvailability(id) {
    const item = menuData.find(i => i.id === id);
    if (item) {
        item.available = !item.available;
        await saveMenuToAPI();
        renderItemsList();
        showToast(`${item.name} ${item.available ? '✅ yoqildi' : '⏸️ o\'chirildi'}`);
    }
}

async function deleteItem(id) {
    const item = menuData.find(i => i.id === id);
    if (confirm(`"${item?.name}" ni o'chirmoqchimisiz?`)) {
        menuData = menuData.filter(i => i.id !== id);
        await saveMenuToAPI();
        renderItemsList();
        populateCategoryChoices();
        if (selectedEditId === id) cancelEdit();
        showToast(`❌ "${item?.name}" o'chirildi`);
    }
}

async function addNewItem() {
    const name = document.getElementById('itemName').value.trim();
    const emoji = document.getElementById('itemEmoji').value.trim() || '🍽️';
    const price = parseInt(document.getElementById('itemPrice').value);
    const cost = parseInt(document.getElementById('itemCost').value) || 0;
    const category = document.getElementById('itemCategory').value;
    const desc = document.getElementById('itemDesc').value.trim();

    if (!name || isNaN(price) || price <= 0) {
        alert('Taom nomi va narxini to\'g\'ri kiriting!');
        return;
    }

    const newId = Math.max(...menuData.map(i => i.id), 0) + 1;
    const newItem = { id: newId, emoji, name, desc, price, cost, category, available: true, image: '' };

    const fileInput = document.getElementById('itemImageFile');
    const imageUrl = document.getElementById('itemImageUrl').value.trim();

    if (fileInput.files && fileInput.files[0]) {
        readImageAsBase64(fileInput.files[0], async base64 => {
            newItem.image = base64;
            menuData.push(newItem);
            await saveMenuToAPI();
            renderItemsList();
            clearAddForm();
            showToast(`✅ "${name}" qo'shildi!`);
        });
        return;
    } else if (imageUrl) {
        newItem.image = imageUrl;
    }

    menuData.push(newItem);
    await saveMenuToAPI();
    populateCategoryChoices();
    renderItemsList();
    clearAddForm();
    showToast(`✅ "${name}" qo'shildi!`);
}

function clearAddForm() {
    ['itemName','itemEmoji','itemPrice','itemCost','itemDesc','itemImageUrl'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const f = document.getElementById('itemImageFile');
    if (f) f.value = '';
}

// ===== OFISANTLAR =====
async function loadWaiters() {
    try {
        const res = await fetch(`${API_URL}/api/admin/waiters?password=${ADMIN_PASSWORD}`);
        waiterData = await res.json();
        renderWaitersList();
    } catch (err) {
        console.error('Ofisantlarni yuklashda xatolik:', err);
    }
}

async function addNewWaiter() {
    const name = document.getElementById('waiterName').value.trim();
    const id = document.getElementById('waiterId').value.trim();
    const login = document.getElementById('waiterLogin').value.trim();
    const password = document.getElementById('waiterPass').value.trim();

    if (!name || !id || !login || !password) {
        alert('Barcha maydonlarni to\'ldiring!');
        return;
    }
    try {
        const res = await fetch(`${API_URL}/api/admin/waiters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: ADMIN_PASSWORD, waiter: { id, name, login, password } })
        });
        const result = await res.json();
        if (result.success) {
            showToast('✅ Ofisant qo\'shildi!');
            ['waiterName','waiterId','waiterLogin','waiterPass'].forEach(i => document.getElementById(i).value = '');
            loadWaiters();
        } else {
            alert('Xato: ' + result.error);
        }
    } catch (err) {
        alert('Tarmoq xatosi');
    }
}

async function deleteWaiter(id) {
    if (!confirm('Ofisantni o\'chirmoqchimisiz?')) return;
    try {
        const res = await fetch(`${API_URL}/api/admin/waiters/${id}?password=${ADMIN_PASSWORD}`, { method: 'DELETE' });
        const result = await res.json();
        if (result.success) {
            showToast('❌ Ofisant o\'chirildi');
            loadWaiters();
        }
    } catch (err) {
        alert('Tarmoq xatosi');
    }
}

function renderWaitersList() {
    const container = document.getElementById('waitersListContainer');
    if (!container) return;
    if (!waiterData.length) {
        container.innerHTML = '<div style="padding:24px; text-align:center; color:#94a3b8;">Ofisantlar mavjud emas</div>';
        return;
    }
    container.innerHTML = waiterData.map(w => `
        <div class="table-row-item table-col-5">
            <div style="font-weight:700; color:#64748b;">#${w.id}</div>
            <div><strong>${w.name}</strong></div>
            <div>${w.login}</div>
            <div><code style="background:#f1f5f9; padding:3px 8px; border-radius:6px; font-size:12px;">${w.password}</code></div>
            <div>
                <button class="btn-xs del" onclick="deleteWaiter('${w.id}')"><i class="fas fa-trash"></i> O'chirish</button>
            </div>
        </div>
    `).join('');
}

// ===== STOLLAR =====
async function loadTables() {
    try {
        const res = await fetch(`${API_URL}/api/admin/tables`);
        const tables = await res.json();
        renderTablesList(tables);
        updateChecksTableFilter(tables);
    } catch (err) {
        console.error('Stollar yuklashda xatolik:', err);
    }
}

function updateChecksTableFilter(tables) {
    const sel = document.getElementById('checksTableFilter');
    if (!sel) return;
    sel.innerHTML = '<option value="all">Barchasi</option>' +
        tables.map(t => `<option value="${t.number}">Stol ${t.number}</option>`).join('');
}

function renderTablesList(tables) {
    const container = document.getElementById('tables-list-container');
    if (!container) return;
    if (!tables.length) {
        container.innerHTML = '<div style="padding:20px; text-align:center; color:#94a3b8;">Stollar mavjud emas</div>';
        return;
    }
    container.innerHTML = `
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(160px,1fr)); gap:12px;">
            ${tables.map(t => `
                <div style="background:${t.status==='occupied'?'#fee2e2':'#f0fdf4'}; border:1.5px solid ${t.status==='occupied'?'#fca5a5':'#a7f3d0'}; border-radius:14px; padding:16px; text-align:center;">
                    <div style="font-size:28px; margin-bottom:8px;">🪑</div>
                    <div style="font-weight:700; font-size:16px; color:#1e293b;">Stol ${t.number}</div>
                    <div style="font-size:12px; margin-top:4px; color:${t.status==='occupied'?'#dc2626':'#059669'};">
                        ${t.status==='occupied' ? '🔴 Band' : '🟢 Bo\'sh'}
                    </div>
                    <button onclick="deleteTable(${t.number})" style="margin-top:10px; padding:4px 12px; background:#fee2e2; border:1px solid #fca5a5; border-radius:8px; color:#dc2626; font-size:11px; font-weight:600; cursor:pointer;">O'chirish</button>
                </div>
            `).join('')}
        </div>
    `;
}

async function addTable() {
    const num = parseInt(document.getElementById('newTableNumber').value);
    if (!num || num <= 0) { alert('Stol raqamini kiriting!'); return; }
    try {
        const res = await fetch(`${API_URL}/api/admin/tables`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: ADMIN_PASSWORD, table: { number: num } })
        });
        const result = await res.json();
        if (result.success) {
            showToast(`✅ Stol ${num} qo'shildi!`);
            document.getElementById('newTableNumber').value = '';
            loadTables();
        } else {
            alert('Xato: ' + result.error);
        }
    } catch (err) {
        alert('Tarmoq xatosi');
    }
}

async function deleteTable(num) {
    if (!confirm(`Stol ${num}ni o'chirmoqchimisiz?`)) return;
    try {
        const res = await fetch(`${API_URL}/api/admin/tables/${num}?password=${ADMIN_PASSWORD}`, { method: 'DELETE' });
        const result = await res.json();
        if (result.success) { showToast(`Stol ${num} o'chirildi`); loadTables(); }
    } catch (err) { alert('Xatolik'); }
}

// ===== TIZIM SOZLAMALARI =====
async function loadSystemConfig() {
    try {
        const res = await fetch(`${API_URL}/api/config`);
        if (res.ok) {
            const config = await res.json();
            if (config.service_fee !== undefined) {
                const input = document.getElementById('serviceFeeInput');
                if (input) input.value = config.service_fee;
            }
        }
    } catch (err) { console.error('Config fetch error:', err); }
}

async function saveSystemConfig() {
    const fee = document.getElementById('serviceFeeInput').value;
    if (fee === '' || isNaN(fee) || Number(fee) < 0) {
        showToast('❌ To\'g\'ri summa kiriting!');
        return;
    }
    try {
        const res = await fetch(`${API_URL}/api/admin/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: ADMIN_PASSWORD, config: { service_fee: parseInt(fee) } })
        });
        const result = await res.json();
        if (result.success) showToast('✅ Xizmat narxi saqlandi!');
        else showToast('❌ Xatolik: ' + result.error);
    } catch (err) { showToast('❌ Tarmoq xatosi!'); }
}

// ===== KASSA =====
async function loadActiveOrders() {
    const container = document.getElementById('cashier-orders-container');
    if (!container) return;
    try {
        const res = await fetch(`${API_URL}/api/admin/orders`);
        const allOrders = await res.json();
        // Stol bo'yicha guruhlaymiz (faqat confirmed/printed)
        const active = allOrders.filter(o => o.status === 'confirmed' || o.status === 'printed');
        if (!active.length) {
            container.innerHTML = '<div style="padding:40px; text-align:center; color:#94a3b8; grid-column:1/-1;"><i class="fas fa-check-circle" style="font-size:40px; margin-bottom:12px; display:block;"></i>Hech qanday aktiv buyurtma yo\'q</div>';
            return;
        }
        // Stollar bo'yicha guruhlash
        const byTable = {};
        active.forEach(o => {
            if (!byTable[o.tableNumber]) byTable[o.tableNumber] = [];
            byTable[o.tableNumber].push(o);
        });
        container.innerHTML = Object.entries(byTable).map(([tableNum, orders]) => {
            // Barcha buyurtmalarni bitta chekga yig'ish
            const allItems = [];
            orders.forEach(o => o.items.forEach(item => {
                const existing = allItems.find(i => i.id === item.id && i.name === item.name);
                if (existing) existing.qty += item.qty;
                else allItems.push({ ...item });
            }));
            const totalAmount = orders.reduce((s, o) => s + o.totalAmount, 0);
            const serviceFee = orders.reduce((s, o) => s + (o.serviceFee || 0), 0);
            const subtotal = totalAmount - serviceFee;
            const people = orders[0]?.numberOfPeople || 1;
            const firstTime = new Date(orders[0]?.createdAt).toLocaleString('uz-UZ');

            return `
                <div class="kassa-card">
                    <div class="kassa-card-header">
                        <span class="kassa-table-label">🪑 Stol ${tableNum}</span>
                        <span style="font-size:12px; color:#94a3b8;">${firstTime}</span>
                    </div>
                    <div style="font-size:12px; color:#64748b; margin-bottom:8px;">
                        <i class="fas fa-users"></i> ${people} kishi &nbsp;|&nbsp;
                        <i class="fas fa-receipt"></i> ${orders.length} ta buyurtma
                    </div>
                    <div class="kassa-items">
                        ${allItems.map(item => `
                            <div class="kassa-item-row">
                                <span>${item.qty}x ${item.emoji || ''} ${item.name}</span>
                                <span style="font-weight:600; color:#1e293b;">${formatPrice(item.price * item.qty)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div style="border-top:1px solid #f1f5f9; padding-top:10px; margin-top:4px;">
                        <div style="display:flex; justify-content:space-between; font-size:13px; color:#64748b; margin-bottom:4px;">
                            <span>Taomlar jami</span><span>${formatPrice(subtotal)}</span>
                        </div>
                        ${serviceFee > 0 ? `
                        <div style="display:flex; justify-content:space-between; font-size:13px; color:#64748b; margin-bottom:4px;">
                            <span>Xizmat narxi</span><span>${formatPrice(serviceFee)}</span>
                        </div>` : ''}
                        <div class="kassa-total">
                            Jami: ${formatPrice(totalAmount)}
                        </div>
                    </div>
                    <button class="btn-print-bill" onclick="printCashierBill(${tableNum})">
                        <i class="fas fa-print"></i> Hisobni berish (Chek chiqarish)
                    </button>
                    <button onclick="clearTableBill(${tableNum})" style="width:100%; margin-top:8px; padding:9px; border:1.5px solid #e2e8f0; border-radius:10px; background:white; color:#64748b; font-size:13px; font-weight:600; cursor:pointer;">
                        <i class="fas fa-check"></i> To'landi, stolni bo'shatish
                    </button>
                </div>
            `;
        }).join('');
    } catch (err) {
        container.innerHTML = '<div style="padding:24px; text-align:center; color:#ef4444; grid-column:1/-1;">Yuklanmadi. Backend bilan aloqa yo\'q.</div>';
    }
}

async function printCashierBill(tableNumber) {
    try {
        const res = await fetch(`${API_URL}/api/admin/print-final-bill/${tableNumber}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: ADMIN_PASSWORD })
        });
        const result = await res.json();
        if (result.success) {
            showToast(`✅ Stol ${tableNumber} uchun chek chiqarildi!`);
        } else {
            showToast('❌ Printer xatosi: ' + (result.error || 'Noma\'lum'));
        }
    } catch (err) {
        showToast('❌ Printer ulanmagan yoki xatolik bor');
    }
}

async function clearTableBill(tableNumber) {
    if (!confirm(`Stol ${tableNumber} to'landi deb belgilashni tasdiqlaysizmi?`)) return;
    try {
        // Stol statusini bo'shatamiz
        const res = await fetch(`${API_URL}/api/admin/tables/clear/${tableNumber}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        showToast(`✅ Stol ${tableNumber} bo'shatildi`);
        loadActiveOrders();
    } catch (err) {
        showToast('❌ Xatolik');
    }
}

// ===== HISOBOT: SOTUVLAR =====
async function loadSalesReport() {
    const from = document.getElementById('salesDateFrom').value;
    const to = document.getElementById('salesDateTo').value;
    if (!from || !to) { showToast('❌ Sanalarni tanlang!'); return; }

    try {
        const res = await fetch(`${API_URL}/api/admin/stats/sales?password=${ADMIN_PASSWORD}&from=${from}&to=${to}`);
        const stats = await res.json();
        const s = stats.summary;

        document.getElementById('salesRevenue').textContent = formatPrice(s.totalRevenue || 0);
        document.getElementById('salesCost').textContent = formatPrice(s.totalCost || 0);
        document.getElementById('salesProfit').textContent = formatPrice(s.totalProfit || 0);
        document.getElementById('salesOrders').textContent = (s.totalOrders || 0) + ' ta';

        const tableDiv = document.getElementById('salesItemsTable');
        if (!stats.items || !stats.items.length) {
            tableDiv.innerHTML = '<div style="padding:24px; text-align:center; color:#94a3b8;">Ushbu davr uchun sotuv ma\'lumotlari yo\'q</div>';
            return;
        }
        tableDiv.innerHTML = `
            <div class="table-head" style="grid-template-columns: 1.5fr 60px 90px 90px 90px; font-size:12px;">
                <div>Taom nomi</div><div>Dona</div><div>Sotuv</div><div>Tan narx</div><div>Foyda</div>
            </div>
            ${stats.items.map(item => `
                <div class="table-row-item" style="grid-template-columns: 1.5fr 60px 90px 90px 90px; font-size:13px;">
                    <div><strong>${item.emoji || ''} ${item.name}</strong></div>
                    <div style="text-align:center; font-weight:700;">${item.quantity}</div>
                    <div style="color:#1d4ed8;">${formatPrice(item.totalRevenue)}</div>
                    <div style="color:#be123c;">${formatPrice(item.totalCost)}</div>
                    <div style="color:#047857; font-weight:700;">${formatPrice(item.profit)}</div>
                </div>
            `).join('')}
        `;
    } catch (err) {
        showToast('❌ Hisobot yuklanmadi');
    }
}

// ===== HISOBOT: CHEKLAR TARIXI =====
async function loadChecksHistory() {
    const from = document.getElementById('checksDateFrom').value;
    const to = document.getElementById('checksDateTo').value;
    const table = document.getElementById('checksTableFilter').value;
    if (!from || !to) { showToast('❌ Sanalarni tanlang!'); return; }

    const container = document.getElementById('checksHistoryContainer');
    container.innerHTML = '<div style="padding:20px; text-align:center; color:#94a3b8;"><i class="fas fa-spinner fa-pulse"></i> Yuklanmoqda...</div>';

    try {
        let url = `${API_URL}/api/admin/orders?from=${from}&to=${to}`;
        if (table !== 'all') url += `&table=${table}`;
        const res = await fetch(url);
        let orders = await res.json();

        // Sana filtri
        const fromD = new Date(from);
        const toD = new Date(to); toD.setHours(23,59,59,999);
        orders = orders.filter(o => {
            const d = new Date(o.createdAt);
            return d >= fromD && d <= toD && (o.status === 'confirmed' || o.status === 'printed');
        });
        if (table !== 'all') orders = orders.filter(o => o.tableNumber == table);

        if (!orders.length) {
            container.innerHTML = '<div style="padding:24px; text-align:center; color:#94a3b8;">Bu davr uchun cheklar yo\'q</div>';
            return;
        }

        // Stol bo'yicha guruhlash
        const byTable = {};
        orders.forEach(o => {
            if (!byTable[o.tableNumber]) byTable[o.tableNumber] = [];
            byTable[o.tableNumber].push(o);
        });

        container.innerHTML = Object.entries(byTable).sort((a,b)=>a[0]-b[0]).map(([tableNum, tOrders]) => {
            return `
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:16px; margin-bottom:12px;">
                    <div style="font-weight:700; font-size:15px; color:#1e293b; margin-bottom:10px; display:flex; align-items:center; gap:8px;">
                        🪑 Stol ${tableNum}
                        <span style="font-size:11px; background:#dbeafe; color:#1d4ed8; padding:2px 8px; border-radius:10px; font-weight:600;">${tOrders.length} ta buyurtma</span>
                    </div>
                    ${tOrders.sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)).map(o => `
                        <div style="background:white; border:1px solid #f1f5f9; border-radius:10px; padding:12px; margin-bottom:8px;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:12px; color:#64748b;">
                                <span><i class="fas fa-clock"></i> ${new Date(o.createdAt).toLocaleString('uz-UZ')}</span>
                                <span>${o.waiterName ? `👤 ${o.waiterName}` : ''}</span>
                            </div>
                            ${o.items.map(item => `
                                <div style="display:flex; justify-content:space-between; font-size:13px; padding:3px 0; border-bottom:1px dashed #f1f5f9;">
                                    <span>${item.qty}x ${item.emoji||''} ${item.name}</span>
                                    <span style="font-weight:600;">${formatPrice(item.price * item.qty)}</span>
                                </div>
                            `).join('')}
                            <div style="text-align:right; font-weight:700; margin-top:8px; color:#c0522a;">
                                Jami: ${formatPrice(o.totalAmount)}
                            </div>
                        </div>
                    `).join('')}
                    <div style="text-align:right; font-weight:800; font-size:15px; color:#1e293b; padding-top:4px;">
                        Stol jami: ${formatPrice(tOrders.reduce((s,o)=>s+o.totalAmount,0))}
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        container.innerHTML = '<div style="padding:24px; text-align:center; color:#ef4444;">Yuklanmadi</div>';
    }
}

// ===== HISOBOT: OFISANT =====
async function loadWaiterReport() {
    const from = document.getElementById('waiterDateFrom').value;
    const to = document.getElementById('waiterDateTo').value;
    const startHour = document.getElementById('waiterStartHour').value || '00:00';
    const endHour = document.getElementById('waiterEndHour').value || '23:59';
    if (!from || !to) { showToast('❌ Sanalarni tanlang!'); return; }

    const container = document.getElementById('waiterReportContainer');
    container.innerHTML = '<div style="padding:20px; text-align:center; color:#94a3b8;"><i class="fas fa-spinner fa-pulse"></i> Yuklanmoqda...</div>';

    try {
        const res = await fetch(`${API_URL}/api/admin/stats/sales?password=${ADMIN_PASSWORD}&from=${from}&to=${to}`);
        const stats = await res.json();

        // Soat filtrini qo'llamiz (faqat umumiy statistikadan)
        // Buyurtmalarni soat bo'yicha filtrlash uchun alohida so'rov
        const ordersRes = await fetch(`${API_URL}/api/admin/orders`);
        let allOrders = await ordersRes.json();

        const fromD = new Date(from);
        const toD = new Date(to); toD.setHours(23,59,59,999);
        const [sh, sm] = startHour.split(':').map(Number);
        const [eh, em] = endHour.split(':').map(Number);

        allOrders = allOrders.filter(o => {
            const d = new Date(o.createdAt);
            if (d < fromD || d > toD) return false;
            if (o.status !== 'confirmed' && o.status !== 'printed') return false;
            const h = d.getHours(), m = d.getMinutes();
            const timeVal = h * 60 + m;
            return timeVal >= (sh*60+sm) && timeVal <= (eh*60+em);
        });

        // Ofisant bo'yicha guruhlash
        const waiterMap = {};
        allOrders.forEach(o => {
            const key = o.waiterId || 'nowaiter';
            if (!waiterMap[key]) {
                waiterMap[key] = {
                    id: o.waiterId || '—',
                    name: o.waiterName || 'Noma\'lum',
                    ordersCount: 0,
                    peopleServed: 0,
                    totalAmount: 0
                };
            }
            waiterMap[key].ordersCount++;
            waiterMap[key].peopleServed += (o.numberOfPeople || 1);
            waiterMap[key].totalAmount += o.totalAmount;
        });

        const waiters = Object.values(waiterMap);
        if (!waiters.length) {
            container.innerHTML = '<div style="padding:24px; text-align:center; color:#94a3b8;">Bu davr va soat oralig\'i uchun ma\'lumot yo\'q</div>';
            return;
        }

        container.innerHTML = `
            <div class="data-table">
                <div class="table-head" style="grid-template-columns: 1.5fr 70px 80px 80px 120px; font-size:12px;">
                    <div>Ofisant</div><div>Cheklar</div><div>Mijozlar</div><div>Umumiy</div><div>Kishi boshiga</div>
                </div>
                ${waiters.map(w => `
                    <div class="table-row-item" style="grid-template-columns: 1.5fr 70px 80px 80px 120px; font-size:13px;">
                        <div><strong>${w.name}</strong><br><small style="color:#94a3b8;">#${w.id}</small></div>
                        <div style="text-align:center; font-weight:700;">${w.ordersCount}</div>
                        <div style="text-align:center; font-weight:700;">${w.peopleServed} ta</div>
                        <div style="color:#047857; font-weight:700;">${formatPrice(w.totalAmount)}</div>
                        <div style="color:#1d4ed8;">${w.peopleServed > 0 ? formatPrice(Math.round(w.totalAmount / w.peopleServed)) : '—'}</div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (err) {
        container.innerHTML = '<div style="padding:24px; text-align:center; color:#ef4444;">Yuklanmadi</div>';
    }
}
