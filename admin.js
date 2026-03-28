// Admin paroli
const ADMIN_PASSWORD = "mingchinor123";
const STORAGE_KEY = 'mingchinor_menu';

let menuData = [];
let selectedEditId = null;

function checkAdminLogin() {
    const password = document.getElementById('adminPassword').value;
    const errorDiv = document.getElementById('loginError');
    
    if (password === ADMIN_PASSWORD) {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('adminContent').style.display = 'block';
        loadMenuData();
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

function loadMenuData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        menuData = JSON.parse(stored);
    } else {
        menuData = getDefaultMenu();
        saveMenu();
    }
    renderItemsList();
}

function getDefaultMenu() {
    return [
        { id: 1, emoji: "🥣", name: "Mastava", desc: "Qo'zichoq go'shti, sabzavotlar", price: 28000, category: "🍜 Birinchi taomlar", available: true, image: "" },
        { id: 2, emoji: "🍲", name: "Shurva", desc: "Qo'y go'shti, karam, sabzi", price: 25000, category: "🍜 Birinchi taomlar", available: true, image: "" },
        { id: 3, emoji: "🥘", name: "Lagman", desc: "El noodles, go'sht, sabzavot", price: 32000, category: "🍜 Birinchi taomlar", available: true, image: "" },
        { id: 4, emoji: "🫕", name: "Moshxo'rda", desc: "Mosh, guruch, yog'", price: 22000, category: "🍜 Birinchi taomlar", available: true, image: "" },
        { id: 5, emoji: "🍚", name: "Osh (Palov)", desc: "Qo'zichoq go'shti, sabzi, guruch", price: 38000, category: "🍽️ Ikkinchi taomlar", available: true, image: "" },
        { id: 6, emoji: "🥩", name: "Kabob", desc: "Qo'y go'shti, zira, piyoz", price: 45000, category: "🍽️ Ikkinchi taomlar", available: true, image: "" },
        { id: 7, emoji: "🫔", name: "Dimlama", desc: "Go'sht, kartoshka, sabzavotlar", price: 35000, category: "🍽️ Ikkinchi taomlar", available: true, image: "" },
        { id: 8, emoji: "🍗", name: "Tovuq qovurma", desc: "Basmati guruch bilan", price: 40000, category: "🍽️ Ikkinchi taomlar", available: true, image: "" },
        { id: 9, emoji: "🥗", name: "Achichuk salat", desc: "Pomidor, bodring, piyoz, ko'k", price: 15000, category: "🍽️ Ikkinchi taomlar", available: true, image: "" },
        { id: 10, emoji: "🫓", name: "Patir non", desc: "Tandirda pishirilgan", price: 8000, category: "🫓 Non va sneklar", available: true, image: "" },
        { id: 11, emoji: "🥙", name: "Somsa", desc: "Go'shtli, yangi pishirilgan", price: 12000, category: "🫓 Non va sneklar", available: true, image: "" },
        { id: 12, emoji: "🥟", name: "Manti", desc: "Qo'y go'shti bilan (6 dona)", price: 30000, category: "🫓 Non va sneklar", available: true, image: "" },
        { id: 13, emoji: "🍵", name: "Ko'k choy", desc: "Chinni piyolada", price: 8000, category: "🧃 Ichimliklar", available: true, image: "" },
        { id: 14, emoji: "☕", name: "Qora choy", desc: "Limon bilan", price: 8000, category: "🧃 Ichimliklar", available: true, image: "" },
        { id: 15, emoji: "🧃", name: "Sharbat", desc: "Mavsumiy mevalar", price: 18000, category: "🧃 Ichimliklar", available: true, image: "" },
        { id: 16, emoji: "🥛", name: "Ayron", desc: "Yangi, sovuq", price: 12000, category: "🧃 Ichimliklar", available: true, image: "" },
        { id: 17, emoji: "💧", name: "Mineral suv", desc: "Gaz'li / gaz'siz (0.5L)", price: 7000, category: "🧃 Ichimliklar", available: true, image: "" },
        { id: 18, emoji: "🍯", name: "Halva", desc: "An'anaviy, yong'oq bilan", price: 20000, category: "🍰 Shirinliklar", available: true, image: "" },
        { id: 19, emoji: "🍮", name: "Murabbo", desc: "O'rik murabbo, qaymoq", price: 15000, category: "🍰 Shirinliklar", available: true, image: "" },
        { id: 20, emoji: "🍩", name: "Pishiriqlar", desc: "Kunlik assortment", price: 14000, category: "🍰 Shirinliklar", available: true, image: "" }
    ];
}

