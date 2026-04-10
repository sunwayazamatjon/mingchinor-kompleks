// ============ KONFIGURATSIYA ============
const STORAGE_KEY = 'mingchinor_menu';
const LANGUAGE_KEY = 'mingchinor_language';
// API_URL endi config.js dan olinadi
let SERVICE_FEE_PER_PERSON = 5000;
let currentLanguage = sessionStorage.getItem(LANGUAGE_KEY) || 'uz';

const TEXTS = {
    uz: {
        welcome: "Mingchinor ga xush kelibsiz!",
        selectLanguage: "Iltimos, tilni tanlang",
        selectTable: "Iltimos, stolingiz raqamini va kishilar sonini kiriting",
        peopleCount: "Necha kishi?",
        confirm: "Tasdiqlash",
        callWaiter: "Ofisant chaqirish",
        allCategories: "Barchasi",
        orderButton: "Buyurtma berish",
        menuLoading: "Menyu yuklanmoqda...",
        orderSuccessTitle: "Buyurtma qabul qilindi!",
        orderSuccessText: "Tez orada ofitsiant siz bilan bog'lanadi. Rahmat!",
        cartEmpty: "Savat hozircha bo'sh",
        missingTable: "Iltimos, avval stol raqamini tanlang!",
        waiterCalled: "📢 Stol {table} ofisant chaqirildi!",
        missingTableAndLanguage: "Iltimos, avval stol va tilni tanlang!",
        siteTitle: "Mingchinor",
        siteSubtitle: "Milliy taomlar",
        cartTitle: "Savatcha",
        totalLabel: "Jami:",
        closeButton: "Yopish",
        qrTitle: "QR kodni skanerlang",
        waiterPanelTitle: "Ofisant chaqirish",
        waiterPanelSubtitle: "Ofisant sizning stolingizga keladi",
        waiterTableLabel: "Stol raqami",
        waiterPeopleLabel: "Kishilar soni",
        tablePlaceholder: "Stol raqami",
        peoplePlaceholder: "Kishilar soni",
        tableValidation: "Iltimos, stol raqami va kishilar sonini kiriting!",
        orderWithoutGPSConfirm: "Joylashuvingizni aniqlashga ruxsat bermadingiz yoki qurilmangizda xatolik bor.\nBuyurtma berish uchun GPS yoqilgan bo'lishi shart.\n(Hozircha test rejimida ekanmiz baribir davom etaylikmi?)",
        farFromCafe: "Siz kafedan juda uzoqdasiz! (Masofa: {distance} metr).\nBuyurtma berish uchun kafega kamida 500 metr yaqinlashing.",
        orderProcessing: "Buyurtma rasmiylashtirilmoqda...",
        checkingLocation: "Joylashuv tekshirilmoqda...",
        orderRequiresItems: "Iltimos, kamida bitta taom tanlang!",
        orderError: "Buyurtma berishda xatolik yuz berdi",
        networkError: "Tarmoq xatosi. Iltimos, qayta urinib ko‘ring",
        cartServiceFee: "Xizmat narxi",
        serviceFeeDetails: "{count} kishi × {price}",
        perUnit: "/ dona"
    },
    ru: {
        welcome: "Добро пожаловать в Mingchinor!",
        selectLanguage: "Пожалуйста, выберите язык",
        selectTable: "Пожалуйста, введите номер стола и количество гостей",
        peopleCount: "Сколько человек?",
        confirm: "Подтвердить",
        callWaiter: "Вызвать официанта",
        allCategories: "Все",
        orderButton: "Оформить заказ",
        menuLoading: "Загрузка меню...",
        orderSuccessTitle: "Заказ принят!",
        orderSuccessText: "Официант скоро с вами свяжется. Спасибо!",
        cartEmpty: "Корзина пока пуста",
        missingTable: "Пожалуйста, сначала выберите стол!",
        waiterCalled: "📢 Стол {table} вызвал официанта!",
        missingTableAndLanguage: "Пожалуйста, сначала выберите стол и язык!",
        siteTitle: "Mingchinor",
        siteSubtitle: "Национальная кухня",
        cartTitle: "Корзина",
        totalLabel: "Итого:",
        closeButton: "Закрыть",
        qrTitle: "Сканируйте QR-код",
        waiterPanelTitle: "Вызов официанта",
        waiterPanelSubtitle: "Официант скоро подойдет к вашему столу",
        waiterTableLabel: "Номер стола",
        waiterPeopleLabel: "Количество гостей",
        tablePlaceholder: "Номер стола",
        peoplePlaceholder: "Количество гостей",
        tableValidation: "Пожалуйста, введите номер стола и количество гостей!",
        orderWithoutGPSConfirm: "Вы не разрешили определить местоположение или в вашем устройстве ошибка.\nДля оформления заказа GPS должен быть включен.\n(Хотите продолжить в тестовом режиме?)",
        farFromCafe: "Вы слишком далеко от кафе! (Расстояние: {distance} м).\nПожалуйста, подойдите ближе, чтобы оформить заказ.",
        orderProcessing: "Оформление заказа...",
        checkingLocation: "Проверка местоположения...",
        orderRequiresItems: "Пожалуйста, выберите хотя бы одно блюдо!",
        orderError: "Ошибка при оформлении заказа",
        networkError: "Сетевая ошибка. Пожалуйста, попробуйте снова",
        cartServiceFee: "Стоимость сервиса",
        serviceFeeDetails: "{count} гостей × {price}",
        perUnit: "/ шт"
    },
    en: {
        welcome: "Welcome to Mingchinor!",
        selectLanguage: "Please select a language",
        selectTable: "Please enter your table number and guest count",
        peopleCount: "How many people?",
        confirm: "Confirm",
        callWaiter: "Call Waiter",
        allCategories: "All",
        orderButton: "Place Order",
        menuLoading: "Loading menu...",
        orderSuccessTitle: "Order Confirmed!",
        orderSuccessText: "A waiter will be with you shortly. Thank you!",
        cartEmpty: "The cart is empty",
        missingTable: "Please select your table first!",
        waiterCalled: "📢 Table {table} requested a waiter!",
        missingTableAndLanguage: "Please select your table and language first!",
        siteTitle: "Mingchinor",
        siteSubtitle: "National cuisine",
        cartTitle: "Cart",
        totalLabel: "Total:",
        closeButton: "Close",
        qrTitle: "Scan QR code",
        waiterPanelTitle: "Call Waiter",
        waiterPanelSubtitle: "A waiter will be with your table shortly",
        waiterTableLabel: "Table number",
        waiterPeopleLabel: "Guest count",
        tablePlaceholder: "Table number",
        peoplePlaceholder: "Guest count",
        tableValidation: "Please enter your table number and guest count!",
        orderWithoutGPSConfirm: "You did not allow location access or there is an error on your device.\nGPS must be enabled to place an order.\n(Do you want to continue in test mode?)",
        farFromCafe: "You are too far from the cafe! (Distance: {distance} m).\nPlease move closer to place your order.",
        orderProcessing: "Processing order...",
        checkingLocation: "Checking location...",
        orderRequiresItems: "Please select at least one dish!",
        orderError: "An error occurred while placing the order",
        networkError: "Network error. Please try again",
        cartServiceFee: "Service fee",
        serviceFeeDetails: "{count} people × {price}",
        perUnit: "/ pcs"
    }
};

