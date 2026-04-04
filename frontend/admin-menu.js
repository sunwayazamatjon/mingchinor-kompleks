// Admin paroli
const ADMIN_PASSWORD = "mingchinor123";
// API_URL endi config.js dan olinadi

let menuData = [];
let waiterData = [];
let selectedEditId = null;

// ============ TABLAR ============
function switchTab(tabId) {
    // Barcha tablarni yashirish
    const tabs = ['menu', 'waiters', 'tables', 'cashier', 'config'];
    tabs.forEach(id => {
        const el = document.getElementById('tab-' + id);
        if (el) el.style.display = 'none';
    });
    
    // Tanlangan tabni ko'rsatish
    const selectedTab = document.getElementById('tab-' + tabId);
    if (selectedTab) selectedTab.style.display = 'block';
    
    // Tugmalarni yangilash
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.currentTarget && event.currentTarget.classList) {
        event.currentTarget.classList.add('active');
    }
    
    if (tabId === 'waiters') loadWaiters();
    if (tabId === 'tables') loadTables();
    if (tabId === 'cashier') loadActiveOrders();
}

// ============ LOGIN ============
function checkAdminLogin() {
    const password = document.getElementById('adminPassword').value;
    const errorDiv = document.getElementById('loginError');

    if (password === ADMIN_PASSWORD) {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('adminContent').style.display = 'block';
        loadMenuData();
        loadWaiters();
        if(typeof loadSystemConfig === 'function') loadSystemConfig();
        generateQRCode();
    } else {
        errorDiv.textContent = '❌ Parol noto\'g\'ri!';
    }
}

function logout() {
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('adminContent').style.display = 'none';
    document.getElementById('adminPassword').value = '';
    document.getElementById('loginError').textContent = '';
    selectedEditId = null;
    document.getElementById('editItemCard').style.display = 'none';
}

// ============ MENU API ============
async function loadMenuData() {
    try {
        const response = await fetch(`${API_URL}/api/menu`);
        menuData = await response.json();
        renderItemsList();
    } catch (err) {
        console.error('Menu yuklashda xatolik:', err);
        showToast('❌ Menyu yuklanmadi. Backend ishlayotganini tekshiring!');
    }
}

async function saveMenuToAPI() {
    try {
        const response = await fetch(`${API_URL}/api/admin/menu`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password: ADMIN_PASSWORD,
                menu: menuData
            })
        });
        const result = await response.json();
        if (result.success) {
            showToast('✅ Menyu saqlandi!');
        } else {
            showToast('❌ Saqlashda xatolik: ' + (result.error || 'Noma\'lum'));
        }
    } catch (err) {
        console.error('API save error:', err);
        showToast('❌ Tarmoq xatosi!');
    }
}

// ============ UI FUNCTIONS ============
function formatPrice(price) {
    return price.toLocaleString('uz-UZ') + " so'm";
}