function saveMenu() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(menuData));
    window.dispatchEvent(new Event('storage'));
}

function formatPrice(price) {
    return price.toLocaleString('uz-UZ') + " so'm";
}

// Rasmni fayldan o'qish va base64 ga aylantirish
function readImageAsBase64(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        callback(e.target.result);
    };
    reader.readAsDataURL(file);
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
                ${item.image ? `<img src="${item.image}" class="item-image" onerror="this.src='https://via.placeholder.com/60?text=No+Image'">` : 
                                `<div class="item-image" style="display: flex; align-items: center; justify-content: center; background: #f0f0f0;">${item.emoji}</div>`}
            </div>
            <div><strong>${item.emoji} ${item.name}</strong><br><small>${item.desc?.substring(0, 40) || ''}</small></div>
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
                    ${item.available ? '<i class="fas fa-eye-slash"></i> O\'chir' : '<i class="fas fa-eye"></i> Yoq'}
                </button>
                <button class="btn-delete" onclick="deleteItem(${item.id})">
                    <i class="fas fa-trash"></i> O'chir
                </button>
            </div>
        </div>
    `).join('');
}

function selectForEdit(id) {
    const item = menuData.find(i => i.id === id);
    if (!item) return;
    
    selectedEditId = id;
    
    // Tahrirlash panelini ko'rsatish
    document.getElementById('editItemCard').style.display = 'block';
    
    // Tanlangan ma'lumotni ko'rsatish
    const infoDiv = document.getElementById('selectedItemInfo');
    infoDiv.innerHTML = `
        <img src="${item.image || 'https://via.placeholder.com/50?text=No+Img'}" onerror="this.src='https://via.placeholder.com/50?text=No+Img'">
        <div><strong>${item.emoji} ${item.name}</strong><br>ID: #${item.id}</div>
    `;
    
    // Form maydonlarini to'ldirish
    document.getElementById('editItemName').value = item.name;
    document.getElementById('editItemEmoji').value = item.emoji;
    document.getElementById('editItemPrice').value = item.price;
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
    
    // Rasm fayl inputini tozalash
    document.getElementById('editItemImageFile').value = '';
    
    // Sahifaga skroll
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
    
    // Yangi qiymatlarni olish
    item.name = document.getElementById('editItemName').value.trim();
    item.emoji = document.getElementById('editItemEmoji').value.trim() || '🍽️';
    item.price = parseInt(document.getElementById('editItemPrice').value);
    item.category = document.getElementById('editItemCategory').value;
    item.desc = document.getElementById('editItemDesc').value.trim();
    
    // Rasmni yangilash (URL dan)
    const imageUrl = document.getElementById('editItemImageUrl').value.trim();
    if (imageUrl) {
        item.image = imageUrl;
    }
    
    // Rasmni fayldan yangilash
    const fileInput = document.getElementById('editItemImageFile');
    if (fileInput.files && fileInput.files[0]) {
        readImageAsBase64(fileInput.files[0], (base64) => {
            item.image = base64;
            saveMenu();
            renderItemsList();
            cancelEdit();
            showToast(`✅ "${item.name}" muvaffaqiyatli tahrirlandi!`);
        });
        return;
    }
    
    // Agar URL bo'lsa yoki fayl bo'lmasa
    if (!imageUrl && !fileInput.files?.length) {
        // Rasmni o'zgartirmaslik
    }
    
    saveMenu();
    renderItemsList();
    cancelEdit();
    showToast(`✅ "${item.name}" muvaffaqiyatli tahrirlandi!`);
}

function showToast(message) {
    // Toast yaratish
    let toast = document.getElementById('adminToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'adminToast';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 24px;
            border-radius: 40px;
            font-weight: 600;
            z-index: 2000;
            transition: all 0.3s;
            transform: translateY(100px);
            opacity: 0;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
    setTimeout(() => {
        toast.style.transform = 'translateY(100px)';
        toast.style.opacity = '0';
    }, 3000);
}

function toggleAvailability(id) {
    const item = menuData.find(i => i.id === id);
    if (item) {
        item.available = !item.available;
        saveMenu();
        renderItemsList();
        showToast(`${item.name} ${item.available ? 'yoqildi ✓' : 'o\'chirildi ⏸️'}`);
    }
}

function deleteItem(id) {
    const item = menuData.find(i => i.id === id);
    if (confirm(`"${item?.name}" ni butunlay o'chirmoqchimisiz?`)) {
        menuData = menuData.filter(i => i.id !== id);
        saveMenu();
        renderItemsList();
        if (selectedEditId === id) cancelEdit();
        showToast(`❌ "${item?.name}" o'chirildi`);
    }
}

