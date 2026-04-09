// ============ KONFIGURATSIYA ============
const STORAGE_KEY = 'mingchinor_menu';
const LANGUAGE_KEY = 'mingchinor_language';
// API_URL endi config.js dan olinadi
let SERVICE_FEE_PER_PERSON = 5000;
let currentLanguage = localStorage.getItem(LANGUAGE_KEY) || 'uz';

// ============ GLOBAL O‘ZGARUVCHILAR ============
let menuData = [];
let cart = {};
let currentCategory = 'all';
let currentTableNumber = null;
let numberOfPeople = 1;
let socket = null;

// ============ DOM ELEMENTLARI ============
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
const callWaiterBtn = document.getElementById('callWaiterBtn');
const imageModal = document.getElementById('imageModal');
const fullScreenImage = document.getElementById('fullScreenImage');
const imageCaption = document.getElementById('imageCaption');
const closeImageModal = document.getElementById('closeImageModal');
const languageSelectorOverlay = document.getElementById('languageSelectorOverlay');
const languageBtns = document.querySelectorAll('.language-btn');

// ============ TIL TANLASH ============
function initLanguageSelector() {
    // Agar til allaqachon tanlangan bo'lsa, selector ko'rsatmasdan davom et
    if (localStorage.getItem(LANGUAGE_KEY)) {
        languageSelectorOverlay.style.display = 'none';
        initApp();
        return;
    }

    languageSelectorOverlay.style.display = 'flex';

    languageBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.dataset.lang;
            selectLanguage(lang);
        });
    });
}

function selectLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem(LANGUAGE_KEY, lang);

    // Barcha tugmalardan selected klassini olib tashla
    languageBtns.forEach(btn => btn.classList.remove('selected'));

    // Tanlangan til tugmasiga selected klassini qo'sh
    document.querySelector(`[data-lang="${lang}"]`).classList.add('selected');

    // Selector overlayni yashir va appni ishga tushir
    setTimeout(() => {
        languageSelectorOverlay.style.display = 'none';
        initApp();
    }, 500);
}

function initApp() {
    // Stol tanlashni tekshirish
    if (document.getElementById('tableSelectorOverlay')) {
        checkTableNumber();
    } else {
        // Agar stol tanlash overlay bo'lmasa, to'g'ridan-to'g'ri yuklash
        loadMenuFromAPI();
    }
}

// ============ 1. STOL TANLASH ============
let availableTables = [];

async function loadTables() {
    try {
        const res = await fetch(`${API_URL}/api/admin/tables`);
        availableTables = await res.json();
    } catch (err) {
        console.error('Tables load error:', err);
    }
}

function checkTableNumber() {
    const urlParams = new URLSearchParams(window.location.search);
    const tableFromUrl = urlParams.get('table');
    const peopleFromUrl = urlParams.get('people');
    
    if (tableFromUrl) {
        currentTableNumber = parseInt(tableFromUrl);
        numberOfPeople = parseInt(peopleFromUrl) || 1;
        document.getElementById('tableSelectorOverlay').style.display = 'none';
        loadMenuFromAPI();
        return;
    }
    
    const savedTable = localStorage.getItem('currentTableNumber');
    const savedPeople = localStorage.getItem('numberOfPeople');
    if (savedTable) {
        currentTableNumber = parseInt(savedTable);
        numberOfPeople = parseInt(savedPeople) || 1;
        document.getElementById('tableSelectorOverlay').style.display = 'none';
        loadMenuFromAPI();
        return;
    }
    
    document.getElementById('tableSelectorOverlay').style.display = 'flex';
}

// Stol tanlash tugmasi
document.getElementById('confirmTableBtn')?.addEventListener('click', () => {
    const tableNum = document.getElementById('tableNumberInput').value;
    const peopleNum = document.getElementById('peopleCountInput').value;
    
    if (tableNum && tableNum > 0 && peopleNum && peopleNum > 0) {
        currentTableNumber = parseInt(tableNum);
        numberOfPeople = parseInt(peopleNum);
        localStorage.setItem('currentTableNumber', currentTableNumber);
        localStorage.setItem('numberOfPeople', numberOfPeople);
        document.getElementById('tableSelectorOverlay').style.display = 'none';
        loadMenuFromAPI();
    } else {
        alert('Iltimos, stol raqami va kishilar sonini kiriting!');
    }
});

