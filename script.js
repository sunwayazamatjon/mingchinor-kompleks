// LocalStorage kalitlari
const STORAGE_KEY = 'mingchinor_menu';

// Standart menyu
const defaultMenu = [
    { id: 1, emoji: "🥣", name: "Mastava", desc: "Qo'zichoq go'shti, sabzavotlar", price: 28000, category: "🍜 Birinchi taomlar", available: true },
    { id: 2, emoji: "🍲", name: "Shurva", desc: "Qo'y go'shti, karam, sabzi", price: 25000, category: "🍜 Birinchi taomlar", available: true },
    { id: 3, emoji: "🥘", name: "Lagman", desc: "El noodles, go'sht, sabzavot", price: 32000, category: "🍜 Birinchi taomlar", available: true },
    { id: 4, emoji: "🫕", name: "Moshxo'rda", desc: "Mosh, guruch, yog'", price: 22000, category: "🍜 Birinchi taomlar", available: true },
    { id: 5, emoji: "🍚", name: "Osh (Palov)", desc: "Qo'zichoq go'shti, sabzi, guruch", price: 38000, category: "🍽️ Ikkinchi taomlar", available: true },
    { id: 6, emoji: "🥩", name: "Kabob", desc: "Qo'y go'shti, zira, piyoz", price: 45000, category: "🍽️ Ikkinchi taomlar", available: true },
    { id: 7, emoji: "🫔", name: "Dimlama", desc: "Go'sht, kartoshka, sabzavotlar", price: 35000, category: "🍽️ Ikkinchi taomlar", available: true },
    { id: 8, emoji: "🍗", name: "Tovuq qovurma", desc: "Basmati guruch bilan", price: 40000, category: "🍽️ Ikkinchi taomlar", available: true },
    { id: 9, emoji: "🥗", name: "Achichuk salat", desc: "Pomidor, bodring, piyoz, ko'k", price: 15000, category: "🍽️ Ikkinchi taomlar", available: true },
    { id: 10, emoji: "🫓", name: "Patir non", desc: "Tandirda pishirilgan", price: 8000, category: "🫓 Non va sneklar", available: true },
    { id: 11, emoji: "🥙", name: "Somsa", desc: "Go'shtli, yangi pishirilgan", price: 12000, category: "🫓 Non va sneklar", available: true },
    { id: 12, emoji: "🥟", name: "Manti", desc: "Qo'y go'shti bilan (6 dona)", price: 30000, category: "🫓 Non va sneklar", available: true },
    { id: 13, emoji: "🍵", name: "Ko'k choy", desc: "Chinni piyolada", price: 8000, category: "🧃 Ichimliklar", available: true },
    { id: 14, emoji: "☕", name: "Qora choy", desc: "Limon bilan", price: 8000, category: "🧃 Ichimliklar", available: true },
    { id: 15, emoji: "🧃", name: "Sharbat", desc: "Mavsumiy mevalar", price: 18000, category: "🧃 Ichimliklar", available: true },
    { id: 16, emoji: "🥛", name: "Ayron", desc: "Yangi, sovuq", price: 12000, category: "🧃 Ichimliklar", available: true },
    { id: 17, emoji: "💧", name: "Mineral suv", desc: "Gaz'li / gaz'siz (0.5L)", price: 7000, category: "🧃 Ichimliklar", available: true },
    { id: 18, emoji: "🍯", name: "Halva", desc: "An'anaviy, yong'oq bilan", price: 20000, category: "🍰 Shirinliklar", available: true },
    { id: 19, emoji: "🍮", name: "Murabbo", desc: "O'rik murabbo, qaymoq", price: 15000, category: "🍰 Shirinliklar", available: true },
    { id: 20, emoji: "🍩", name: "Pishiriqlar", desc: "Kunlik assortment", price: 14000, category: "🍰 Shirinliklar", available: true }
];

// Global state
let menuData = [];
let cart = {};
let currentCategory = 'all';

// DOM elementlari
const menuContainer = document.getElementById('menuContainer');
const categoriesContainer = document.getElementById('categoriesContainer');
const cartOverlay = document.getElementById('cartOverlay');
const cartItemsList = document.getElementById('cartItemsList');
const cartTotalAmount = document.getElementById('cartTotalAmount');
const cartBadge = document.getElementById('cartBadge');
const cartIconBtn = document.getElementById('cartIconBtn');
const closeCartBtn = document.getElementById('closeCartBtn');
const orderBtn = document.getElementById('orderBtn');
const qrModal = document.getElementById('qrModal');
const successModal = document.getElementById('successModal');
const closeSuccessBtn = document.getElementById('closeSuccessBtn');
const toast = document.getElementById('toast');

// Ma'lumotlarni yuklash
function loadMenu() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        menuData = JSON.parse(stored);
    } else {
        menuData = [...defaultMenu];
        saveMenu();
    }
    renderCategories();
    renderMenu();
    loadCart();
}

function saveMenu() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(menuData));
}

// Kategoriyalarni render qilish
function renderCategories() {
    const categories = ['all', ...new Set(menuData.map(item => item.category))];
    categoriesContainer.innerHTML = categories.map(cat => `
        <button class="category-chip ${currentCategory === cat ? 'active' : ''}" data-category="${cat}">
            ${cat === 'all' ? '<i class="fas fa-border-all"></i> Barchasi' : cat}
        </button>
    `).join('');
    
    document.querySelectorAll('.category-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            currentCategory = btn.dataset.category;
            renderCategories();
            renderMenu();
        });
    });
}

