// ============================================================
// MINGCHINOR KOMPLEKS - Customer JS (mijoz.js)
// ============================================================

let currentLang = localStorage.getItem('mc_lang') || null;
let selectedTable = null;
let currentTableIdx = 0;
let guestCount = 1;
let cart = {};
let deferredPrompt = null;
let _dbInitDone = false; // mc:db_ready bir martadan ortiq ishlamasin

const FLAGS = { uz:'🇺🇿', ru:'🇷🇺', en:'🇬🇧' };

// ---- INIT ----
window.addEventListener('mc:db_ready', () => {
  if (_dbInitDone) return; // Himoya: bir martadan ko'p ishlamasin
  _dbInitDone = true;

  setupPWA();
  listenRealtime();

  if (currentLang) {
    // Til avval tanlangan — langModal ni yashirib, to'g'ri stol modaliga o'tish
    hideLangModal();
    showTableModal();
  } else {
    // Birinchi kirish — til tanlashni ko'rsatish
    document.getElementById('langModal').classList.add('active');
  }
});

function hideLangModal() {
  document.getElementById('langModal').classList.remove('active');
}

function showTableModal() {
  DB.tables = JSON.parse(localStorage.getItem('mc_tables') || '[]');
  currentTableIdx = 0;
  applyTranslations();
  updateTableDisplay();
  document.getElementById('tableModal').classList.add('active');
}

function selectLang(lang) {
  currentLang = lang;
  localStorage.setItem('mc_lang', lang);
  hideLangModal();
  showTableModal();
}

function loadTableModal() {
  hideLangModal(); // langModal ochiq qolmasin
  showTableModal();
}

function applyTranslations() {
  if(!currentLang) return;
  document.getElementById('selectLangText').textContent = t('selectLang', currentLang);
  document.getElementById('brandSubtitle1').textContent = t('kompleks', currentLang);
  document.getElementById('brandSubtitle2').textContent = t('kompleks', currentLang);
  document.getElementById('tableLabelText').textContent = t('tableLabel', currentLang);
  document.getElementById('guestCountText').textContent = t('guestCount', currentLang);
  document.getElementById('openMenuText').textContent = t('openMenu', currentLang);
  document.getElementById('callWaiterText').textContent = t('callWaiter', currentLang);
  document.getElementById('allCatText').textContent = t('all', currentLang);
  document.getElementById('cartTitle').textContent = t('cart', currentLang);
  document.getElementById('totalText').textContent = t('total', currentLang);
  document.getElementById('serviceFeeLabel').textContent = t('serviceFee', currentLang) + ':';
  document.getElementById('cartGuestLabel').textContent = t('guestCount', currentLang);
  document.getElementById('emptyCartText').textContent = t('emptyCart', currentLang);
  document.getElementById('orderBtnText').textContent = t('order', currentLang);
  document.getElementById('selectLangText2').textContent = t('selectLang', currentLang);
  document.getElementById('tableChangeTitleText').textContent = t('tableChange', currentLang);
  
  const guestInput = document.getElementById('guestInput');
  if(guestInput) guestInput.placeholder = t('guestPlaceholder', currentLang);
  
  const noteEl = document.getElementById('orderNote');
  if(noteEl) noteEl.placeholder = t('notePlaceholder', currentLang);
  
  const installAppEl = document.getElementById('installAppText');
  if(installAppEl) installAppEl.textContent = t('installApp', currentLang);
  const installDescEl = document.getElementById('installDescText');
  if(installDescEl) installDescEl.textContent = t('installDesc', currentLang);
  const installBtn = document.getElementById('installBtn');
  if(installBtn) installBtn.textContent = t('install', currentLang);
  const laterBtn = document.querySelector('.btn-later');
  if(laterBtn) laterBtn.textContent = t('later', currentLang);
  
  updateCurrentLangFlag();
  updateHeaderTable();
}

function updateCurrentLangFlag() {
  const el = document.getElementById('currentLangFlag');
  if(el) el.textContent = FLAGS[currentLang] || '🌐';
}

// ---- TABLE COUNTER (ENTRY MODAL) ----
function changeTable(delta) {
  if(!DB.tables.length) return;
  currentTableIdx += delta;
  if(currentTableIdx < 0) currentTableIdx = DB.tables.length - 1;
  if(currentTableIdx >= DB.tables.length) currentTableIdx = 0;
  updateTableDisplay();
}