// ============ 2. MENYU YUKLASH (API) ============
async function loadMenuFromAPI() {
    try {
        const [menuRes, configRes] = await Promise.all([
            fetch(`${API_URL}/api/menu`),
            fetch(`${API_URL}/api/config`).catch(() => null),
            loadTables().catch(() => null)
        ]);
        
        menuData = await menuRes.json();
        
        if (configRes && configRes.ok) {
            const configData = await configRes.json();
            if (configData && configData.service_fee !== undefined) {
                SERVICE_FEE_PER_PERSON = configData.service_fee;
            }
        }

        saveMenuToLocal();
        renderCategories();
        renderMenu();
        loadCartFromLocal();
    } catch (err) {
        console.error('API error:', err);
        // Offline mode: localStorage dan o'qish
        loadMenuFromLocal();
    }
}

function loadMenuFromLocal() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        menuData = JSON.parse(stored);
    } else {
        menuData = getDefaultMenu();
        saveMenuToLocal();
    }
    renderCategories();
    renderMenu();
    loadCartFromLocal();
}

function getDefaultMenu() {
    return [
        { id: 1, emoji: "🥣", name: "Mastava", desc: "Qo'zichoq go'shti, sabzavotlar", cost: 18000, price: 28000, category: "🍜 Birinchi taomlar", available: true, image: "" },
        { id: 2, emoji: "🍲", name: "Shurva", desc: "Qo'y go'shti, karam, sabzi", cost: 15000, price: 25000, category: "🍜 Birinchi taomlar", available: true, image: "" },
        { id: 3, emoji: "🥘", name: "Lagman", desc: "El noodles, go'sht, sabzavot", cost: 20000, price: 32000, category: "🍜 Birinchi taomlar", available: true, image: "" },
        { id: 4, emoji: "🫕", name: "Moshxo'rda", desc: "Mosh, guruch, yog'", cost: 12000, price: 22000, category: "🍜 Birinchi taomlar", available: true, image: "" },
        { id: 5, emoji: "🍚", name: "Osh (Palov)", desc: "Qo'zichoq go'shti, sabzi, guruch", cost: 22000, price: 38000, category: "🍽️ Ikkinchi taomlar", available: true, image: "" },
        { id: 6, emoji: "🥩", name: "Kabob", desc: "Qo'y go'shti, zira, piyoz", cost: 28000, price: 45000, category: "🍽️ Ikkinchi taomlar", available: true, image: "" },
        { id: 7, emoji: "🫔", name: "Dimlama", desc: "Go'sht, kartoshka, sabzavotlar", cost: 20000, price: 35000, category: "🍽️ Ikkinchi taomlar", available: true, image: "" },
        { id: 8, emoji: "🍗", name: "Tovuq qovurma", desc: "Basmati guruch bilan", cost: 25000, price: 40000, category: "🍽️ Ikkinchi taomlar", available: true, image: "" },
        { id: 9, emoji: "🥗", name: "Achichuk salat", desc: "Pomidor, bodring, piyoz, ko'k", cost: 8000, price: 15000, category: "🍽️ Ikkinchi taomlar", available: true, image: "" },
        { id: 10, emoji: "🫓", name: "Patir non", desc: "Tandirda pishirilgan", cost: 4000, price: 8000, category: "🫓 Non va sneklar", available: true, image: "" },
        { id: 11, emoji: "🥙", name: "Somsa", desc: "Go'shtli, yangi pishirilgan", cost: 6000, price: 12000, category: "🫓 Non va sneklar", available: true, image: "" },
        { id: 12, emoji: "🥟", name: "Manti", desc: "Qo'y go'shti bilan (6 dona)", cost: 18000, price: 30000, category: "🫓 Non va sneklar", available: true, image: "" },
        { id: 13, emoji: "🍵", name: "Ko'k choy", desc: "Chinni piyolada", cost: 3000, price: 8000, category: "🧃 Ichimliklar", available: true, image: "" },
        { id: 14, emoji: "☕", name: "Qora choy", desc: "Limon bilan", cost: 3000, price: 8000, category: "🧃 Ichimliklar", available: true, image: "" },
        { id: 15, emoji: "🧃", name: "Sharbat", desc: "Mavsumiy mevalar", cost: 8000, price: 18000, category: "🧃 Ichimliklar", available: true, image: "" },
        { id: 16, emoji: "🥛", name: "Ayron", desc: "Yangi, sovuq", cost: 5000, price: 12000, category: "🧃 Ichimliklar", available: true, image: "" },
        { id: 17, emoji: "💧", name: "Mineral suv", desc: "Gaz'li / gaz'siz (0.5L)", cost: 3000, price: 7000, category: "🧃 Ichimliklar", available: true, image: "" },
        { id: 18, emoji: "🍯", name: "Halva", desc: "An'anaviy, yong'oq bilan", cost: 10000, price: 20000, category: "🍰 Shirinliklar", available: true, image: "" },
        { id: 19, emoji: "🍮", name: "Murabbo", desc: "O'rik murabbo, qaymoq", cost: 7000, price: 15000, category: "🍰 Shirinliklar", available: true, image: "" },
        { id: 20, emoji: "🍩", name: "Pishiriqlar", desc: "Kunlik assortment", cost: 7000, price: 14000, category: "🍰 Shirinliklar", available: true, image: "" }
    ];
}

function saveMenuToLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(menuData));
}

// ============ 3. KATEGORIYALAR ============
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

// ============ 4. MENYUNI RENDER QILISH ============
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
                <div class="item-emoji" onclick="openImageModal('${item.image || ''}', '${item.name}', '${item.emoji}')">
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
    saveCartToLocal();
    renderControl(item);
    updateCartUI();
    showToast(`${item.name} savatga qo'shildi`);
}

function updateQuantity(id, delta) {
    if (!cart[id]) return;
    cart[id].qty += delta;
    if (cart[id].qty <= 0) delete cart[id];
    saveCartToLocal();
    const item = menuData.find(i => i.id === id);
    renderControl(item);
    updateCartUI();
}

function saveCartToLocal() {
    localStorage.setItem('mingchinor_cart', JSON.stringify(cart));
}

function loadCartFromLocal() {
    const stored = localStorage.getItem('mingchinor_cart');
    if (stored) {
        cart = JSON.parse(stored);
        updateCartUI();
        menuData.forEach(item => renderControl(item));
    }
}

// ============ 5. SAVAT UI (Xizmat narxi bilan) ============
function updateCartUI() {
    const items = Object.values(cart);
    const subtotal = items.reduce((s, e) => s + e.qty * e.item.price, 0);
    const serviceFee = numberOfPeople * SERVICE_FEE_PER_PERSON;
    const total = subtotal + serviceFee;
    const totalQty = items.reduce((s, e) => s + e.qty, 0);
    
    cartBadge.textContent = totalQty;
    
    if (items.length === 0) {
        cartItemsList.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Savat hozircha bo'sh</p>
            </div>
        `;
    } else {
        cartItemsList.innerHTML = `
            ${items.map(e => `
                <div class="cart-item" style="display: flex; flex-direction: column; align-items: stretch; padding: 12px; gap: 8px;">
                    <div style="display: flex; justify-content: space-between;">
                        <strong>${e.item.emoji} ${e.item.name}</strong>
                        <span>${formatPrice(e.qty * e.item.price)}</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                         <small style="color: var(--text-secondary);">${formatPrice(e.item.price)} / dona</small>
                         <div class="counter-wrap" style="transform: scale(0.9); margin-right: -8px; box-shadow: none; border: 1px solid var(--border-color);">
                             <button class="counter-btn minus" style="box-shadow: none; background: #ffeaa7; color: #d63031;" onclick="updateQuantity(${e.item.id}, -1)">−</button>
                             <span class="count-num">${e.qty}</span>
                             <button class="counter-btn plus" style="box-shadow: none; background: #e3f2fd; color: #1976d2;" onclick="updateQuantity(${e.item.id}, 1)">+</button>
                         </div>
                    </div>
                </div>
            `).join('')}
            <div class="cart-item" style="border-top: 2px solid var(--border-color); margin-top: 8px; padding-top: 12px;">
                <div><i class="fas fa-users"></i> Xizmat narxi (${numberOfPeople} kishi × ${formatPrice(SERVICE_FEE_PER_PERSON)})</div>
                <div>${formatPrice(serviceFee)}</div>
            </div>
            <div class="cart-item" style="font-weight: bold; font-size: 1.1rem;">
                <div>Jami:</div>
                <div style="color: var(--primary-color);">${formatPrice(total)}</div>
            </div>
        `;
    }
    
    if (cartTotalAmount) cartTotalAmount.textContent = formatPrice(total);
    window.currentTotal = total;
}

// ============ 6. BUYURTMA BERISH ============
async function placeOrder() {
    if (!currentTableNumber) {
        alert('Iltimos, avval stol raqamini tanlang!');
        return;
    }
    
    // --- GEOLOCATION CHEKLOVI (500 METR) ---
    // Kafening asil koordinatalari ("Mingchinor Kompleks")
    const CAFE_LAT = 40.7277686; 
    const CAFE_LNG = 70.9449729;
    const MAX_DISTANCE_METERS = 500;

    orderBtn.disabled = true;
    orderBtn.innerHTML = 'Joylashuv tekshirilmoqda...';

    try {
        if (!navigator.geolocation) throw new Error("Brauzeringiz GPS ni qo'llab quvvatlamaydi");
        
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true, timeout: 10000, maximumAge: 0
            });
        });

        // Masofani hisoblash (Haversine formula)
        const lat1 = position.coords.latitude;
        const lon1 = position.coords.longitude;
        const R = 6371e3; // Yer radiusi (metr)
        const φ1 = lat1 * Math.PI/180;
        const φ2 = CAFE_LAT * Math.PI/180;
        const Δφ = (CAFE_LAT-lat1) * Math.PI/180;
        const Δλ = (CAFE_LNG-lon1) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c; // Metrda

        if (distance > MAX_DISTANCE_METERS) {
            alert(`Siz kafedan juda uzoqdasiz! (Masofa: ${Math.round(distance)} metr).\nBuyurtma berish uchun kafega kamida 500 metr yaqinlashing.`);
            orderBtn.disabled = false;
            orderBtn.innerHTML = 'Buyurtma berish';
            return;
        }
    } catch (err) {
        console.warn("Geolocation error:", err);
        // GPS bloklangan yoli HTTPS emas bo'lsa
        const allowWithoutGPS = confirm("Joylashuvingizni aniqlashga ruxsat bermadingiz yoki qurilmangizda xatolik bor.\nBuyurtma berish uchun GPS yoqilgan bo'lishi shart.\n(Hozircha test rejimida ekanmiz baribir davom etaylikmi?)");
        if (!allowWithoutGPS) {
            orderBtn.disabled = false;
            orderBtn.innerHTML = 'Buyurtma berish';
            return;
        }
    }
    
    orderBtn.innerHTML = 'Buyurtma rasmiylashtirilmoqda...';
    // ------------------------------------

    const items = Object.values(cart).map(c => ({
        id: c.item.id,
        emoji: c.item.emoji,
        name: c.item.name,
        cost: c.item.cost || 0,
        price: c.item.price,
        qty: c.qty,
        category: c.item.category
    }));
    
    if (items.length === 0) {
        alert('Iltimos, kamida bitta taom tanlang!');
        orderBtn.disabled = false;
        orderBtn.innerHTML = 'Buyurtma berish';
        return;
    }
    
    const subtotal = items.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const serviceFee = numberOfPeople * SERVICE_FEE_PER_PERSON;
    const totalAmount = subtotal + serviceFee;
    
    const orderData = {
        tableNumber: currentTableNumber,
        numberOfPeople: numberOfPeople,
        items: items,
        subtotal: subtotal,
        serviceFee: serviceFee,
        totalAmount: totalAmount
    };
    
    try {
        const response = await fetch(`${API_URL}/api/order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            successModal.classList.add('open');
            cart = {};
            saveCartToLocal();
            updateCartUI();
            menuData.forEach(item => renderControl(item));
            cartOverlay.classList.remove('open');
        } else {
            alert('Buyurtma berishda xatolik yuz berdi');
        }
    } catch (err) {
        console.error('Order error:', err);
        alert('Tarmoq xatosi. Iltimos, qayta urinib ko‘ring');
    }
    
    orderBtn.disabled = false;
    orderBtn.innerHTML = 'Buyurtma berish';
}