function readImageAsBase64(file, callback) {
    const reader = new FileReader();
    reader.onload = function (e) {
        callback(e.target.result);
    };
    reader.readAsDataURL(file);
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ============ OFISANTLAR API ============
async function loadWaiters() {
    try {
        const response = await fetch(`${API_URL}/api/admin/waiters?password=${ADMIN_PASSWORD}`);
        waiterData = await response.json();
        renderWaitersList();
    } catch (err) {
        console.error('Ofitsiantlarni yuklashda xatolik:', err);
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
        const response = await fetch(`${API_URL}/api/admin/waiters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password: ADMIN_PASSWORD,
                waiter: { id, name, login, password }
            })
        });
        const result = await response.json();
        if (result.success) {
            showToast('✅ Ofitsiant qo\'shildi!');
            document.getElementById('waiterName').value = '';
            document.getElementById('waiterId').value = '';
            document.getElementById('waiterLogin').value = '';
            document.getElementById('waiterPass').value = '';
            loadWaiters();
        } else {
            alert('Xato: ' + result.error);
        }
    } catch (err) {
        console.error('Ofitsiant qo\'shishda xatolik:', err);
    }
}

async function deleteWaiter(id) {
    if (!confirm('Ofitsiantni o\'chirmoqchimisiz?')) return;
    try {
        const response = await fetch(`${API_URL}/api/admin/waiters/${id}?password=${ADMIN_PASSWORD}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (result.success) {
            showToast('❌ Ofitsiant o\'chirildi');
            loadWaiters();
        }
    } catch (err) {
        console.error('Ofitsiantni o\'chirishda xatolik:', err);
    }
}

function renderWaitersList() {
    const container = document.getElementById('waitersListContainer');
    if (!container) return;
    
    if (waiterData.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center;">Ofitsiantlar mavjud emas</div>';
        return;
    }

    container.innerHTML = waiterData.map(w => `
        <div class="table-row" style="grid-template-columns: 80px 1.5fr 1fr 1fr 100px;">
            <div>#${w.id}</div>
            <div><strong>${w.name}</strong></div>
            <div>${w.login}</div>
            <div><code>${w.password}</code></div>
            <div>
                <button class="btn-delete" onclick="deleteWaiter('${w.id}')">O'chirish</button>
            </div>
        </div>
    `).join('');
}

// ============ TIZIM SOZLAMALARI ============
async function loadSystemConfig() {
    try {
        const response = await fetch(`${API_URL}/api/config`);
        if (response.ok) {
            const config = await response.json();
            if (config.service_fee !== undefined) {
                const input = document.getElementById('serviceFeeInput');
                if (input) input.value = config.service_fee;
            }
        }
    } catch (err) {
        console.error('Config fetch error:', err);
    }
}

async function saveSystemConfig() {
    const fee = document.getElementById('serviceFeeInput').value;
    if (fee === '' || isNaN(fee) || fee < 0) {
        showToast('❌ Xizmat summasini to\'g\'ri kiriting!');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/admin/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password: ADMIN_PASSWORD,
                config: { service_fee: parseInt(fee) }
            })
        });
        const result = await response.json();
        if (result.success) {
            showToast('✅ Tizim sozlamalari saqlandi!');
        } else {
            showToast('❌ Saqlashda xatolik: ' + result.error);
        }
    } catch (err) {
        showToast('❌ Tarmoq xatosi!');
    }
}

function renderItemsList() {
    const searchTerm = document.getElementById('searchItemInput')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('categoryFilter')?.value || 'all';

    let filtered = menuData.filter(item =>
        (item.name.toLowerCase().includes(searchTerm) || item.id.toString().includes(searchTerm)) &&
        (categoryFilter === 'all' || item.category === categoryFilter)
    );

    const container = document.getElementById('itemsListContainer');

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-cart" style="padding: 40px; text-align: center;">Hech qanday taom topilmadi</div>';
        return;
    }

    container.innerHTML = filtered.map(item => `
        <div class="table-row ${!item.available ? 'unavailable' : ''}" onclick="selectForEdit(${item.id})">
            <div>#${item.id}</div>
            <div>
                ${item.image ? `<img src="${item.image}" class="item-image" onerror="this.src='https://via.placeholder.com/60?text=Rasm+yoq'">` :
            `<div class="item-image" style="display: flex; align-items: center; justify-content: center; background: #f0f0f0;">${item.emoji}</div>`}
            </div>
            <div>
                <strong>${item.emoji} ${item.name}</strong><br>
                <small>${item.desc?.substring(0, 40) || ''}</small><br>
                <small style="color: #666;">Tan narxi: ${formatPrice(item.cost || 0)}</small>
            </div>
            <div>${item.category}</div>
            <div>${formatPrice(item.price)}</div>
            <div>
                <span class="item-status ${item.available ? 'status-available' : 'status-unavailable'}">
                    ${item.available ? 'Mavjud' : 'Mavjud emas'}
                </span>
            </div>
            <div class="action-buttons" onclick="event.stopPropagation()">
                <button class="btn-edit" onclick="selectForEdit(${item.id})">
                    <i class="fas fa-edit"></i> Tahrirlash
                </button>
                <button class="btn-toggle" onclick="toggleAvailability(${item.id})">
                    ${item.available ? '<i class="fas fa-eye-slash"></i> O\'chirish' : '<i class="fas fa-eye"></i> Yoqish'}
                </button>
                <button class="btn-delete" onclick="deleteItem(${item.id})">
                    <i class="fas fa-trash"></i> O'chirish
                </button>
            </div>
        </div>
    `).join('');
}