function updateTableDisplay() {
  const table = DB.tables[currentTableIdx];
  const nameEl = document.getElementById('tableNameDisplay');
  const statusEl = document.getElementById('tableStatusDisplay');
  const openBtn = document.getElementById('openMenuBtn');

  if(!table) {
    if(nameEl) nameEl.textContent = '---';
    if(statusEl) statusEl.textContent = '';
    if(openBtn) openBtn.disabled = true;
    return;
  }

  selectedTable = table;
  if(nameEl) nameEl.textContent = table.name;
  
  if(statusEl) {
    const isBusy = table.status === 'busy';
    statusEl.textContent = isBusy ? t('tableOccupied', currentLang) : t('tableFree', currentLang);
    statusEl.className = isBusy ? 'status-busy' : 'status-free';
    if(openBtn) openBtn.disabled = isBusy;
  }
  
  updateHeaderTable();
}

// ---- TABLE GRID (CHANGE MODAL) ----
function renderTableGrid(containerId) {
  const container = document.getElementById(containerId);
  if(!container) return;
  DB.tables = JSON.parse(localStorage.getItem('mc_tables') || '[]');
  container.innerHTML = '';
  if(!DB.tables.length) {
    container.innerHTML = `<p style="color:var(--text-dim);font-size:13px;text-align:center;grid-column:1/-1;padding:20px">${t('noTables', currentLang)}</p>`;
    return;
  }
  DB.tables.forEach(table => {
    const div = document.createElement('div');
    div.className = `table-item ${table.status === 'busy' ? 'busy' : 'free'} ${selectedTable?.id == table.id ? 'selected' : ''}`;
    div.innerHTML = `
      <span class="t-icon">${table.status==='busy' ? '🔴' : '🟢'}</span>
      <span class="t-name">${table.name}</span>
      <span class="t-status">${table.status==='busy' ? t('tableOccupied', currentLang) : t('tableFree', currentLang)}</span>
    `;
    if(table.status !== 'busy') {
      div.onclick = () => selectTable(table, containerId);
    }
    container.appendChild(div);
  });
}

function selectTable(table, containerId) {
  selectedTable = table;
  renderTableGrid(containerId);
  const btn = document.getElementById('openMenuBtn');
  if(btn) btn.disabled = false;
  updateHeaderTable();
  if(containerId === 'tableChangeGrid') {
    closeTableChange();
    showToast(`${table.name} ${t('yourTable', currentLang)}`);
  }
}

function changeGuests(delta) {
  setGuestCount(guestCount + delta);
}

function changeGuestsFromCart(delta) {
  setGuestCount(guestCount + delta);
}

function setGuestCount(value) {
  guestCount = Math.max(1, Math.min(20, parseInt(value) || 1));
  syncGuestInputs();
  updateCartFAB();
  const cartModal = document.getElementById('cartModal');
  if(cartModal?.classList.contains('active') && getCartCount() > 0) {
    renderCartItems();
  }
}

function syncGuestInputs() {
  const guestInput = document.getElementById('guestInput');
  if(guestInput) guestInput.value = guestCount;
  const cartGuestInput = document.getElementById('cartGuestInput');
  if(cartGuestInput) cartGuestInput.value = guestCount;
}

document.addEventListener('change', e => {
  if(e.target.id === 'guestInput' || e.target.id === 'cartGuestInput') {
    setGuestCount(e.target.value);
  }
});

document.addEventListener('input', e => {
  if(e.target.id === 'guestInput' || e.target.id === 'cartGuestInput') {
    setGuestCount(e.target.value);
  }
});

function updateHeaderTable() {
  const el = document.getElementById('headerTableBadge');
  if(el && selectedTable) {
    const tablePrefix = t('table', currentLang);
    el.textContent = selectedTable.name.replace('Stol ', 'T').replace(tablePrefix + ' ', 'T');
  }
}

// ---- OPEN MENU ----
function openMenu() {
  if(!selectedTable) return;
  setGuestCount(document.getElementById('guestInput').value);
  document.getElementById('tableModal').classList.remove('active');
  document.getElementById('menuPage').classList.remove('hidden');
  applyTranslations();
  loadCategories();
  loadMenuItems();
}

// ---- CATEGORIES ----
function loadCategories() {
  DB.categories = JSON.parse(localStorage.getItem('mc_categories') || '[]');
  const bar = document.getElementById('categoriesBar');
  bar.innerHTML = `<button class="cat-btn active" data-cat="all" onclick="filterCategory('all')">${t('all', currentLang)}</button>`;
  
  const sortedCats = DB.categories.sort((a,b) => (a.order || 0) - (b.order || 0));
  sortedCats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.dataset.cat = cat.id;
    // Ko'p tilli nom (name_uz, name_ru, name_en) yoki default .name
    btn.textContent = cat['name_' + currentLang] || cat.name;
    btn.onclick = () => filterCategory(cat.id);
    bar.appendChild(btn);
  });
}

