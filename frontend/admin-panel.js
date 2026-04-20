// admin-panel.js (ofisant paneli)
const ADMIN_PASSWORD = "mingchinor123";

let currentTab = 'pending';
let orders = [];
let currentUser = null;
let menuItemsForModal = [];
let addItemsCart = {}; // { itemId: {item, qty} }
let addItemsTargetOrderId = null;
let addItemsTargetTableNum = null;

// ===== LOGIN =====
async function checkWaiterLogin() {
    const login = document.getElementById('waiterLogin').value.trim();
    const password = document.getElementById('waiterPassword').value.trim();
    const errorDiv = document.getElementById('loginError');

    try {
        const response = await fetch(`${API_URL}/api/waiter/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, password })
        });
        const result = await response.json();

        if (result.success) {
            currentUser = result.waiter;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            loginSuccess();
        } else {
            errorDiv.textContent = '❌ ' + (result.error || 'Login yoki parol noto\'g\'ri!');
        }
    } catch (err) {
        errorDiv.textContent = '❌ Tarmoq xatosi!';
    }
}

function loginSuccess() {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('adminContent').style.display = 'block';

    const headerTitle = document.querySelector('.admin-header h2');
    if (headerTitle && currentUser) {
        headerTitle.innerHTML = `<i class="fas fa-user-tie"></i> Ofisant: ${currentUser.name}`;
    }

    loadOrders();
    loadWaiterCalls();
    startAutoRefresh();
}

window.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
        currentUser = JSON.parse(saved);
        loginSuccess();
    }
});

function logout() {
    localStorage.removeItem('currentUser');
    window.location.reload();
}

function startAutoRefresh() {
    setInterval(() => {
        loadOrders();
        loadWaiterCalls();
    }, 8000);
}

async function loadOrders() {
    try {
        const response = await fetch(`${API_URL}/api/admin/orders`);
        orders = await response.json();
        renderOrders();
    } catch (err) {
        console.error('Load orders error:', err);
    }
}

async function confirmOrder(orderId) {
    if (!currentUser) { alert('Sessiya tugagan, qayta kiring'); logout(); return; }

    try {
        const response = await fetch(`${API_URL}/api/admin/confirm-order/${orderId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                waiterId: currentUser.id,
                waiterName: currentUser.name
            })
        });
        const result = await response.json();
        if (result.success) {
            showToast('✅ Buyurtma tasdiqlandi va printerga yuborildi!');
            loadOrders();
        } else {
            alert('Xatolik: ' + (result.error || 'Noma\'lum'));
        }
    } catch (err) {
        alert('Tarmoq xatosi');
    }
}

function renderOrders() {
    const container = document.getElementById('ordersContainer');
    let filteredOrders = [];

    const confirmedOrders = orders.filter(o => o.status === 'confirmed' || o.status === 'printed');
    const totalPeople = confirmedOrders.reduce((sum, o) => sum + (o.numberOfPeople || 1), 0);
    const totalPeopleEl = document.getElementById('totalPeopleCount');
    if (totalPeopleEl) totalPeopleEl.textContent = `${totalPeople} ta`;

    if (currentTab === 'pending') {
        filteredOrders = orders.filter(o => o.status === 'pending');
    } else if (currentTab === 'confirmed') {
        filteredOrders = confirmedOrders;
    } else {
        filteredOrders = orders;
    }

    if (filteredOrders.length === 0) {
        container.innerHTML = '<div class="empty-cart" style="padding: 60px;"><i class="fas fa-check-circle"></i><p>Hech qanday buyurtma yo\'q</p></div>';
        return;
    }

    container.innerHTML = filteredOrders.map(order => `
        <div class="order-card" id="order-${order.id}">
            <div class="order-header">
                <div>
                    <span class="order-table">🏠 Stol ${order.tableNumber}</span>
                    <span class="status-badge status-${order.status}">${getStatusText(order.status)}</span>
                </div>
                <div class="order-time">${new Date(order.createdAt).toLocaleString('uz-UZ')}</div>
            </div>
            <div style="margin-bottom: 8px; font-size: 0.9rem; color: #8a6a50;">
                <i class="fas fa-users"></i> ${order.numberOfPeople || 1} kishi
                ${order.waiterName ? `&nbsp;|&nbsp; <i class="fas fa-user-tie"></i> ${order.waiterName}` : ''}
            </div>
            <div class="order-items">
                ${order.items.map(item => `
                    <div class="order-item">
                        <span>${item.qty}x ${item.emoji || ''} ${item.name}</span>
                        <span>${formatPrice(item.price * item.qty)}</span>
                    </div>
                `).join('')}
            </div>
            <div class="order-total">
                Jami: ${formatPrice(order.totalAmount)}
                ${order.serviceFee > 0 ? `<span style="font-size:0.75rem; color:#64748b; font-weight:normal;"> (xizmat: ${formatPrice(order.serviceFee)})</span>` : ''}
            </div>

            ${order.status === 'pending' ? `
                <button class="btn-confirm" onclick="confirmOrder('${order.id}')">
                    <i class="fas fa-check"></i> Tasdiqlash & Printerga jo'natish
                </button>
            ` : `
                <div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:10px; align-items:center;">
                    <div style="color: #10b981; font-size: 0.85rem; font-weight:600;">
                        <i class="fas fa-print"></i> ${order.status === 'printed' ? 'Chek chiqarilgan' : 'Tasdiqlangan'}
                    </div>
                    <button class="btn-add-extra"
                        onclick="openAddItemsModal('${order.id}', ${order.tableNumber})"
                        style="padding:7px 16px; background:linear-gradient(135deg,#f59e0b,#d97706); color:white; border:none; border-radius:20px; font-weight:700; font-size:13px; cursor:pointer; display:flex; align-items:center; gap:6px;">
                        <i class="fas fa-plus"></i> Qo'shimcha taom qo'shish
                    </button>
                </div>
            `}
        </div>
    `).join('');
}