function addNewItem() {
    const name = document.getElementById('itemName').value.trim();
    const emoji = document.getElementById('itemEmoji').value.trim() || '🍽️';
    const price = parseInt(document.getElementById('itemPrice').value);
    const category = document.getElementById('itemCategory').value;
    const desc = document.getElementById('itemDesc').value.trim();
    
    if (!name || isNaN(price) || price <= 0) {
        alert('Iltimos, taom nomi va narxini to\'g\'ri kiriting!');
        return;
    }
    
    const newId = Math.max(...menuData.map(i => i.id), 0) + 1;
    const newItem = {
        id: newId,
        emoji,
        name,
        desc: desc || '',
        price,
        category,
        available: true,
        image: ''
    };
    
    // Rasmni qo'shish
    const fileInput = document.getElementById('itemImageFile');
    const imageUrl = document.getElementById('itemImageUrl').value.trim();
    
    if (fileInput.files && fileInput.files[0]) {
        readImageAsBase64(fileInput.files[0], (base64) => {
            newItem.image = base64;
            menuData.push(newItem);
            saveMenu();
            renderItemsList();
            clearAddForm();
            showToast(`✅ "${name}" muvaffaqiyatli qo'shildi!`);
        });
        return;
    } else if (imageUrl) {
        newItem.image = imageUrl;
    }
    
    menuData.push(newItem);
    saveMenu();
    renderItemsList();
    clearAddForm();
    showToast(`✅ "${name}" muvaffaqiyatli qo'shildi!`);
}

function clearAddForm() {
    document.getElementById('itemName').value = '';
    document.getElementById('itemEmoji').value = '';
    document.getElementById('itemPrice').value = '';
    document.getElementById('itemDesc').value = '';
    document.getElementById('itemImageFile').value = '';
    document.getElementById('itemImageUrl').value = '';
}

// Qidiruv va filter eventlari
document.getElementById('searchItemInput')?.addEventListener('input', () => renderItemsList());
document.getElementById('categoryFilter')?.addEventListener('change', () => renderItemsList());

// QR kod yaratish
function generateQRCode() {
    const qrDiv = document.getElementById('qrCodeDisplay');
    if (!qrDiv) return;
    qrDiv.innerHTML = '';
    new QRCode(qrDiv, {
        text: window.location.origin + window.location.pathname.replace('/edit', ''),
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

window.addEventListener('storage', () => {
    loadMenuData();
});

document.getElementById('adminPassword')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkAdminLogin();
});