function t(key) {
    return TEXTS[currentLanguage]?.[key] || TEXTS.uz[key] || key;
}

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
const imagePlaceholder = document.getElementById('imagePlaceholder');
const closeImageModal = document.getElementById('closeImageModal');
const languageSelectorOverlay = document.getElementById('languageSelectorOverlay');
const languageBtns = document.querySelectorAll('.language-btn');

// ============ TIL TANLASH ============
function initLanguageSelector() {
    const savedLang = sessionStorage.getItem(LANGUAGE_KEY);
    if (savedLang) {
        currentLanguage = savedLang;
        languageBtns.forEach(btn => btn.classList.toggle('selected', btn.dataset.lang === savedLang));
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
        btn.classList.toggle('selected', btn.dataset.lang === currentLanguage);
    });
}

function selectLanguage(lang) {
    currentLanguage = lang;
    sessionStorage.setItem(LANGUAGE_KEY, lang);

    // Barcha tugmalardan selected klassini olib tashla
    languageBtns.forEach(btn => btn.classList.remove('selected'));

    // Tanlangan til tugmasiga selected klassini qo'sh
    document.querySelector(`[data-lang="${lang}"]`).classList.add('selected');

    // Selector overlayni yashir va appni ishga tushir
    setTimeout(() => {
        languageSelectorOverlay.style.display = 'none';
        translateUI();
        initApp();
    }, 500);
}