function getStatusText(status) {
    const map = {
        pending: '⏳ Kutilmoqda',
        confirmed: '✅ Tasdiqlangan',
        printed: '🖨️ Chek chiqarilgan',
        completed: '✔️ Yakunlangan'
    };
    return map[status] || status;
}

function formatPrice(price) {
    return Number(price || 0).toLocaleString('uz-UZ') + " so'm";
}

function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = 'position:fixed;bottom:80px;right:20px;background:#2a1a0e;color:white;padding:12px 24px;border-radius:40px;z-index:2000;font-size:14px;';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 3000);
}

// ===== QO'SHIMCHA TAOM QO'SHISH MODALI =====
async function openAddItemsModal(orderId, tableNum) {
    addItemsTargetOrderId = orderId;
    addItemsTargetTableNum = tableNum;
    addItemsCart = {};

    // Menyuni yuklash
    if (!menuItemsForModal.length) {
        try {
            const res = await fetch(`${API_URL}/api/menu`);
            menuItemsForModal = await res.json();
            
            const filter = document.getElementById('addItemsCatFilter');
            if (filter) {
                const cats = [...new Set(menuItemsForModal.map(i => i.category))].filter(Boolean);
                filter.innerHTML = '<option value="all">Barcha</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
            }
        } catch (err) {
            showToast('❌ Menyu yuklanmadi');
            return;
        }
    }

    const modal = document.getElementById('addItemsModal');
    const title = document.getElementById('addItemsModalTitle');
    if (title) title.textContent = `Stol ${tableNum} - Qo'shimcha buyurtma`;

    renderAddItemsModal();
    if (modal) modal.style.display = 'flex';
}

function closeAddItemsModal() {
    const modal = document.getElementById('addItemsModal');
    if (modal) modal.style.display = 'none';
    addItemsCart = {};
    addItemsTargetOrderId = null;
    addItemsTargetTableNum = null;
    renderAddItemsCartSummary();
}

function renderAddItemsModal() {
    const list = document.getElementById('addItemsMenuList');
    const searchVal = document.getElementById('addItemsSearch')?.value.toLowerCase() || '';
    const catFilter = document.getElementById('addItemsCatFilter')?.value || 'all';
    if (!list) return;

    let items = menuItemsForModal.filter(i => i.available);
    if (searchVal) items = items.filter(i => i.name.toLowerCase().includes(searchVal));
    if (catFilter !== 'all') items = items.filter(i => i.category === catFilter);

    list.innerHTML = items.map(item => {
        const qty = addItemsCart[item.id]?.qty || 0;
        return `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 0; border-bottom:1px solid #f1f5f9;">
                <div style="display:flex; align-items:center; gap:12px; flex:1;">
                    ${item.image
                        ? `<img src="${item.image}" style="width:44px;height:44px;border-radius:10px;object-fit:cover;" onerror="this.style.display='none'">`
                        : `<span style="font-size:28px;">${item.emoji}</span>`}
                    <div>
                        <div style="font-weight:700; font-size:14px; color:#1e293b;">${item.emoji} ${item.name}</div>
                        <div style="font-size:12px; color:#64748b;">${formatPrice(item.price)}</div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <button onclick="changeAddQty(${item.id}, -1)" style="width:30px;height:30px;border-radius:50%;border:1.5px solid #e2e8f0;background:white;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#c0522a;font-weight:700;">−</button>
                    <span style="font-weight:700; font-size:16px; min-width:20px; text-align:center; color:#1e293b;">${qty}</span>
                    <button onclick="changeAddQty(${item.id}, 1, ${JSON.stringify(item).replace(/"/g,'&quot;')})" style="width:30px;height:30px;border-radius:50%;border:none;background:linear-gradient(135deg,#c0522a,#a0411e);font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;">+</button>
                </div>
            </div>
        `;
    }).join('');

    renderAddItemsCartSummary();
}

