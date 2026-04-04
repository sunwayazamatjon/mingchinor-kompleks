// admin-panel.js (ofisant paneli)
// API_URL endi config.js dan olinadi
const ADMIN_PASSWORD = "mingchinor123";

let currentTab = 'pending';
let orders = [];
let currentUser = null;
let posCart = {};
let posMenuData = [];

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
    
    // Ofitsiant ismini chiqarish
    const headerTitle = document.querySelector('.admin-header h2');
    if (headerTitle && currentUser) {
        headerTitle.innerHTML = `<i class="fas fa-user-tie"></i> Ofisant: ${currentUser.name}`;
    }
    
    loadOrders();
    loadWaiterCalls();
    startAutoRefresh();
}

// Sahifa yuklanganda sessiyani tekshirish
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
    if (!currentUser) {
        alert('Sessiya tugagan, iltimos qayta kiring');
        logout();
        return;
    }
    
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
            showToast('✅ Buyurtma tasdiqlandi!');
            loadOrders();
        } else {
            alert('Xatolik: ' + (result.error || 'Noma\'lum'));
        }
    } catch (err) {
        console.error('Confirm error:', err);
        alert('Tarmoq xatosi');
    }
}

function renderOrders() {
    const container = document.getElementById('ordersContainer');
    let filteredOrders = [];
    
    // Statistika: Jami xizmat ko'rsatilgan mijozlar (faqat tasdiqlangan/chiqarilgan buyurtmalar)
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
        <div class="order-card">
            <div class="order-header">
                <div>
                    <span class="order-table">🏠 Stol ${order.tableNumber}</span>
                    <span class="status-badge status-${order.status}">${getStatusText(order.status)}</span>
                </div>
                <div class="order-time">${new Date(order.createdAt).toLocaleString('uz-UZ')}</div>
            </div>
            <div style="margin-bottom: 8px; font-size: 0.9rem; color: #8a6a50;">
                <i class="fas fa-users"></i> ${order.numberOfPeople || 1} kishi
            </div>
            <div class="order-items">
                ${order.items.map(item => `
                    <div class="order-item">
                        <span>${item.qty}x ${item.emoji} ${item.name}</span>
                        <span>${formatPrice(item.price * item.qty)}</span>
                    </div>
                `).join('')}
            </div>
            <div class="order-total">
                Jami: ${formatPrice(order.totalAmount)}
            </div>
            ${order.status === 'pending' ? `
                <button class="btn-confirm" onclick="confirmOrder('${order.id}')">
                    <i class="fas fa-check"></i> Tasdiqlash & Printerga jo'natish
                </button>
            ` : `
                <div style="color: #10b981; font-size: 0.8rem;">
                    <i class="fas fa-print"></i> ${order.status === 'printed' ? 'Chek chiqarilgan' : 'Tasdiqlangan'}
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
    return price.toLocaleString('uz-UZ') + " so'm";
}

function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = 'position:fixed;bottom:80px;right:20px;background:#2a1a0e;color:white;padding:12px 24px;border-radius:40px;z-index:2000';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 3000);
}
// ============ OFISANT CHAQIRISHLAR ============
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
                <div class="waiter-call-meta">
                    ⏰ ${new Date(call.calledAt).toLocaleTimeString('uz-UZ')}
                </div>
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
            body: JSON.stringify({
                waiterId: currentUser?.id,
                waiterName: currentUser?.name
            })
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

// WebSocket ulanish (ofisant paneli uchun)
let socket = null;

function connectWaiterSocket() {
    socket = io(API_URL);
    
    socket.on('connect', () => {
        console.log('Ofisant paneli WebSocket ulandi');
    });
    
    socket.on('waiter-call', (data) => {
        // Yangi chaqirishni lokal ro'yxatga qo'shish
        const existing = waiterCalls.findIndex(c => c.tableNumber === data.tableNumber);
        if (existing !== -1) {
            waiterCalls[existing] = data;
        } else {
            waiterCalls.unshift(data);
        }
        renderWaiterCalls();
        
        // Audio signal
        playAlertSound();
        
        // Toast va modal
        showWaiterCall(data);
        highlightTableInOrders(data.tableNumber);
    });

    socket.on('new-order', (order) => {
        console.log('Yangi buyurtma keldi:', order);
        loadOrders(); // Ro'yxatni yangilash
        
        // Audio signal
        playOrderAlertSound();
        
        // Toast
        showToast(`🆕 Yangi buyurtma! Stol: ${order.tableNumber}`);
    });
}

function playOrderAlertSound() {
    const audio = new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-04.mp3');
    audio.play().catch(e => console.log('Order audio error:', e));
}

function playAlertSound() {
    const audio = document.getElementById('notificationSound');
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => {
            console.log('Autoplay blocked. Sound will play after first user interaction.');
            // Fallback: Web Audio beep
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            osc.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
        });
    }
}

function showWaiterCall(data) {
    // Audio
    const audio = new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3');
    audio.play().catch(e => console.log('Audio error:', e));
    
    // Toast
    showToast(`🔔 Stol ${data.tableNumber} mijoz ofisant chaqirdi!`);
    
    // Modal notification
    const modal = document.createElement('div');
    modal.className = 'waiter-call-modal';
    modal.innerHTML = `
        <div style="background: #c0522a; color: white; padding: 24px; border-radius: 24px; text-align: center;">
            <i class="fas fa-bell" style="font-size: 48px; margin-bottom: 16px;"></i>
            <h2>Stol ${data.tableNumber}</h2>
            <p>Ofisant chaqirildi!</p>
            <button onclick="this.parentElement.parentElement.remove()" style="margin-top: 16px; padding: 8px 24px; background: white; border: none; border-radius: 40px; color: #c0522a; font-weight: bold;">Yopish</button>
        </div>
    `;
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 4000;
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.remove(), 8000);
}

function highlightTableInOrders(tableNumber) {
    const orderCards = document.querySelectorAll('.order-card');
    orderCards.forEach(card => {
        if (card.textContent.includes(`Stol ${tableNumber}`)) {
            card.style.animation = 'highlight 0.5s ease 3';
            setTimeout(() => { card.style.animation = ''; }, 1500);
        }
    });
}

// CSS animatsiya qo'shamiz
const style = document.createElement('style');
style.textContent = `
    @keyframes highlight {
        0% { background: white; border-left-color: #c0522a; }
        50% { background: #fef3c7; border-left-color: #f59e0b; }
        100% { background: white; border-left-color: #c0522a; }
    }
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);

// Ulanish
connectWaiterSocket();
// Tab switcher
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.dataset.tab;
        if (currentTab === 'pos') {
            document.getElementById('ordersContainer').style.display = 'none';
            document.getElementById('posContainer').style.display = 'block';
            loadPosMenu();
        } else {
            document.getElementById('ordersContainer').style.display = 'block';
            document.getElementById('posContainer').style.display = 'none';
            renderOrders();
        }
    });
});