function translateUI() {
    const languageTitle = document.getElementById('languageTitle');
    const languageDescription = document.getElementById('languageDescription');
    const tableTitle = document.getElementById('tableTitle');
    const tableDescription = document.getElementById('tableDescription');
    const peopleLabel = document.getElementById('peopleLabel');
    const confirmTableText = document.getElementById('confirmTableText');
    const callWaiterText = document.getElementById('callWaiterText');
    const emptyCartText = document.getElementById('emptyCartText');
    const loadingText = document.getElementById('loadingText');
    const successTitle = document.getElementById('successTitle');
    const successText = document.getElementById('successText');
    const headerLogoTitle = document.getElementById('headerLogoTitle');
    const headerLogoSubtitle = document.getElementById('headerLogoSubtitle');
    const categoryAllBtn = document.querySelector('.category-chip[data-category="all"]');
    const cartTitle = document.getElementById('cartTitle');
    const cartTotalLabel = document.getElementById('cartTotalLabel');
    const qrTitle = document.getElementById('qrTitle');
    const closeSuccessBtn = document.getElementById('closeSuccessBtn');
    const waiterPanelTitle = document.getElementById('waiterPanelTitle');
    const waiterPanelSubtitle = document.getElementById('waiterPanelSubtitle');
    const waiterTableLabel = document.getElementById('waiterTableLabel');
    const waiterPeopleLabel = document.getElementById('waiterPeopleLabel');
    const tableNumberInput = document.getElementById('tableNumberInput');
    const peopleCountInput = document.getElementById('peopleCountInput');

    if (languageTitle) languageTitle.textContent = t('welcome');
    if (languageDescription) languageDescription.textContent = t('selectLanguage');
    if (tableTitle) tableTitle.textContent = t('welcome');
    if (tableDescription) tableDescription.textContent = t('selectTable');
    if (peopleLabel) peopleLabel.innerHTML = `<i class="fas fa-users"></i> ${t('peopleCount')}`;
    if (confirmTableText) confirmTableText.textContent = t('confirm');
    if (callWaiterText) callWaiterText.textContent = t('callWaiter');
    if (loadingText) loadingText.innerHTML = `<i class="fas fa-spinner fa-pulse"></i> ${t('menuLoading')}`;
    if (emptyCartText) emptyCartText.textContent = t('cartEmpty');
    if (successTitle) successTitle.textContent = t('orderSuccessTitle');
    if (successText) successText.textContent = t('orderSuccessText');
    if (headerLogoTitle) headerLogoTitle.textContent = t('siteTitle');
    if (headerLogoSubtitle) headerLogoSubtitle.textContent = t('siteSubtitle');
    if (categoryAllBtn) categoryAllBtn.innerHTML = `<i class="fas fa-border-all"></i> ${t('allCategories')}`;
    if (cartTitle) cartTitle.textContent = t('cartTitle');
    if (cartTotalLabel) cartTotalLabel.textContent = t('totalLabel');
    if (qrTitle) qrTitle.textContent = t('qrTitle');
    if (closeSuccessBtn) closeSuccessBtn.textContent = t('closeButton');
    if (waiterPanelTitle) waiterPanelTitle.textContent = t('waiterPanelTitle');
    if (waiterPanelSubtitle) waiterPanelSubtitle.textContent = t('waiterPanelSubtitle');
    if (waiterTableLabel) waiterTableLabel.textContent = t('waiterTableLabel');
    if (waiterPeopleLabel) waiterPeopleLabel.textContent = t('waiterPeopleLabel');
    if (tableNumberInput) tableNumberInput.placeholder = t('tablePlaceholder');
    if (peopleCountInput) peopleCountInput.placeholder = t('peoplePlaceholder');
    if (cartBadge) cartBadge.textContent = cartBadge.textContent || '0';
    if (orderBtn) orderBtn.innerHTML = `<i class="fas fa-check-circle"></i> ${t('orderButton')}`;
}