function changeAddQty(itemId, delta, itemObj) {
    if (!addItemsCart[itemId] && delta > 0) {
        const found = menuItemsForModal.find(i => i.id === itemId);
        if (found) addItemsCart[itemId] = { item: found, qty: 0 };
    }
    if (!addItemsCart[itemId]) return;
    addItemsCart[itemId].qty = Math.max(0, addItemsCart[itemId].qty + delta);
    if (addItemsCart[itemId].qty === 0) delete addItemsCart[itemId];
    renderAddItemsModal();
}

function renderAddItemsCartSummary() {
    const summary = document.getElementById('addItemsCartSummary');
    const btnSend = document.getElementById('btnSendExtraOrder');
    if (!summary) return;

    const cartItems = Object.values(addItemsCart).filter(c => c.qty > 0);
    if (!cartItems.length) {
        summary.innerHTML = '<div style="color:#94a3b8; text-align:center; padding:16px;">Hali hech narsa tanlanmagan</div>';
        if (btnSend) btnSend.disabled = true;
        return;
    }

    const total = cartItems.reduce((s, c) => s + c.item.price * c.qty, 0);
    summary.innerHTML = `
        ${cartItems.map(c => `
            <div style="display:flex; justify-content:space-between; font-size:13px; padding:5px 0; border-bottom:1px dashed #f1f5f9;">
                <span>${c.qty}x ${c.item.emoji} ${c.item.name}</span>
                <span style="font-weight:600;">${formatPrice(c.item.price * c.qty)}</span>
            </div>
        `).join('')}
        <div style="font-weight:800; font-size:15px; text-align:right; padding-top:10px; color:#c0522a;">
            Jami: ${formatPrice(total)}
        </div>
    `;
    if (btnSend) btnSend.disabled = false;
}

async function sendExtraOrder() {
    const cartItems = Object.values(addItemsCart).filter(c => c.qty > 0);
    if (!cartItems.length) { showToast('❌ Kamida 1 ta taom tanlang!'); return; }

    const newItems = cartItems.map(c => ({
        id: c.item.id,
        name: c.item.name,
        emoji: c.item.emoji || '🍽️',
        price: c.item.price,
        cost: c.item.cost || 0,
        qty: c.qty
    }));
    const addedTotal = newItems.reduce((s, i) => s + i.price * i.qty, 0);

    try {
        const res = await fetch(`${API_URL}/api/admin/orders/${addItemsTargetOrderId}/add-items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password: ADMIN_PASSWORD,
                items: newItems,
                addedTotal,
                waiterId: currentUser?.id,
                waiterName: currentUser?.name
            })
        });
        const result = await res.json();
        if (result.success) {
            showToast(`✅ ${newItems.length} taom qo'shildi va printerga yuborildi!`);
            closeAddItemsModal();
            loadOrders();
        } else {
            showToast('❌ Xatolik: ' + (result.error || 'Noma\'lum'));
        }
    } catch (err) {
        showToast('❌ Tarmoq xatosi');
    }
}

// ===== OFISANT CHAQIRISHLAR =====
let waiterCalls = [];

async function loadWaiterCalls() {
    try {
        const res = await fetch(`${API_URL}/api/admin/waiter-calls`);
        waiterCalls = await res.json();
        renderWaiterCalls();
    } catch (err) {
        console.error('Waiter calls load error:', err);
    }
}