function filterCategory(catId) {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-cat="${catId}"]`)?.classList.add('active');
  renderMenuItems(catId);
}

// ---- MENU ITEMS ----
function loadMenuItems() {
  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
  renderMenuItems('all');
}

function renderMenuItems(catFilter) {
  const content = document.getElementById('menuContent');
  document.getElementById('loadingState')?.remove();
  
  let items = DB.menuItems.filter(m => !m.deleted);
  if(catFilter !== 'all') items = items.filter(m => m.categoryId == catFilter);
  
  items.sort((a,b) => (a.order || 0) - (b.order || 0));

  if(!items.length) {
    content.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
      <div style="font-size:40px">🍽️</div>
      <p style="margin-top:12px;font-size:14px">${t('noItems', currentLang)}</p>
    </div>`;
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'menu-grid';
  items.forEach(item => {
    const qty = (cart[item.id] || 0);
    const card = document.createElement('div');
    card.className = `menu-card ${item.unavailable ? 'unavailable' : ''}`;
    card.id = `card-${item.id}`;
    const itemName = item['name_' + currentLang] || item.name;
    const imgSrc = item.image || '';
    const imgHtml = imgSrc
      ? `<img class="menu-card-img" src="${imgSrc}" alt="${itemName}" loading="lazy" onclick="openImgModal('${imgSrc}','${itemName.replace(/'/g,"\\'")}',${item.sellPrice})">`
      : `<div class="menu-card-img-placeholder" onclick="openImgModal('','${itemName.replace(/'/g,"\\'")}',${item.sellPrice})">🍽️</div>`;
    card.innerHTML = `
      ${imgHtml}
      <div class="menu-card-body">
        <div class="menu-card-name">${itemName}</div>
        <div class="menu-card-price">${formatPrice(item.sellPrice)} ${t('sum', currentLang)}</div>
        <div class="menu-card-controls">
          ${qty > 0 ? `
            <div class="qty-ctrl">
              <button class="qty-btn" onclick="updateCart('${item.id}',-1)">−</button>
              <span class="qty-num">${qty}</span>
              <button class="qty-btn" onclick="updateCart('${item.id}',1)">+</button>
            </div>
          ` : `<button class="add-btn" onclick="updateCart('${item.id}',1)">${t('addToCart', currentLang)}</button>`}
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
  content.innerHTML = '';
  content.appendChild(grid);
}

// ---- CART ----
function updateCart(itemId, delta) {
  cart[itemId] = Math.max(0, (cart[itemId] || 0) + delta);
  if(cart[itemId] === 0) delete cart[itemId];
  updateCartFAB();
  refreshCard(itemId);
}

function refreshCard(itemId) {
  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
  const item = DB.menuItems.find(m => m.id == itemId);
  if(!item) return;
  const card = document.getElementById(`card-${itemId}`);
  if(!card) return;
  const qty = cart[itemId] || 0;
  const controls = card.querySelector('.menu-card-controls');
  if(!controls) return;
  controls.innerHTML = qty > 0 ? `
    <div class="qty-ctrl">
      <button class="qty-btn" onclick="updateCart(${itemId},-1)">−</button>
      <span class="qty-num">${qty}</span>
      <button class="qty-btn" onclick="updateCart(${itemId},1)">+</button>
    </div>
  ` : `<button class="add-btn" onclick="updateCart(${itemId},1)">${t('addToCart', currentLang)}</button>`;
}

function updateCartFAB() {
  const total = getCartTotal();
  const count = getCartCount();
  const fab = document.getElementById('cartFab');
  if(count > 0) {
    fab.style.display = 'flex';
    document.getElementById('cartCount').textContent = count;
    document.getElementById('cartTotal').textContent = formatPrice(total + getServiceFee()) + ' ' + t('sum', currentLang);
  } else {
    fab.style.display = 'none';
  }
}

function getCartTotal() {
  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
  return Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = DB.menuItems.find(m => m.id == id);
    return sum + (item ? item.sellPrice * qty : 0);
  }, 0);
}

function getServiceFee() {
  const feePerGuest = parseInt(localStorage.getItem('mc_service_fee')) || 0;
  return guestCount * feePerGuest;
}

function getCartCount() {
  return Object.values(cart).reduce((a, b) => a + b, 0);
}

function openCart() {
  const modal = document.getElementById('cartModal');
  modal.classList.add('active');
  syncGuestInputs();
  renderCartItems();
}

function closeCart() {
  document.getElementById('cartModal').classList.remove('active');
}

function renderCartItems() {
  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
  const container = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  const emptyEl = document.getElementById('emptyCart');
  const count = getCartCount();
  syncGuestInputs();

  if(count === 0) {
    container.innerHTML = '';
    footer.style.display = 'none';
    emptyEl.style.display = 'flex';
    return;
  }
  emptyEl.style.display = 'none';
  footer.style.display = 'block';

  container.innerHTML = '';
  Object.entries(cart).forEach(([id, qty]) => {
    const item = DB.menuItems.find(m => m.id == id);
    if(!item || qty === 0) return;
    const itemName = item['name_' + currentLang] || item.name;
    const div = document.createElement('div');
    div.className = 'cart-item';
    const imgEl = item.image
      ? `<img class="cart-item-img" src="${item.image}" alt="${itemName}">`
      : `<div class="cart-item-img" style="display:flex;align-items:center;justify-content:center;font-size:22px">🍽️</div>`;
    div.innerHTML = `
      ${imgEl}
      <div class="cart-item-info">
        <div class="cart-item-name">${itemName}</div>
        <div class="cart-item-price">${formatPrice(item.sellPrice * qty)} ${t('sum', currentLang)}</div>
      </div>
      <div class="cart-item-qty">
        <button class="cq-btn" onclick="updateCartModal(${id},-1)">−</button>
        <span class="cq-num">${qty}</span>
        <button class="cq-btn" onclick="updateCartModal(${id},1)">+</button>
      </div>
    `;
    container.appendChild(div);
  });

  const total = getCartTotal();
  const fee = getServiceFee();
  const grandTotal = total + fee;

  const feeRow = document.getElementById('serviceFeeRow');
  if(fee > 0) {
    feeRow.style.display = 'flex';
    document.getElementById('cartServiceFeeAmount').textContent = formatPrice(fee) + ' ' + t('sum', currentLang);
  } else {
    feeRow.style.display = 'none';
  }

  document.getElementById('cartTotalAmount').textContent = formatPrice(grandTotal) + ' ' + t('sum', currentLang);
}

function updateCartModal(itemId, delta) {
  updateCart(itemId, delta);
  renderCartItems();
}

// ---- PLACE ORDER ----
function placeOrder() {
  if(getCartCount() === 0) return;
  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
  const note = document.getElementById('orderNote')?.value || '';
  const items = Object.entries(cart).map(([id, qty]) => {
    const item = DB.menuItems.find(m => m.id == id);
    return { menuItemId: parseInt(id), name: item?.name, qty, price: item?.sellPrice, categoryId: item?.categoryId };
  }).filter(x => x.qty > 0);

  const feePerGuest = parseInt(localStorage.getItem('mc_service_fee')) || 0;
  if(feePerGuest > 0) {
    items.push({
      menuItemId: 'service_fee',
      name: t('serviceFee', currentLang),
      qty: guestCount,
      price: feePerGuest,
      categoryId: 'service'
    });
  }

  const order = DB.addOrder({
    tableId: selectedTable.id,
    tableName: selectedTable.name,
    guestCount,
    items,
    note,
    lang: currentLang,
    totalPrice: getCartTotal() + getServiceFee()
  });

  DB.broadcast('new_order', order);

  // Buyurtma yuborildi — sahifani to'liq reset qilish
  cart = {};
  updateCartFAB();
  closeCart();
  showToast(t('orderSent', currentLang));

  // 1.5 soniyadan keyin stol tanlash modaliga qaytarish
  setTimeout(() => {
    resetToTableModal();
  }, 1500);
}

// ---- RESET: Stol tanlash modaliga qaytarish ----
function resetToTableModal() {
  // Sahifani yashirish
  document.getElementById('menuPage').classList.add('hidden');
  // Barcha modalni yopish (langModal ham ochiq qolmasin)
  hideLangModal();
  document.getElementById('tableModal').classList.remove('active');
  // Stol va mehmon sonini tozalash
  selectedTable = null;
  setGuestCount(1);
  const openBtn = document.getElementById('openMenuBtn');
  if(openBtn) openBtn.disabled = true;
  // Savat tozalash
  cart = {};
  updateCartFAB();
  // Stol modalini ko'rsatish (showTableModal() ichida langModal yashiriladi)
  showTableModal();
}

// ---- WAITER CALL ----
function callWaiter() {
  if(!selectedTable) return;
  const call = {
    id: DB.nextId(DB.waiterCalls),
    tableId: selectedTable.id,
    tableName: selectedTable.name,
    ts: new Date().toISOString(),
    status: 'pending'
  };
  DB.waiterCalls.push(call);
  DB.save('waiterCalls');
  DB.broadcast('waiter_call', call);
  
  const btn = document.getElementById('callWaiterBtn');
  btn.classList.add('calling');
  setTimeout(() => btn.classList.remove('calling'), 3000);
  showToast(t('waiterCalled', currentLang));
}

// ---- LANG CHANGE ----
function showLangChange() {
  document.getElementById('langChangeModal').classList.add('active');
}
function closeLangChange() {
  document.getElementById('langChangeModal').classList.remove('active');
}
function changeLang(lang) {
  currentLang = lang;
  localStorage.setItem('mc_lang', lang);
  closeLangChange();
  applyTranslations();
  loadCategories();
  loadMenuItems();
}

// ---- TABLE CHANGE ----
function showTableChange() {
  renderTableGrid('tableChangeGrid');
  document.getElementById('tableChangeModal').classList.add('active');
}
function closeTableChange() {
  document.getElementById('tableChangeModal').classList.remove('active');
}

// ---- IMAGE MODAL ----
function openImgModal(src, name, price) {
  const modal = document.getElementById('imgModal');
  document.getElementById('imgModalSrc').src = src || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="%23251407"/><text x="100" y="110" font-size="60" text-anchor="middle">🍽️</text></svg>';
  document.getElementById('imgModalName').textContent = name;
  document.getElementById('imgModalPrice').textContent = formatPrice(price) + ' ' + t('sum', currentLang);
  modal.classList.add('active');
}
function closeImgModal() {
  document.getElementById('imgModal').classList.remove('active');
}

// ---- TOAST ----
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

// ---- FORMAT ----
function formatPrice(n) {
  return (n || 0).toLocaleString('uz-UZ');
}

// ---- PWA ----
function setupPWA() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Headerdagi install tugmasini ko'rsatish
    const headerInstallBtn = document.getElementById('headerInstallBtn');
    if(headerInstallBtn) headerInstallBtn.style.display = 'flex';

    if(!localStorage.getItem('mc_pwa_dismissed')) {
      document.getElementById('installBanner').style.display = 'flex';
    }
  });
}
function installPWA() {
  if(deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => { 
      deferredPrompt = null; 
      const headerInstallBtn = document.getElementById('headerInstallBtn');
      if(headerInstallBtn) headerInstallBtn.style.display = 'none';
    });
  }
  document.getElementById('installBanner').style.display = 'none';
}
function dismissInstall() {
  localStorage.setItem('mc_pwa_dismissed','1');
  document.getElementById('installBanner').style.display = 'none';
}

// ---- REALTIME ----
function listenRealtime() {
  // Firestore real-time (boshqa qurilmalar / boshqa sahifalar)
  window.addEventListener('mc:data_changed', e => {
    const { key, items } = e.detail;
    if(key === 'tables') {
      DB.tables = items;
      _refreshTableUI();
    }
    if(key === 'menuItems') {
      DB.menuItems = items;
      if(!document.getElementById('menuPage').classList.contains('hidden')) {
        loadCategories();
        loadMenuItems();
      }
    }
  });
  // localStorage real-time (bir qurilmadagi boshqa tablar)
  window.addEventListener('storage', e => {
    if(e.key === 'mc_tables') {
      DB.tables = JSON.parse(e.newValue || '[]');
      _refreshTableUI();
    }
    if(e.key === 'mc_menu') {
      DB.menuItems = JSON.parse(e.newValue || '[]');
      if(!document.getElementById('menuPage').classList.contains('hidden')) {
        loadCategories();
        loadMenuItems();
      }
    }
  });
}

// Stol holati o'zgarganda barcha UI ni yangilash
function _refreshTableUI() {
  // TableModal ochiq bo'lsa — table counter ni yangilash
  const tableModal = document.getElementById('tableModal');
  if(tableModal && tableModal.classList.contains('active')) {
    updateTableDisplay();
    // Agar tableGrid render qilingan bo'lsa (eski ochiq modal)
    const tg = document.getElementById('tableGrid');
    if(tg && tg.children.length > 0) renderTableGrid('tableGrid');
  }
  // TableChange modal ochiq bo'lsa
  const tcModal = document.getElementById('tableChangeModal');
  if(tcModal && tcModal.classList.contains('active')) {
    renderTableGrid('tableChangeGrid');
  }
  // Header badge ni yangilash
  updateHeaderTable();
}