// Menyuni render qilish
// script.js dagi renderMenu funksiyasini yangilang
function renderMenu() {
    const filtered = currentCategory === 'all' 
        ? menuData 
        : menuData.filter(item => item.category === currentCategory);
    
    const grouped = filtered.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {});
    
    if (Object.keys(grouped).length === 0) {
        menuContainer.innerHTML = '<div class="empty-cart" style="padding: 60px;"><i class="fas fa-utensils"></i><p>Hozircha taomlar mavjud emas</p></div>';
        return;
    }
    
    let html = '';
    for (const [category, items] of Object.entries(grouped)) {
        html += `<div class="section-title">${category}</div>`;
        html += items.map(item => `
            <div class="item-card ${!item.available ? 'unavailable' : ''}" data-id="${item.id}">
                <div class="item-emoji">
                    ${item.image ? `<img src="${item.image}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 12px;" onerror="this.src='https://via.placeholder.com/48?text=${encodeURIComponent(item.emoji)}'">` : item.emoji}
                </div>
                <div class="item-info">
                    <div class="item-name">${item.name}${!item.available ? ' ⏸️' : ''}</div>
                    <div class="item-desc">${item.desc || ''}</div>
                    <div class="item-price">${formatPrice(item.price)}</div>
                </div>
                <div class="item-control" id="ctrl-${item.id}"></div>
            </div>
        `).join('');
    }
    menuContainer.innerHTML = html;
    
    menuData.forEach(item => {
        renderControl(item);
    });
}
function renderControl(item) {
    const ctrl = document.getElementById(`ctrl-${item.id}`);
    if (!ctrl) return;
    
    if (!item.available) {
        ctrl.innerHTML = `<button class="btn-add" disabled style="background: #ccc; cursor: not-allowed;">⏸️</button>`;
        return;
    }
    
    const qty = cart[item.id]?.qty || 0;
    if (qty === 0) {
        ctrl.innerHTML = `<button class="btn-add" onclick="addToCart(${item.id})">+</button>`;
    } else {
        ctrl.innerHTML = `
            <div class="counter-wrap">
                <button class="counter-btn minus" onclick="updateQuantity(${item.id}, -1)">−</button>
                <span class="count-num">${qty}</span>
                <button class="counter-btn plus" onclick="updateQuantity(${item.id}, 1)">+</button>
            </div>
        `;
    }
}

function addToCart(id) {
    const item = menuData.find(i => i.id === id);
    if (!item || !item.available) return;
    
    cart[id] = cart[id] ? { ...cart[id], qty: cart[id].qty + 1 } : { item, qty: 1 };
    saveCart();
    renderControl(item);
    updateCartUI();
    showToast(`${item.name} savatga qo'shildi`);
}

function updateQuantity(id, delta) {
    if (!cart[id]) return;
    cart[id].qty += delta;
    if (cart[id].qty <= 0) delete cart[id];
    saveCart();
    const item = menuData.find(i => i.id === id);
    renderControl(item);
    updateCartUI();
}

function saveCart() {
    localStorage.setItem('mingchinor_cart', JSON.stringify(cart));
}

function loadCart() {
    const stored = localStorage.getItem('mingchinor_cart');
    if (stored) {
        cart = JSON.parse(stored);
        updateCartUI();
        menuData.forEach(item => renderControl(item));
    }
}

function updateCartUI() {
    const items = Object.values(cart);
    const totalQty = items.reduce((s, e) => s + e.qty, 0);
    const totalSum = items.reduce((s, e) => s + e.qty * e.item.price, 0);
    
    cartBadge.textContent = totalQty;
    cartTotalAmount.textContent = formatPrice(totalSum);
    
    if (items.length === 0) {
        cartItemsList.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Savat hozircha bo'sh</p>
            </div>
        `;
    } else {
        cartItemsList.innerHTML = items.map(e => `
            <div class="cart-item">
                <div><strong>${e.item.emoji} ${e.item.name}</strong> × ${e.qty}</div>
                <div>${formatPrice(e.qty * e.item.price)}</div>
            </div>
        `).join('');
    }
}

function formatPrice(price) {
    return price.toLocaleString('uz-UZ') + " so'm";
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
}

function placeOrder() {
    successModal.classList.add('open');
    cart = {};
    saveCart();
    updateCartUI();
    menuData.forEach(item => renderControl(item));
    cartOverlay.classList.remove('open');
}

function closeModal() {
    successModal.classList.remove('open');
    qrModal.classList.remove('open');
}

// QR Scanner
let html5QrCode;
function startQRScanner() {
    qrModal.classList.add('open');
    html5QrCode = new Html5Qrcode("qr-reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure);
}

function onScanSuccess(decodedText) {
    html5QrCode.stop();
    const resultDiv = document.getElementById('qr-result');
    resultDiv.innerHTML = `<div class="success-icon" style="font-size: 24px;">✅ Admin buyrug'i: ${decodedText}</div>`;
    setTimeout(() => {
        qrModal.classList.remove('open');
        resultDiv.innerHTML = '';
    }, 2000);
}

function onScanFailure(error) {
    // console.warn(error);
}

// Event listeners
cartIconBtn?.addEventListener('click', () => cartOverlay.classList.add('open'));
closeCartBtn?.addEventListener('click', () => cartOverlay.classList.remove('open'));
orderBtn?.addEventListener('click', placeOrder);
closeSuccessBtn?.addEventListener('click', closeModal);

// QR scanner uchun (agar skaner tugmasi bo'lsa)
// Agar QR skaner tugmasi qo'shilsa, unga startQRScanner ni bog'lang

// Initial load
loadMenu();

// Har 5 sekundda menyuni yangilash (admin o'zgartirsa)
setInterval(() => {
    loadMenu();
}, 5000);