function renderWaiterCalls() {
    const panel = document.getElementById('waiterCallsPanel');
    const badge = document.getElementById('waiterCallBadge');
    const list  = document.getElementById('waiterCallsList');
    if (!panel || !list) return;

    if (waiterCalls.length === 0) {
        panel.classList.remove('has-calls');
        list.innerHTML = '';
        if (badge) badge.textContent = '0';
        return;
    }

    panel.classList.add('has-calls');
    if (badge) badge.textContent = waiterCalls.length;

    list.innerHTML = waiterCalls.map(call => `
        <div class="waiter-call-item" id="wc-${call.tableNumber}">
            <div class="waiter-call-info">
                <div class="waiter-call-table">
                    🔔 Stol ${call.tableNumber}
                    <span style="font-size:0.9rem; color:#64748b; margin-left:8px;">(${call.numberOfPeople || 1} kishi)</span>
                </div>
                <div class="waiter-call-meta">⏰ ${new Date(call.calledAt).toLocaleTimeString('uz-UZ')}</div>
            </div>
            <button class="btn-dismiss" onclick="dismissWaiterCall(${call.tableNumber})">
                <i class="fas fa-check"></i> Bordim
            </button>
        </div>
    `).join('');
}

async function dismissWaiterCall(tableNumber) {
    try {
        await fetch(`${API_URL}/api/admin/waiter-calls/dismiss/${tableNumber}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ waiterId: currentUser?.id, waiterName: currentUser?.name })
        });
        waiterCalls = waiterCalls.filter(c => c.tableNumber !== tableNumber);
        renderWaiterCalls();
    } catch (err) {
        console.error('Dismiss error:', err);
    }
}

async function clearAllWaiterCalls() {
    try {
        await fetch(`${API_URL}/api/admin/waiter-calls/clear`, { method: 'POST' });
        waiterCalls = [];
        renderWaiterCalls();
    } catch (err) {
        console.error('Clear all error:', err);
    }
}

// ===== WEBSOCKET =====
let socket = null;

function connectWaiterSocket() {
    socket = io(API_URL);

    socket.on('connect', () => console.log('Ofisant paneli WebSocket ulandi'));

    socket.on('waiter-call', (data) => {
        const existing = waiterCalls.findIndex(c => c.tableNumber === data.tableNumber);
        if (existing !== -1) waiterCalls[existing] = data;
        else waiterCalls.unshift(data);
        renderWaiterCalls();
        playAlertSound();
        showWaiterCall(data);
        highlightTableInOrders(data.tableNumber);
    });

    socket.on('new-order', (order) => {
        loadOrders();
        playOrderAlertSound();
        showToast(`🆕 Yangi buyurtma! Stol: ${order.tableNumber}`);
    });
}

function playOrderAlertSound() {
    const audio = new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-04.mp3');
    audio.play().catch(() => {});
}

function playAlertSound() {
    const audio = document.getElementById('notificationSound');
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            osc.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
        });
    }
}

function showWaiterCall(data) {
    const audio = new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3');
    audio.play().catch(() => {});
    showToast(`🔔 Stol ${data.tableNumber} mijoz ofisant chaqirdi!`);
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div style="background:#c0522a;color:white;padding:24px;border-radius:24px;text-align:center;max-width:300px;width:100%;">
            <i class="fas fa-bell" style="font-size:48px;margin-bottom:16px;display:block;"></i>
            <h2 style="margin-bottom:8px;">Stol ${data.tableNumber}</h2>
            <p>Ofisant chaqirildi! (${data.numberOfPeople || 1} kishi)</p>
            <button onclick="this.parentElement.parentElement.remove()" style="margin-top:16px;padding:8px 24px;background:white;border:none;border-radius:40px;color:#c0522a;font-weight:bold;">Yopish</button>
        </div>
    `;
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:4000;padding:20px;';
    document.body.appendChild(modal);
    setTimeout(() => modal.remove(), 8000);
}

function highlightTableInOrders(tableNumber) {
    document.querySelectorAll('.order-card').forEach(card => {
        if (card.textContent.includes(`Stol ${tableNumber}`)) {
            card.style.animation = 'highlight 0.5s ease 3';
            setTimeout(() => { card.style.animation = ''; }, 1500);
        }
    });
}

const styleEl = document.createElement('style');
styleEl.textContent = `
    @keyframes highlight {
        0% { background: white; border-left-color: #c0522a; }
        50% { background: #fef3c7; border-left-color: #f59e0b; }
        100% { background: white; border-left-color: #c0522a; }
    }
`;
document.head.appendChild(styleEl);

connectWaiterSocket();

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.dataset.tab;
        renderOrders();
    });
});