function initApp() {
    translateUI();
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
    
    const savedTable = sessionStorage.getItem('currentTableNumber');
    const savedPeople = sessionStorage.getItem('numberOfPeople');
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
        sessionStorage.setItem('currentTableNumber', currentTableNumber);
        sessionStorage.setItem('numberOfPeople', numberOfPeople);
        document.getElementById('tableSelectorOverlay').style.display = 'none';
        loadMenuFromAPI();
    } else {
        alert(t('tableValidation'));
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
    const categories = ['all', ...new Set(menuData.map(item => item.category).filter(cat => !cat.toLowerCase().includes('shashlik')) )];
    categoriesContainer.innerHTML = categories.map(cat => `
        <button class="category-chip ${currentCategory === cat ? 'active' : ''}" data-category="${cat}">
            ${cat === 'all' ? `<i class="fas fa-border-all"></i> ${t('allCategories')}` : cat}
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
                <p>${t('cartEmpty')}</p>
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
                         <small style="color: var(--text-secondary);">${formatPrice(e.item.price)} ${t('perUnit')}</small>
                         <div class="counter-wrap" style="transform: scale(0.9); margin-right: -8px; box-shadow: none; border: 1px solid var(--border-color);">
                             <button class="counter-btn minus" style="box-shadow: none; background: #ffeaa7; color: #d63031;" onclick="updateQuantity(${e.item.id}, -1)">−</button>
                             <span class="count-num">${e.qty}</span>
                             <button class="counter-btn plus" style="box-shadow: none; background: #e3f2fd; color: #1976d2;" onclick="updateQuantity(${e.item.id}, 1)">+</button>
                         </div>
                    </div>
                </div>
            `).join('')}
            <div class="cart-item" style="border-top: 2px solid var(--border-color); margin-top: 8px; padding-top: 12px;">
                <div><i class="fas fa-users"></i> ${t('cartServiceFee')} (${t('serviceFeeDetails').replace('{count}', numberOfPeople).replace('{price}', formatPrice(SERVICE_FEE_PER_PERSON))})</div>
                <div>${formatPrice(serviceFee)}</div>
            </div>
            <div class="cart-item" style="font-weight: bold; font-size: 1.1rem;">
                <div>${t('totalLabel')}</div>
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
        alert(t('missingTable'));
        return;
    }
    
    // --- GEOLOCATION CHEKLOVI (500 METR) ---
    // Kafening asil koordinatalari ("Mingchinor Kompleks")
    const CAFE_LAT = 40.7277686; 
    const CAFE_LNG = 70.9449729;
    const MAX_DISTANCE_METERS = 500;

    orderBtn.disabled = true;
    orderBtn.innerHTML = t('checkingLocation');

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
            alert(t('farFromCafe').replace('{distance}', Math.round(distance)));
            orderBtn.disabled = false;
            orderBtn.innerHTML = `<i class="fas fa-check-circle"></i> ${t('orderButton')}`;
            return;
        }
    } catch (err) {
        console.warn("Geolocation error:", err);
        // GPS bloklangan yoli HTTPS emas bo'lsa
        const allowWithoutGPS = confirm(t('orderWithoutGPSConfirm'));
        if (!allowWithoutGPS) {
            orderBtn.disabled = false;
            orderBtn.innerHTML = `<i class="fas fa-check-circle"></i> ${t('orderButton')}`;
            return;
        }
    }
    
    orderBtn.innerHTML = t('orderProcessing');
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
        alert(t('orderRequiresItems'));
        orderBtn.disabled = false;
        orderBtn.innerHTML = `<i class="fas fa-check-circle"></i> ${t('orderButton')}`;
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
            alert(t('orderError'));
        }
    } catch (err) {
        console.error('Order error:', err);
        alert(t('networkError'));
    }
    
    orderBtn.disabled = false;
    orderBtn.innerHTML = `<i class="fas fa-check-circle"></i> ${t('orderButton')}`;
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
    imageCaption.textContent = `${emoji} ${name}`;

    if (img) {
        fullScreenImage.style.display = 'block';
        imagePlaceholder.style.display = 'none';
        fullScreenImage.src = img;
        fullScreenImage.onerror = () => {
            fullScreenImage.style.display = 'none';
            imagePlaceholder.textContent = emoji || '🍽️';
            imagePlaceholder.style.display = 'flex';
        };
    } else {
        fullScreenImage.style.display = 'none';
        imagePlaceholder.textContent = emoji || '🍽️';
        imagePlaceholder.style.display = 'flex';
    }

    imageModal.classList.add('open');
}

function closeImageModalHandler() {
    imageModal.classList.remove('open');
    fullScreenImage.src = '';
    imagePlaceholder.style.display = 'none';
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
        alert(t('missingTable'));
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
    
    const toastText = t('waiterCalled').replace('{table}', currentTableNumber);
    showToast(toastText);
    
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
// Bell tugmasi endi bevosita ofisant chaqiradi
if (callWaiterBtn) callWaiterBtn.addEventListener('click', callWaiter);
if (document) {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeImageModalHandler();
    });
}

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