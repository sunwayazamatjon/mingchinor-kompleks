// API_URL endi config.js dan olinadi
const ADMIN_PASSWORD = "mingchinor123";

let currentTab = 'pending';
let orders = [];

function checkLogin() {
    const password = document.getElementById('adminPassword').value;
    if (password === ADMIN_PASSWORD) {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('adminContent').style.display = 'block';
        loadOrders();
        startAutoRefresh();
    } else {
        document.getElementById('loginError').textContent = '❌ Parol noto\'g\'ri!';
    }
}

function logout() {
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('adminContent').style.display = 'none';
    document.getElementById('adminPassword').value = '';
}

function startAutoRefresh() {
    setInterval(() => loadOrders(), 10000); // 10 sekundda yangilanadi
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

async function loadPendingOrders() {
    try {
        const response = await fetch(`${API_URL}/api/admin/pending-orders`);
        return await response.json();
    } catch (err) {
        console.error('Load pending error:', err);
        return [];
    }
}

async function confirmOrder(orderId) {
    try {
        const response = await fetch(`${API_URL}/api/admin/confirm-order/${orderId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: ADMIN_PASSWORD })
        });
        const result = await response.json();
        if (result.success) {
            showToast('Buyurtma tasdiqlandi va printerga yuborildi!');
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
    
    if (currentTab === 'pending') {
        filteredOrders = orders.filter(o => o.status === 'pending');
    } else if (currentTab === 'confirmed') {
        filteredOrders = orders.filter(o => o.status === 'confirmed' || o.status === 'printed');
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
                    <i class="fas fa-print"></i> ${order.status === 'printed' ? 'Chek chiqarildi' : 'Tasdiqlandi'}
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

// Tab switcher
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.dataset.tab;
        renderOrders();
    });
});

document.getElementById('refreshBtn')?.addEventListener('click', loadOrders);