function selectForEdit(id) {
    const item = menuData.find(i => i.id === id);
    if (!item) return;

    selectedEditId = id;
    document.getElementById('editItemCard').style.display = 'block';

    const infoDiv = document.getElementById('selectedItemInfo');
    infoDiv.innerHTML = `
        <img src="${item.image || 'https://via.placeholder.com/50?text=Rasm+yoq'}" onerror="this.src='https://via.placeholder.com/50?text=Rasm+yoq'">
        <div><strong>${item.emoji} ${item.name}</strong><br>ID: #${item.id}</div>
    `;

    document.getElementById('editItemName').value = item.name;
    document.getElementById('editItemEmoji').value = item.emoji;
    document.getElementById('editItemPrice').value = item.price;
    document.getElementById('editItemCost').value = item.cost || 0;
    document.getElementById('editItemCategory').value = item.category;
    document.getElementById('editItemDesc').value = item.desc || '';
    document.getElementById('editItemImageUrl').value = item.image || '';

    const preview = document.getElementById('editImagePreview');
    if (item.image) {
        preview.src = item.image;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }

    document.getElementById('editItemImageFile').value = '';
    document.getElementById('editItemCard').scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
    selectedEditId = null;
    document.getElementById('editItemCard').style.display = 'none';
}

function updateSelectedItem() {
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
    if (imageUrl) {
        item.image = imageUrl;
    }

    const fileInput = document.getElementById('editItemImageFile');
    if (fileInput.files && fileInput.files[0]) {
        readImageAsBase64(fileInput.files[0], async (base64) => {
            item.image = base64;
            await saveMenuToAPI();
            renderItemsList();
            cancelEdit();
            showToast(`✅ "${item.name}" muvaffaqiyatli tahrirlandi!`);
        });
        return;
    }

    saveMenuToAPI();
    renderItemsList();
    cancelEdit();
    showToast(`✅ "${item.name}" muvaffaqiyatli tahrirlandi!`);
}

async function toggleAvailability(id) {
    const item = menuData.find(i => i.id === id);
    if (item) {
        item.available = !item.available;
        await saveMenuToAPI();
        renderItemsList();
        showToast(`${item.name} ${item.available ? 'yoqildi ✓' : 'o\'chirildi ⏸️'}`);
    }
}