// ============ 7. YORDAMCHI FUNKSIYALAR ============
function formatPrice(price) {
    return price.toLocaleString('uz-UZ') + " so'm";
}

function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
}

function closeModal() {
    if (successModal) successModal.classList.remove('open');
    if (qrModal) qrModal.classList.remove('open');
}

function openImageModal(img, name, emoji) {
    if (!img) return;
    fullScreenImage.src = img;
    imageCaption.textContent = `${emoji} ${name}`;
    imageModal.classList.add('open');
}

function closeImageModalHandler() {
    imageModal.classList.remove('open');
}

// ============ 8. OFISANT CHAQIRISH (WebSocket) ============
function connectWebSocket() {
    socket = io(API_URL);
    
    socket.on('connect', () => {
        console.log('WebSocket ulandi');
    });
    
    socket.on('waiter-call', (data) => {
        // Ofisant panelida signal ko'rsatish (agar ofisant paneli ochiq bo'lsa)
        if (document.getElementById('adminContent')?.style.display === 'block') {
            showWaiterCallNotification(data);
        }
    });
    
    socket.on('disconnect', () => {
        console.log('WebSocket uzildi, qayta ulanish...');
        setTimeout(connectWebSocket, 3000);
    });
}

function callWaiter() {
    if (!currentTableNumber) {
        alert('Iltimos, avval stol raqamini tanlang!');
        return;
    }
    
    const callData = {
        tableNumber: currentTableNumber,
        numberOfPeople: numberOfPeople,
        timestamp: new Date().toISOString()
    };
    
    if (socket && socket.connected) {
        socket.emit('call-waiter', callData);
    }
    
    // REST orqali ham yuborish (ishonchlilik uchun)
    fetch(API_URL + '/api/waiter-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callData)
    }).catch(e => console.warn('REST waiter-call error:', e));
    
    showToast('📢 Stol ' + currentTableNumber + ' ofisant chaqirildi!');
    
    const btn = document.getElementById('callWaiterBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-bell"></i>';
        }, 30000);
    }
}