document.getElementById('refreshBtn')?.addEventListener('click', loadOrders);

// POS functions
async function loadPosMenu() {
    try {
        const response = await fetch(`${API_URL}/api/menu`);
        posMenuData = await response.json();
        renderPosMenu();
    } catch (err) {
        console.error('POS menu load error:', err);
    }
}

function renderPosMenu() {
    const menuDiv = document.getElementById('posMenu');
    menuDiv.innerHTML = posMenuData.map(item => `
        <div class="pos-item">
            <img src="${item.image || 'https://via.placeholder.com/80?text=' + encodeURIComponent(item.emoji)}" alt="${item.name}">
            <div class="pos-item-name">${item.name}</div>
            <div class="pos-item-price">${formatPrice(item.price)}</div>
            <div class="pos-item-controls">
                <button class="minus" onclick="updatePosCart('${item.id}', -1)">-</button>
                <span>${posCart[item.id] || 0}</span>
                <button class="plus" onclick="updatePosCart('${item.id}', 1)">+</button>
            </div>
        </div>
    `).join('');
    renderPosCart();
}

function updatePosCart(itemId, delta) {
    if (!posCart[itemId]) posCart[itemId] = 0;
    posCart[itemId] += delta;
    if (posCart[itemId] < 0) posCart[itemId] = 0;
    renderPosMenu();
}

function renderPosCart() {
    const cartDiv = document.getElementById('posCartItems');
    const totalSpan = document.getElementById('posTotal');
    let total = 0;
    let html = '';
    for (const [id, qty] of Object.entries(posCart)) {
        if (qty > 0) {
            const item = posMenuData.find(i => i.id === id);
            if (item) {
                const itemTotal = item.price * qty;
                total += itemTotal;
                html += `<div class="pos-cart-item">
                    <span>${item.name} x${qty}</span>
                    <span>${formatPrice(itemTotal)}</span>
                </div>`;
            }
        }
    }
    cartDiv.innerHTML = html;
    totalSpan.textContent = formatPrice(total);
}

async function placePosOrder() {
    const tableNum = document.getElementById('posTableNumber').value;
    const peopleCount = document.getElementById('posPeopleCount').value;
    
    if (!tableNum || !peopleCount) {
        alert('Stol raqami va kishilar sonini kiriting!');
        return;
    }
    
    const items = [];
    for (const [id, qty] of Object.entries(posCart)) {
        if (qty > 0) {
            items.push({ id, quantity: qty });
        }
    }
    
    if (items.length === 0) {
        alert('Kamida bitta taom tanlang!');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tableNumber: parseInt(tableNum),
                peopleCount: parseInt(peopleCount),
                items,
                source: 'pos'
            })
        });
        
        if (response.ok) {
            alert('Zakaz muvaffaqiyatli berildi!');
            posCart = {};
            document.getElementById('posTableNumber').value = '';
            document.getElementById('posPeopleCount').value = '';
            renderPosMenu();
        } else {
            alert('Zakaz berishda xatolik!');
        }
    } catch (err) {
        console.error('Order error:', err);
        alert('Tarmoq xatosi!');
    }
}