async function deleteItem(id) {
    const item = menuData.find(i => i.id === id);
    if (confirm(`"${item?.name}" ni butunlay o'chirmoqchimisiz?`)) {
        menuData = menuData.filter(i => i.id !== id);
        await saveMenuToAPI();
        renderItemsList();
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

    if (!name || isNaN(price) || price <= 0 || isNaN(cost)) {
        alert('Iltimos, taom nomi, narxi va tan narxini to\'g\'ri kiriting!');
        return;
    }

    const newId = Math.max(...menuData.map(i => i.id), 0) + 1;
    const newItem = {
        id: newId,
        emoji,
        name,
        desc: desc || '',
        price,
        cost,
        category,
        available: true,
        image: ''
    };

    const fileInput = document.getElementById('itemImageFile');
    const imageUrl = document.getElementById('itemImageUrl').value.trim();

    if (fileInput.files && fileInput.files[0]) {
        readImageAsBase64(fileInput.files[0], async (base64) => {
            newItem.image = base64;
            menuData.push(newItem);
            await saveMenuToAPI();
            renderItemsList();
            clearAddForm();
            showToast(`✅ "${name}" muvaffaqiyatli qo'shildi!`);
        });
        return;
    } else if (imageUrl) {
        newItem.image = imageUrl;
    }

    menuData.push(newItem);
    await saveMenuToAPI();
    renderItemsList();
    clearAddForm();
    showToast(`✅ "${name}" muvaffaqiyatli qo'shildi!`);
}

function clearAddForm() {
    document.getElementById('itemName').value = '';
    document.getElementById('itemEmoji').value = '';
    document.getElementById('itemPrice').value = '';
    document.getElementById('itemCost').value = '';
    document.getElementById('itemDesc').value = '';
    document.getElementById('itemImageFile').value = '';
    document.getElementById('itemImageUrl').value = '';
}

// Qidiruv va filter
document.getElementById('searchItemInput')?.addEventListener('input', () => renderItemsList());
document.getElementById('categoryFilter')?.addEventListener('change', () => renderItemsList());

// Statistika yuklash
function openStatsModal() {
    document.getElementById('statsModal').style.display = 'flex';
    loadStats();
}

function closeStatsModal() {
    document.getElementById('statsModal').style.display = 'none';
}

async function loadStats() {
    const summaryDiv = document.getElementById('statsSummary');
    const itemsDiv = document.getElementById('statsItemsList');
    const waitersDiv = document.getElementById('statsWaitersList');
    
    if (summaryDiv) summaryDiv.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px;">Yuklanmoqda...</div>';
    
    try {
        const response = await fetch(`${API_URL}/api/admin/stats/sales?password=${ADMIN_PASSWORD}`);
        const stats = await response.json();

        // Summary qismi
        if (summaryDiv) {
            summaryDiv.innerHTML = `
                <div class="stats-card" style="background: linear-gradient(135deg, #eff6ff, #dbeafe); border-bottom: 4px solid #3b82f6;">
                    <div class="value" style="color: #1d4ed8;">${formatPrice(stats.summary.totalRevenue)}</div>
                    <div class="label" style="color: #1e40af;">Jami tushum (taomdan)</div>
                </div>
                <div class="stats-card" style="background: linear-gradient(135deg, #fff1f2, #ffe4e6); border-bottom: 4px solid #f43f5e;">
                    <div class="value" style="color: #be123c;">${formatPrice(stats.summary.totalCost)}</div>
                    <div class="label" style="color: #9f1239;">Jami tan narxi</div>
                </div>
                <div class="stats-card" style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border-bottom: 4px solid #10b981;">
                    <div class="value" style="color: #047857;">${formatPrice(stats.summary.totalProfit)}</div>
                    <div class="label" style="color: #065f46;">Sof foyda</div>
                </div>
                <div class="stats-card" style="background: linear-gradient(135deg, #fffbeb, #fef3c7); border-bottom: 4px solid #f59e0b;">
                    <div class="value" style="color: #b45309;">${stats.summary.totalPeopleServed}</div>
                    <div class="label" style="color: #92400e;">Jami mijozlar</div>
                </div>
            `;
        }

        // Taomlar bo'yicha statistika
        if (itemsDiv) {
            if (stats.items.length === 0) {
                itemsDiv.innerHTML = '<div style="padding: 20px; text-align: center;">Hali sotuv mavjud emas</div>';
            } else {
                itemsDiv.innerHTML = stats.items.map(item => `
                    <div class="table-row" style="grid-template-columns: 1fr 80px 80px 80px 80px 80px; padding: 12px 16px;">
                        <div style="font-weight: 600;">${item.emoji} ${item.name}</div>
                        <div style="text-align: center;">${item.quantity}</div>
                        <div style="text-align: center;">—</div>
                        <div>${formatPrice(item.totalRevenue)}</div>
                        <div style="color: #ef4444;">${formatPrice(item.totalCost)}</div>
                        <div style="color: #10b981; font-weight: bold;">${formatPrice(item.profit)}</div>
                    </div>
                `).join('');
            }
        }

        // Ofisantlar ko'rsatkichlari
        if (waitersDiv) {
            if (!stats.waiters || stats.waiters.length === 0) {
                waitersDiv.innerHTML = '<div style="padding: 20px; text-align: center;">Hali xizmat ko\'rsatilmagan</div>';
            } else {
                waitersDiv.innerHTML = stats.waiters.map(w => `
                    <div class="table-row" style="grid-template-columns: 1.5fr 1fr 1fr 1.2fr; padding: 12px 16px;">
                        <div style="font-weight: 600;">${w.name} (#${w.id})</div>
                        <div>${w.ordersCount} ta</div>
                        <div>${w.peopleServed} ta</div>
                        <div style="color: #10b981; font-weight: bold;">${formatPrice(w.revenue)}</div>
                    </div>
                `).join('');
            }
        }
    } catch (err) {
        console.error('Stats error:', err);
        showToast('❌ Statistikani yuklashda xatolik');
        if (summaryDiv) summaryDiv.innerHTML = '<div style="grid-column: 1/-1; color: red; text-align: center;">Xatolik yuz berdi</div>';
    }
}

// ============ QR KOD ============
function generateQRCode() {
    const qrDiv = document.getElementById('qrCodeDisplay');
    if (!qrDiv) return;
    qrDiv.innerHTML = '';
    // QR kod menyu sahifasiga (stol tanlash sahifasiga) yo'naltiriladi
    const menuUrl = window.location.origin + '/index.html';
    new QRCode(qrDiv, {
        text: menuUrl,
        width: 180,
        height: 180,
        colorDark: "#c0522a",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}

function downloadQRCode() {
    const canvas = document.querySelector('#qrCodeDisplay canvas');
    if (canvas) {
        const link = document.createElement('a');
        link.download = 'mingchinor_qr.png';
        link.href = canvas.toDataURL();
        link.click();
    }
}

// ============ KASSA ============
async function loadActiveOrders() {
    try {
        const response = await fetch(`${API_URL}/api/orders/active?password=${ADMIN_PASSWORD}`);
        const orders = await response.json();
        renderActiveOrders(orders);
    } catch (err) {
        console.error('Active orders load error:', err);
    }
}

function renderActiveOrders(orders) {
    const container = document.getElementById('cashier-orders-container');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">Faol buyurtmalar mavjud emas</div>';
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="order-card" style="background: white; border-radius: 16px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-left: 4px solid #10b981;">
            <div class="order-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
                <div class="order-table" style="font-size: 1.2rem; font-weight: bold; background: #f0e4d4; padding: 4px 12px; border-radius: 20px; color: #c0522a;">Stol ${order.tableNumber}</div>
                <div class="order-time" style="color: #8a6a50; font-size: 0.8rem;">${new Date(order.createdAt).toLocaleString('uz-UZ')}</div>
            </div>
            <div class="order-items" style="margin: 16px 0; padding: 12px; background: #faf7f2; border-radius: 12px;">
                ${order.items.map(item => `<div style="display: flex; justify-content: space-between; padding: 4px 0;"><span>${item.qty}x ${item.name}</span><span>${formatPrice(item.price * item.qty)}</span></div>`).join('')}
            </div>
            <div style="font-weight: bold; font-size: 1.1rem; margin: 16px 0; text-align: right; color: #c0522a;">Jami: ${formatPrice(order.totalAmount)}</div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button class="btn-add-item" style="background: #10b981; flex: 1;" onclick="printCustomerReceipt('${order._id}')"><i class="fas fa-print"></i> Chek chiqarish</button>
                <button class="btn-add-item" style="background: #3b82f6; flex: 1;" onclick="markAsPaid('${order._id}')"><i class="fas fa-check"></i> To'landi</button>
            </div>
        </div>
    `).join('');
}

async function printCustomerReceipt(orderId) {
    try {
        const response = await fetch(`${API_URL}/api/admin/print-customer/${orderId}?password=${ADMIN_PASSWORD}`, {
            method: 'POST'
        });
        if (response.ok) {
            showToast('✅ Chek chiqarildi!');
        } else {
            showToast('❌ Chek chiqarishda xatolik!');
        }
    } catch (err) {
        console.error('Print error:', err);
        showToast('❌ Tarmoq xatosi!');
    }
}

async function markAsPaid(orderId) {
    try {
        const response = await fetch(`${API_URL}/api/admin/mark-paid/${orderId}?password=${ADMIN_PASSWORD}`, {
            method: 'POST'
        });
        if (response.ok) {
            showToast('✅ Buyurtma to\'landi!');
            loadActiveOrders();
        } else {
            showToast('❌ Xatolik yuz berdi!');
        }
    } catch (err) {
        console.error('Mark paid error:', err);
        showToast('❌ Tarmoq xatosi!');
    }
}