function showWaiterCallNotification(data) {
    // Audio signal
    const audio = new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3');
    audio.play().catch(e => console.log('Audio play error:', e));
    
    // Visual notification
    const notification = document.createElement('div');
    notification.className = 'waiter-call-notification';
    notification.innerHTML = `
        <div class="waiter-call-content">
            <i class="fas fa-bell"></i>
            <strong>Stol ${data.tableNumber}</strong> ofisant chaqirdi!
            <span>${new Date(data.timestamp).toLocaleTimeString()}</span>
        </div>
    `;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #c0522a;
        color: white;
        padding: 12px 20px;
        border-radius: 40px;
        z-index: 3000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        font-size: 14px;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
}

// ============ 9. EVENT LISTENERLAR ============
if (cartIconBtn) cartIconBtn.addEventListener('click', () => cartOverlay.classList.add('open'));
if (closeCartBtn) closeCartBtn.addEventListener('click', () => cartOverlay.classList.remove('open'));
if (orderBtn) orderBtn.addEventListener('click', placeOrder);
if (closeSuccessBtn) closeSuccessBtn.addEventListener('click', closeModal);
if (closeImageModal) closeImageModal.addEventListener('click', closeImageModalHandler);
if (imageModal) imageModal.addEventListener('click', (e) => {
    if (e.target === imageModal) closeImageModalHandler();
});
// Bell tugmasi endi waiter panelini ochadi
if (callWaiterBtn) callWaiterBtn.addEventListener('click', openWaiterPanel);

function openWaiterPanel() {
    const panel = document.getElementById('waiterPanel');
    const overlay = document.getElementById('waiterPanelOverlay');
    const tableEl = document.getElementById('wpTableNum');
    const peopleEl = document.getElementById('wpPeople');
    if (tableEl) tableEl.textContent = currentTableNumber || '—';
    if (peopleEl) peopleEl.textContent = numberOfPeople || '—';
    if (panel) panel.classList.add('open');
    if (overlay) overlay.classList.add('open');
}

function closeWaiterPanel() {
    const panel = document.getElementById('waiterPanel');
    const overlay = document.getElementById('waiterPanelOverlay');
    if (panel) panel.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
}

// ============ 10. SAHIFA YUKLANGANDA ============
// Til tanlashni ishga tushirish
initLanguageSelector();

// WebSocket ulanish
connectWebSocket();

// Har 10 sekundda menyuni yangilash (admin o'zgartirsa)
setInterval(() => {
    loadMenuFromAPI();
}, 10000);