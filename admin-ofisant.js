// ============================================================
// MINGCHINOR KOMPLEKS - Waiter Panel JS (admin-ofisant.js)
// ============================================================

let currentWaiter = null;
let addItemTargetOrderId = null;
let addItemCart = {};
let editingCheckId = null;
let editingCheckItems = [];

// ---- ZAKAZ STATE ----
let zakazCart = {};
let zakazGuestCount = 1;
let zakazSelectedTable = null;
let zakazCurrentOrderId = null;
let zakazCurrentCheckId = null;
let currentCatId = 'all';
let currentAddFunc = 'updateZakazCart';
let isAddingToOrder = false;

// ---- QURILMA IDENTIFIKATORI (bitta hisob — bitta qurilma) ----
// Har bir telefon/brauzer uchun tasodifiy, doimiy ID yaratiladi va
// localStorage'da saqlanadi. Bu ID orqali "qaysi qurilma hozir shu
// hisobga kirgan" ekanligi aniqlanadi.
function getDeviceId() {
  let id = localStorage.getItem('mc_device_id');
  if(!id) {
    id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 12);
    localStorage.setItem('mc_device_id', id);
  }
  return id;
}

// ---- INIT ----
window.addEventListener('mc:db_ready', () => {
  const saved = localStorage.getItem('mc_waiter_session');
  if(saved) {
    currentWaiter = JSON.parse(saved);
    // Sessiya tiklanganda ham qurilma hali ham shu hisobga bog'liqligini tekshiramiz
    DB.waiters = JSON.parse(localStorage.getItem('mc_waiters') || '[]');
    const w = DB.waiters.find(x => x.id === currentWaiter.id);
    if(w && w.activeDeviceId && w.activeDeviceId !== getDeviceId()) {
      // Boshqa qurilma bu hisobni egallab olgan — sessiyani tugatamiz
      currentWaiter = null;
      localStorage.removeItem('mc_waiter_session');
    } else {
      showPanel();
    }
  }
  setupRealtime();
});

// ---- LOGIN ----
function doLogin() {
  const login = document.getElementById('loginInput').value.trim();
  const pass = document.getElementById('passInput').value;
  DB.waiters = JSON.parse(localStorage.getItem('mc_waiters') || '[]');
  const waiter = DB.waiters.find(w => w.login === login && w.password === pass);
  if(!waiter) {
    showLoginError("Login yoki parol noto'g'ri");
    return;
  }

  const myDeviceId = getDeviceId();
  if(waiter.activeDeviceId && waiter.activeDeviceId !== myDeviceId) {
    showLoginError("Bu hisob hozir boshqa telefonda ochiq. Admin bilan bog'laning yoki avval o'sha qurilmadan chiqing.");
    return;
  }

  // Hisobni shu qurilmaga bog'laymiz
  waiter.activeDeviceId = myDeviceId;
  waiter.deviceBoundAt = new Date().toISOString();
  DB.save('waiters');

  currentWaiter = waiter;
  localStorage.setItem('mc_waiter_session', JSON.stringify(waiter));
  showPanel();
}

function showLoginError(msg) {
  const el = document.getElementById('loginError');
  el.textContent = msg;
  el.style.display = 'block';
}

function doLogout() {
  // Qurilma qulfini bo'shatamiz — shu login boshqa telefonda ham kira oladi
  if(currentWaiter) {
    DB.waiters = JSON.parse(localStorage.getItem('mc_waiters') || '[]');
    const w = DB.waiters.find(x => x.id === currentWaiter.id);
    if(w && w.activeDeviceId === getDeviceId()) {
      delete w.activeDeviceId;
      delete w.deviceBoundAt;
      DB.save('waiters');
    }
  }
  currentWaiter = null;
  localStorage.removeItem('mc_waiter_session');
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('mainPanel').style.display = 'none';
}

function showPanel() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('mainPanel').style.display = 'flex';
  document.getElementById('waiterName').textContent = currentWaiter.name + ' ' + currentWaiter.surname;
  switchTab('calls');
}

// ---- TABS ----
function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector(`[data-tab="${name}"]`).classList.add('active');
  document.getElementById(`tab${name.charAt(0).toUpperCase()+name.slice(1)}`).classList.add('active');
  if(name === 'calls') loadCalls();
  if(name === 'orders') loadOrders();
  if(name === 'checks') loadChecks();
  if(name === 'zakaz') loadZakazTab();
}

// ---- CALLS ----
function loadCalls() {
  DB.waiterCalls = JSON.parse(localStorage.getItem('mc_waiter_calls') || '[]');
  const pending = DB.waiterCalls.filter(c => c.status === 'pending');
  const badge = document.getElementById('callsBadge');
  badge.textContent = pending.length;
  badge.style.display = pending.length > 0 ? 'flex' : 'none';

  const list = document.getElementById('callsList');
  if(!pending.length) {
    list.innerHTML = `<div class="empty-state"><span>🔕</span><p>Hozircha chaqiruv yo'q</p></div>`;
    return;
  }
  list.innerHTML = '';
  pending.forEach(call => {
    const ts = new Date(call.ts);
    const timeStr = ts.toLocaleTimeString('uz-UZ', {hour:'2-digit', minute:'2-digit'});
    const div = document.createElement('div');
    div.className = 'call-card urgent';
    div.innerHTML = `
      <div class="call-info">
        <h3>📍 ${call.tableName}</h3>
        <p>${timeStr} da chaqirildi</p>
      </div>
      <button class="btn-arrived" onclick="markCallArrived(${call.id})">Keldim ✓</button>
    `;
    list.appendChild(div);
  });
}

function markCallArrived(callId) {
  DB.waiterCalls = JSON.parse(localStorage.getItem('mc_waiter_calls') || '[]');
  const call = DB.waiterCalls.find(c => c.id === callId);
  if(call) {
    call.status = 'done';
    call.waiterId = currentWaiter.id;
    DB.save('waiterCalls');
    // Assign unassigned pending orders for this table
    DB.orders = JSON.parse(localStorage.getItem('mc_orders') || '[]');
    DB.orders.filter(o => o.tableId === call.tableId && o.status === 'pending' && !o.waiterId)
      .forEach(o => { o.waiterId = currentWaiter.id; });
    DB.save('orders');
    loadCalls();
    showToast(`${call.tableName} ga borildi`);
  }
}

// ---- ORDERS ----
function loadOrders() {
  DB.orders = JSON.parse(localStorage.getItem('mc_orders') || '[]');
  // Show: pending (unassigned), my assigned orders
  const visible = DB.orders.filter(o =>
    o.status !== 'done' && (o.status === 'pending' || o.waiterId === currentWaiter.id)
  );
  const pending = visible.filter(o => o.status === 'pending' && !o.waiterId).length;
  const badge = document.getElementById('ordersBadge');
  badge.textContent = pending;
  badge.style.display = pending > 0 ? 'flex' : 'none';

  const list = document.getElementById('ordersList');
  if(!visible.length) {
    list.innerHTML = `<div class="empty-state"><span>📭</span><p>Buyurtma yo'q</p></div>`;
    return;
  }
  list.innerHTML = '';
  // Eng yangi buyurtmalar birinchi chiqishi uchun sana bo'yicha kamayish tartibida saralash
  visible.sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)).forEach(order => {
    list.appendChild(buildOrderCard(order));
  });
}

function buildOrderCard(order) {
  const div = document.createElement('div');
  div.className = 'order-card';
  div.id = `order-card-${order.id}`;
  const ts = new Date(order.createdAt);
  const timeStr = ts.toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'});
  const ismine = order.waiterId === currentWaiter.id;
  const statusLabel = order.status === 'pending' && !order.waiterId ? 'Yangi' :
    order.status === 'accepted' ? 'Qabul qilindi' : 'Mening buyurtmam';
  const statusClass = order.status === 'pending' && !order.waiterId ? 'pending' :
    ismine ? 'mine' : 'accepted';

  let itemsHtml = order.items.map(item =>
    `<div class="order-item-row">
      <span class="oi-name">${item.name}</span>
      <span class="oi-qty">x${item.qty}</span>
      <span class="oi-price">${formatPrice(item.price * item.qty)} so'm</span>
    </div>`
  ).join('');

  let customerHtml = '';
  if(order.customerInfo) {
    const c = order.customerInfo;
    const locBtn = (c.lat && c.lng)
      ? `<a href="https://maps.google.com/?q=${c.lat},${c.lng}" target="_blank" class="btn-loc" style="display:inline-block;margin-top:6px;padding:6px 12px;background:rgba(62,207,142,0.15);color:var(--success);border-radius:6px;text-decoration:none;font-size:12px;font-weight:700">📍 Xaritada ko'rish</a>`
      : `<span style="display:inline-block;margin-top:6px;font-size:12px;color:var(--warn)">📍 ${c.address || 'Manzil kiritilmagan'}</span>`;
    
    customerHtml = `
      <div class="order-customer-box" style="margin-bottom:12px;padding:12px;background:var(--bg3);border-radius:8px;border:1px solid var(--border);">
        <div style="font-size:14px;font-weight:700;margin-bottom:4px">👤 ${c.name || 'Mijoz'}</div>
        <div style="font-size:13px;color:var(--text-dim);margin-bottom:4px">📞 <a href="tel:${c.phone}" style="color:var(--accent);text-decoration:none">${c.phone}</a></div>
        <div style="font-size:13px;color:var(--text-dim);">💳 To'lov: <strong>${c.paymentMethod === 'naqd' ? 'Naqd pul' : 'Plastik karta'}</strong></div>
        ${locBtn}
      </div>
    `;
  }

  let footerBtns = '';
  if(!order.waiterId || order.status === 'pending') {
    footerBtns += `<button class="btn-accept" onclick="acceptOrder(${order.id})">Qabul qilish 🖨️</button>`;
  }
  if(ismine || order.status === 'accepted') {
    if(order.tableId !== 'delivery') {
      footerBtns += `<button class="btn-add-item" onclick="openZakazForTable(${order.tableId})">+ Taom qo'shish</button>`;
    }
    footerBtns += `<button class="btn-send-kassa" onclick="sendToKassa(${order.id})">Chek yaratish 🧾</button>`;
    if(order.tableId === 'delivery' && order.customerInfo?.paymentMethod === 'karta') {
      footerBtns += `<button class="btn-send-kassa" style="background:var(--success);border-color:var(--success)" onclick="confirmDeliveryPayment(${order.id})">To'lovni tasdiqlash ✅</button>`;
    }
  }

  const titleIcon = order.tableId === 'delivery' ? '🛵' : '📍';

  div.innerHTML = `
    <div class="order-card-head">
      <div>
        <h3>${titleIcon} ${order.tableName}</h3>
        <span class="oc-meta">${order.guestCount} kishi · ${timeStr}</span>
      </div>
      <span class="order-status ${statusClass}">${statusLabel}</span>
    </div>
    ${customerHtml}
    <div class="order-items-list">${itemsHtml}</div>
    ${order.note ? `<div class="order-note">📝 ${order.note}</div>` : ''}
    <div class="order-card-footer">
      <span class="order-total">${formatPrice(order.totalPrice)} so'm</span>
      ${footerBtns}
    </div>
  `;
  return div;
}

function acceptOrder(orderId) {
  DB.orders = JSON.parse(localStorage.getItem('mc_orders') || '[]');
  const order = DB.orders.find(o => o.id === orderId);
  if(!order) return;
  order.status = 'accepted';
  order.waiterId = currentWaiter.id;
  order.acceptedAt = new Date().toISOString();
  // Stol band qilish
  DB.setTableStatus(order.tableId, 'busy');
  DB.save('orders');
  printKitchenTickets(order, order.items);
  // Update waiter served count
  DB.waiters = JSON.parse(localStorage.getItem('mc_waiters') || '[]');
  const w = DB.waiters.find(x => x.id === currentWaiter.id);
  if(w) { w.servedToday = (w.servedToday || 0) + 1; DB.save('waiters'); }
  loadOrders();
  showToast(`Buyurtma qabul qilindi va chek chiqarildi`);
}

// Telegram aloqasi
const BOT_TOKEN = "7684216714:AAHZKjfT4_v0WzCE_qlilRfBfhTC0iFP7wU";

function sendTelegramMessage(chatId, text) {
  if(!chatId) return;
  fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text })
  }).catch(e => console.warn('TG xato:', e));
}

function confirmDeliveryPayment(orderId) {
  DB.orders = JSON.parse(localStorage.getItem('mc_orders') || '[]');
  const order = DB.orders.find(o => o.id === orderId);
  if(!order) return;
  if(order.customerInfo && order.customerInfo.tgId) {
    sendTelegramMessage(order.customerInfo.tgId, "✅ To'lov muvaffaqiyatli qabul qilindi! Buyurtmangiz tayyorlanmoqda.");
    showToast("Mijozga tasdiq xabari yuborildi!");
  }
}

// itemsToPrint - faqat chiqarish kerak bo'lgan taomlar (yangi qo'shilganlar yoki barcha)
function printKitchenTickets(order, itemsToPrint) {
  if(!itemsToPrint || !itemsToPrint.length) return;
  // Read IPs and bindings
  const ips = JSON.parse(localStorage.getItem('mc_printer_ips') || '{}');
  const binds = JSON.parse(localStorage.getItem('mc_printer_binds') || '{"milliy":[],"kabob":[],"baliq":[]}');
  
  // Find which items go to which printer:
  // 1. Agar taom o'zining printerTarget'i bo'lsa (taom qo'shishda tanlangan) — shu printer'ga
  // 2. Aks holda — kategoriya bo'ylab bindings'dan topish
  const printerGroups = { kassa: [], milliy: [], kabob: [], baliq: [], unbound: [] };

  itemsToPrint.forEach(item => {
    // service_fee va shunga o'xshash texnik yozuvlarni o'tkazib yuborish
    if(!item.menuItemId || item.categoryId === 'service') return;
    
    // Menyu to'liq ma'lumotlarini topamiz (printerTarget bilishi uchun)
    DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
    const menuItem = DB.menuItems.find(m => String(m.id) === String(item.menuItemId));
    
    let boundTo = null;
    if(menuItem && menuItem.printerTarget) {
      // Taom qo'shganda direct printer tanlangan
      boundTo = menuItem.printerTarget;
    } else {
      // Kategoriya object'ining printerTarget'ini tekshiramiz
      DB.categories = JSON.parse(localStorage.getItem('mc_categories') || '[]');
      const cat = DB.categories.find(c => c.id === item.categoryId);
      if(cat && cat.printerTarget) {
        boundTo = cat.printerTarget;
      } else {
        // Legacy: eski bindings'dan qidirash
        ['milliy', 'kabob', 'baliq'].forEach(ptype => {
          if(binds[ptype] && binds[ptype].includes(String(item.categoryId))) boundTo = ptype;
        });
      }
    }
    
    if(boundTo) printerGroups[boundTo].push(item);
    else printerGroups.unbound.push(item);
  });

  const ptypeLabels = { kassa: 'Kassa', milliy: 'Milliy Taomlar', kabob: 'Kabobxona', baliq: 'Baliqxona' };

  // Print to each printer
  ['kassa', 'milliy', 'kabob', 'baliq'].forEach(ptype => {
    if(!printerGroups[ptype].length) return;
    const ip = ips[ptype];
    if(!ip) {
      console.warn(`[KITCHEN PRINTER: ${ptype}] IP sozlanmagan!`);
      showToast(`⚠️ ${ptypeLabels[ptype]} printer IP sozlanmagan!`);
      return;
    }
    // XPrinter uchun oshxona cheki
    const now = new Date();
    const timeStr = now.toLocaleTimeString('uz-UZ', {hour:'2-digit', minute:'2-digit'});
    const lines = [
      `*** ${ptypeLabels[ptype].toUpperCase()} ***`,
      `Stol: ${order.tableName}`,
      `Vaqt: ${timeStr}`,
      `Ofisant: ${currentWaiter ? (currentWaiter.name + ' ' + (currentWaiter.surname||'')) : ''}`,
      '--------------------------------',
      ...printerGroups[ptype].map(i => `${i.name.padEnd(20,' ')} x${i.qty}`),
      '--------------------------------'
    ];
    const printData = { text: lines.join('\n') };
    console.log(`[PRINT → ${ptypeLabels[ptype].toUpperCase()} PRINTER ${ip}]`, printData.text);
    fetch(`http://${ip}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(printData)
    }).catch(e => {
      console.warn(`[PRINTER ${ptype}] Ulanish xatosi:`, e.message);
      showToast(`⚠️ ${ptypeLabels[ptype]} printerga ulanib bo'lmadi!`);
    });
  });

  if(printerGroups.unbound.length > 0) {
    console.warn('[KITCHEN PRINTER] Bog\'lanmagan kategoriyali taomlar:', printerGroups.unbound.map(i=>i.name));
  }
}

// Kassa printerga to'lov chekini yuborish
function printReceiptToKassa(chk) {
  const ips = JSON.parse(localStorage.getItem('mc_printer_ips') || '{}');
  const ip = ips['kassa'];
  if(!ip) {
    console.warn('[KASSA PRINTER] IP sozlanmagan!');
    showToast('⚠️ Kassa printer IP sozlanmagan!');
    return;
  }
  const now = new Date();
  const dateStr = now.toLocaleDateString('uz-UZ');
  const timeStr = now.toLocaleTimeString('uz-UZ', {hour:'2-digit', minute:'2-digit'});
  const lines = [
    'MINGCHINOR KOMPLEKS',
    '================================',
    `Stol   : ${chk.tableName || '-'}`,
    `Sana   : ${dateStr} ${timeStr}`,
    `Ofisant: ${chk.waiterName || '-'}`,
    `Mehmon : ${chk.guestCount || 1} kishi`,
    '--------------------------------',
    'T/r  Nomi              Miqdor Pul',
    '--------------------------------',
    ...(chk.items || []).map((item, idx) => {
      const name = String(item.name || '-').slice(0, 16).padEnd(16, ' ');
      const qty  = String(item.qty || 1).padStart(4, ' ');
      const amt  = String(formatPrice((item.qty||1) * (item.price||0))).padStart(8, ' ');
      return `${String(idx+1).padEnd(3,' ')}  ${name} ${qty} ${amt}`;
    }),
    '--------------------------------',
    `JAMI: ${formatPrice(chk.totalPrice || 0)} so'm`,
    '================================',
    '     Xush kelibsiz! Rahmat!     '
  ];
  const printData = { text: lines.join('\n') };
  console.log(`[PRINT → KASSA PRINTER ${ip}]`, printData.text);
  fetch(`http://${ip}/print`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(printData)
  }).catch(e => {
    console.warn('[KASSA PRINTER] Ulanish xatosi:', e.message);
    showToast('⚠️ Kassa printerga ulanib bo\'lmadi!');
  });
}

function sendToKassa(orderId) {
  DB.orders = JSON.parse(localStorage.getItem('mc_orders') || '[]');
  const order = DB.orders.find(o => o.id === orderId);
  if(!order) return;
  const feePerGuest = parseInt(localStorage.getItem('mc_service_fee')) || 0;
  const items = [...order.items];
  let totalPrice = order.totalPrice || 0;
  
  if (feePerGuest > 0) {
    items.push({
      menuItemId: 'service_fee',
      name: 'Xizmat haqi',
      qty: order.guestCount || 1,
      price: feePerGuest,
      categoryId: 'service'
    });
    totalPrice += (order.guestCount || 1) * feePerGuest;
  }

  // Create check
  const check = DB.addCheck({
    orderId: order.id,
    tableId: order.tableId,
    tableName: order.tableName,
    guestCount: order.guestCount,
    waiterId: currentWaiter.id,
    waiterName: currentWaiter.name + ' ' + currentWaiter.surname,
    items: items,
    totalPrice: totalPrice,
    status: 'active'
  });
  // Mark order done
  order.status = 'done';
  DB.save('orders');
  // Stol endi kassa orqali bo'shatiladi
  DB.broadcast('check_ready', check);
  loadOrders();
  switchTab('checks');
  showToast('Chek yaratildi');
}

// ---- ADD ITEM PANEL ----
// Yangi qo'shilgan taomlarni kuzatish uchun
let _addItemOriginalQtys = {}; // { menuItemId: qty } — panel ochilgandagi holat

function openAddItem(orderId) {
  DB.orders = JSON.parse(localStorage.getItem('mc_orders') || '[]');
  DB.checks = JSON.parse(localStorage.getItem('mc_checks') || '[]');
  const order = DB.orders.find(o => o.id == orderId);
  if(!order) return;

  // Bu buyurtmaga tegishli chekni topish
  let chk = DB.checks.find(c => c.orderId == orderId);

  if(chk) {
    // Chek kassaga yuborilgan yoki tolangan bolsa — bloklash
    if(chk.status === 'kassa' || chk.status === 'paid') {
      showToast('Bu chek kassaga yuborilgan — taom qoshib bolmaydi');
      return;
    }
    // Checks tabiga otib, osha chekni ochish
    switchTab('checks');
    setTimeout(() => openAddItemToCheck(chk.id), 150);
  } else {
    // Chek hali yaratilmagan — avval chek yaratamiz (active), keyin ochamiz
    const feePerGuest = parseInt(localStorage.getItem('mc_service_fee')) || 0;
    const items = JSON.parse(JSON.stringify(order.items || []));
    let totalPrice = order.totalPrice || 0;
    
    if (feePerGuest > 0) {
      items.push({
        menuItemId: 'service_fee',
        name: 'Xizmat haqi',
        qty: order.guestCount || 1,
        price: feePerGuest,
        categoryId: 'service'
      });
      totalPrice += (order.guestCount || 1) * feePerGuest;
    }

    const newCheck = DB.addCheck({
      orderId: order.id,
      tableId: order.tableId,
      tableName: order.tableName,
      guestCount: order.guestCount,
      waiterId: currentWaiter.id,
      waiterName: currentWaiter.name + ' ' + currentWaiter.surname,
      items: items,
      totalPrice: totalPrice,
      status: 'active'
    });
    switchTab('checks');
    setTimeout(() => {
      openAddItemToCheck(newCheck.id);
      showToast("Chek yaratildi, taom qo'shing");
    }, 150);
  }
}

function filterAddMenu(catId, btn) {
  document.querySelectorAll('#addItemCats .cat-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentCatId = catId;
  renderMenuGrid('addItemGrid');
}

function renderAddItemGrid(catId) {
  DB.orders = JSON.parse(localStorage.getItem('mc_orders') || '[]');
  const order = DB.orders.find(o => o.id == addItemTargetOrderId);
  if(order && !Array.isArray(order.items)) order.items = [];

  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
  let items = DB.menuItems.filter(m => !m.deleted && !m.unavailable);
  if(catId !== 'all') items = items.filter(m => m.categoryId == catId);
  items.sort((a,b) => (a.order || 0) - (b.order || 0));
  const grid = document.getElementById('addItemGrid');
  grid.innerHTML = '';
  items.forEach(item => {
    const existing = order ? order.items.find(i => i.menuItemId == item.id) : null;
    const qty = existing ? existing.qty : 0;

    const card = document.createElement('div');
    card.className = 'add-item-card';
    card.id = `aic-${item.id}`;
    const imgEl = `<div class="aic-placeholder">🍽️</div>`;
    card.innerHTML = `
      ${imgEl}
      <div class="aic-body">
        <div class="aic-name">${item.name}</div>
        <div class="aic-price">${formatPrice(item.sellPrice)} so'm</div>
        <div class="aic-ctrl">
          <button class="aic-btn" onclick="updateInstantOrder('${item.id}', -1)">−</button>
          <span class="aic-num" id="aic-num-${item.id}">${qty}</span>
          <button class="aic-btn" onclick="updateInstantOrder('${item.id}', 1)">+</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function updateInstantOrder(itemId, delta) {
  DB.orders = JSON.parse(localStorage.getItem('mc_orders') || '[]');
  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
  const order = DB.orders.find(o => o.id == addItemTargetOrderId);
  const item = DB.menuItems.find(m => m.id == itemId);
  if(!order || !item) return;
  if(!Array.isArray(order.items)) order.items = [];
  
  let existing = order.items.find(i => i.menuItemId == itemId);
  if(!existing && delta > 0) {
    existing = { menuItemId: itemId, name: item.name, qty: 0, price: item.sellPrice, categoryId: item.categoryId };
    order.items.push(existing);
  }
  
  if(existing) {
    existing.qty += delta;
    if(existing.qty <= 0) {
      order.items = order.items.filter(i => i.menuItemId != itemId);
    }
  }
  
  order.totalPrice = order.items.reduce((s,i) => s + i.price * i.qty, 0);
  DB.save('orders');
  loadOrders();
  
  const newQty = existing && existing.qty > 0 ? existing.qty : 0;
  const numEl = document.getElementById(`aic-num-${itemId}`);
  if(numEl) numEl.textContent = newQty;

  if(delta > 0) showToast(item.name + " qo'shildi");
  else if(delta < 0) showToast(item.name + " olingan");
}

function closeAddItemPanel() {
  // Yangi qo'shilgan taomlarni aniqlash va printerga yuborish
  if(addItemTargetOrderId) {
    DB.orders = JSON.parse(localStorage.getItem('mc_orders') || '[]');
    const order = DB.orders.find(o => o.id == addItemTargetOrderId);
    if(order && Array.isArray(order.items)) {
      const newItems = [];
      order.items.forEach(item => {
        if(!item.menuItemId || item.categoryId === 'service') return;
        const origQty = _addItemOriginalQtys[item.menuItemId] || 0;
        const addedQty = item.qty - origQty;
        if(addedQty > 0) {
          newItems.push({ ...item, qty: addedQty });
        }
      });
      if(newItems.length > 0) {
        printKitchenTickets(order, newItems);
        showToast(`${newItems.length} ta yangi taom printerga yuborildi`);
      }
    }
  }
  _addItemOriginalQtys = {};
  document.getElementById('addItemPanel').style.display = 'none';
}

// ---- CHECKS ----
function loadChecks() {
  DB.checks = JSON.parse(localStorage.getItem('mc_checks') || '[]');
  
  // Oxirgi 7 kunni hisoblash
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Faqat shu ofisantniki va oxirgi 7 kunlik cheklar
  const myChecks = DB.checks.filter(c => {
    if(c.waiterId !== currentWaiter.id) return false;
    const cDate = new Date(c.createdAt);
    return cDate >= sevenDaysAgo;
  });

  // Sana bo'yicha kamayish tartibida saralash (eng yangisi tepada)
  myChecks.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  const list = document.getElementById('checksList');
  if(!myChecks.length) {
    list.innerHTML = `<div class="empty-state"><span>🧾</span><p>Cheklar yo'q</p></div>`;
    document.getElementById('checksFooter').innerHTML = '';
    return;
  }
  list.innerHTML = '';
  let totalGuests = 0;
  let totalServiceFee = 0;
  const feePerGuest = parseInt(localStorage.getItem('mc_service_fee')) || 0;

  myChecks.forEach(chk => {
    if(chk.status !== 'paid') totalGuests += chk.guestCount || 1;
    totalServiceFee += (chk.guestCount || 1) * feePerGuest;
    list.appendChild(buildCheckCard(chk));
  });
  document.getElementById('checksFooter').innerHTML = `
    <div class="cf-stat"><div class="cf-stat-val">${myChecks.length}</div><div class="cf-stat-label">Jami chek</div></div>
    <div class="cf-stat"><div class="cf-stat-val">${totalGuests}</div><div class="cf-stat-label">Faol mehmon</div></div>
    <div class="cf-stat"><div class="cf-stat-val">${formatPrice(totalServiceFee)}</div><div class="cf-stat-label">Daromad (Xizmat)</div></div>
  `;
}

function buildCheckCard(chk) {
  const div = document.createElement('div');
  div.className = 'check-card';
  const ts = new Date(chk.createdAt);
  const tsStr = ts.toLocaleDateString('uz-UZ') + ' ' + ts.toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'});
  
  let actionsHtml = '';
  let statusBadge = '';

  if(chk.status === 'active') {
    statusBadge = '<span class="status-badge" style="color:var(--text); font-size:12px; font-weight:700;">Faol</span>';
    actionsHtml = `
      <button class="btn-add-to-check-direct" onclick="openZakazForTable(${chk.tableId})">➕ Taom qo'shish</button>
      <button class="btn-edit" onclick="openCheckEdit(${chk.id})">✏️ Tahrirlash</button>
      <button class="btn-to-kassa" onclick="sendCheckToKassaAction(${chk.id})">Kassaga →</button>
    `;
  } else if(chk.status === 'kassa') {
    statusBadge = '<span class="status-badge" style="color:var(--warn); font-size:12px; font-weight:700;">Kutilmoqda 🕒</span>';
  } else if(chk.status === 'paid') {
    statusBadge = '<span class="status-badge" style="color:var(--accent); font-size:12px; font-weight:700;">To\'langan ✓</span>';
  }

  div.innerHTML = `
    <div class="check-card-head">
      <div class="check-head-left">
        <h3>📍 ${chk.tableName} ${statusBadge}</h3>
        <p>${tsStr} · ${chk.guestCount} kishi</p>
      </div>
      <div class="check-actions">
        ${actionsHtml}
      </div>
    </div>
    <div class="check-items">
      ${chk.items.map(item => `
        <div class="check-item-row">
          <span>${item.name}</span>
          <span>${item.qty}x${formatPrice(item.price)} = ${formatPrice(item.qty*item.price)} so'm</span>
        </div>
      `).join('')}
    </div>
    <div class="check-footer">
      <span class="check-guests">${chk.guestCount} kishi</span>
      <span class="check-total">${formatPrice(chk.totalPrice)} so'm</span>
    </div>
  `;
  return div;
}

function openCheckEdit(checkId) {
  DB.checks = JSON.parse(localStorage.getItem('mc_checks') || '[]');
  const chk = DB.checks.find(c => c.id === checkId);
  if(!chk) return;
  if(chk.status === 'kassa' || chk.status === 'paid') {
    showToast("Bu chek kassaga yuborilgan — tahrirlash mumkin emas");
    return;
  }
  editingCheckId = checkId;
  editingCheckTableId = chk.tableId;
  editingCheckItems = JSON.parse(JSON.stringify(chk.items || []));
  document.getElementById('checkEditTitle').textContent = `${chk.tableName} – Chekni tahrirlash`;
  renderCheckEditItems();
  document.getElementById('checkEditModal').classList.add('active');
}

// ============================================================
// TO'G'RIDAN-TO'G'RI CHEKKA TAOM QO'SHISH (DIRECT CART)
// Xuddi Zakaz tabidagi kabi — toza savatcha bilan ishlaydi
// ============================================================
let _directCheckId = null;  // Qaysi check ga qo'shilmoqda
let _directCart    = {};    // { menuItemId: qty } — yangi taomlar
let _directCatId   = 'all';

function openAddItemToCheck(checkId) {
  DB.checks = JSON.parse(localStorage.getItem('mc_checks') || '[]');
  const chk = DB.checks.find(c => c.id === checkId);
  if(!chk) return;
  if(chk.status === 'kassa' || chk.status === 'paid') {
    showToast("Bu chek kassaga yuborilgan — taom qoshib bolmaydi");
    return;
  }

  _directCheckId = checkId;
  _directCart    = {};
  _directCatId   = 'all';

  // Panel sarlavhasi
  const titleEl = document.getElementById('atcPanelTitle');
  if(titleEl) titleEl.textContent = `${chk.tableName} – Taom qo’shish`;

  // Kategoriyalar
  DB.categories = JSON.parse(localStorage.getItem('mc_categories') || '[]');
  const catsEl = document.getElementById('atcCats');
  catsEl.innerHTML = `<button class="cat-filter-btn active" onclick="filterDirectCheck('all',this)">Barchasi</button>`;
  DB.categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-filter-btn';
    btn.textContent = cat.name;
    btn.onclick = () => filterDirectCheck(cat.id, btn);
    catsEl.appendChild(btn);
  });

  // Footer tugmalarini to'g'ri sozlash
  const footerEl = document.getElementById('atcFooter');
  if(footerEl) {
    footerEl.innerHTML = `
      <button class="btn-back" onclick="cancelDirectCheckAdd()">✕ Bekor</button>
      <button class="btn-confirm" style="flex:2" onclick="saveDirectCheckItems()">✅ Saqlash va chiqarish</button>
    `;
  }

  renderDirectCheckGrid();
  document.getElementById('addToCheckPanel').style.display = 'flex';
}

function filterDirectCheck(catId, btn) {
  document.querySelectorAll('#atcCats .cat-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  _directCatId = catId;
  renderDirectCheckGrid();
}

function renderDirectCheckGrid() {
  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
  let items = DB.menuItems.filter(m => !m.deleted && !m.unavailable);
  if(_directCatId !== 'all') items = items.filter(m => m.categoryId == _directCatId);
  items.sort((a,b) => (a.order || 0) - (b.order || 0));

  const grid = document.getElementById('atcGrid');
  grid.innerHTML = '';
  if(!items.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><span>🍽️</span><p>Taomlar yo\'q</p></div>';
    return;
  }
  items.forEach(item => {
    const qty = _directCart[item.id] || 0;
    const card = document.createElement('div');
    card.className = 'add-item-card';
    card.id = `dcard-${item.id}`;
    const imgEl = item.image
      ? `<img src="${item.image}" alt="${item.name}" style="width:100%;aspect-ratio:1/1;object-fit:cover">`
      : `<div class="aic-placeholder">🍽️</div>`;
    card.innerHTML = `
      ${imgEl}
      <div class="aic-body">
        <div class="aic-name">${item.name}</div>
        <div class="aic-price">${formatPrice(item.sellPrice)} so'm</div>
        <div class="aic-ctrl">
          <button class="aic-btn" onclick="updateDirectCart('${item.id}',-1)">&#8722;</button>
          <span class="aic-num" id="dnum-${item.id}">${qty}</span>
          <button class="aic-btn" onclick="updateDirectCart('${item.id}',1)">+</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function updateDirectCart(itemId, delta) {
  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
  const item = DB.menuItems.find(m => m.id == itemId);
  if(!item) return;
  _directCart[itemId] = Math.max(0, (_directCart[itemId] || 0) + delta);
  if(_directCart[itemId] === 0) delete _directCart[itemId];
  const numEl = document.getElementById(`dnum-${itemId}`);
  if(numEl) numEl.textContent = _directCart[itemId] || 0;
  if(delta > 0) showToast(item.name + " qo'shildi");
}

function saveDirectCheckItems() {
  if(!_directCheckId) return;
  DB.checks   = JSON.parse(localStorage.getItem('mc_checks') || '[]');
  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu')  || '[]');
  const chk = DB.checks.find(c => c.id === _directCheckId);
  if(!chk) return;

  const entries = Object.entries(_directCart);
  if(!entries.length) {
    showToast('Hech narsa tanlanmadi');
    return;
  }

  const newItems = [];
  entries.forEach(([itemId, qty]) => {
    if(qty <= 0) return;
    const menuItem = DB.menuItems.find(m => m.id == itemId);
    if(!menuItem) return;
    // Mavjud itemga qo'shish yoki yangi yaratish
    const existing = chk.items.find(i => String(i.menuItemId) === String(itemId));
    if(existing) {
      existing.qty += qty;
    } else {
      chk.items.push({
        menuItemId: parseInt(itemId),
        name: menuItem.name,
        qty,
        price: menuItem.sellPrice,
        categoryId: menuItem.categoryId
      });
    }
    newItems.push({
      menuItemId: parseInt(itemId),
      name: menuItem.name, qty,
      price: menuItem.sellPrice,
      categoryId: menuItem.categoryId
    });
  });

  chk.totalPrice = chk.items.reduce((s,i) => s + i.qty * i.price, 0);
  DB.save('checks');

  // Buyurtmaga ham yangilash (agar orderId bog'liq bo'lsa)
  if(chk.orderId) {
    DB.orders = JSON.parse(localStorage.getItem('mc_orders') || '[]');
    const linkedOrder = DB.orders.find(o => o.id == chk.orderId);
    if(linkedOrder) {
      newItems.forEach(ni => {
        const existing = linkedOrder.items.find(i => String(i.menuItemId) === String(ni.menuItemId));
        if(existing) {
          existing.qty += ni.qty;
        } else {
          linkedOrder.items.push({ ...ni });
        }
      });
      linkedOrder.totalPrice = linkedOrder.items.reduce((s,i) => s + i.qty * i.price, 0);
      DB.save('orders');
    }
  }

  printKitchenTickets(chk, newItems);
  showToast(`✅ ${newItems.length} ta taom qo'shildi va chiqarildi`);

  _directCart = {}; _directCheckId = null;
  document.getElementById('addToCheckPanel').style.display = 'none';
  loadChecks();
}

function cancelDirectCheckAdd() {
  _directCart = {}; _directCheckId = null;
  document.getElementById('addToCheckPanel').style.display = 'none';
}

function renderCheckEditItems() {
  const el = document.getElementById('checkEditItems');
  el.innerHTML = editingCheckItems.filter(i => !i._removed).map((item, idx) => `
    <div class="check-edit-item">
      <div class="cei-left">
        <div class="cei-qty-ctrl">
          <button class="cei-qty-btn" onclick="changeCheckItemQty(${idx},-1)">−</button>
          <span class="cei-num">${item.qty}</span>
          <button class="cei-qty-btn" onclick="changeCheckItemQty(${idx},1)">+</button>
        </div>
        <span class="cei-name">${item.name}</span>
      </div>
      <div class="cei-right">
        <span class="cei-price">${formatPrice(item.qty*item.price)} so'm</span>
        <button class="btn-remove-item" onclick="removeCheckItem(${idx})">✕</button>
      </div>
    </div>
  `).join('');
  // Jami narxni ko'rsatish
  const total = editingCheckItems.filter(i => !i._removed).reduce((s,i) => s + i.qty*i.price, 0);
  el.innerHTML += `<div class="check-edit-total">Jami: <strong>${formatPrice(total)} so'm</strong></div>`;
}

function changeCheckItemQty(idx, delta) {
  const realIdx = editingCheckItems.filter((i,ri) => !i._removed).findIndex((_,fi) => fi === idx);
  // Find actual index in editingCheckItems (skipping removed)
  let count = 0;
  for(let i = 0; i < editingCheckItems.length; i++) {
    if(!editingCheckItems[i]._removed) {
      if(count === idx) {
        editingCheckItems[i].qty = Math.max(1, editingCheckItems[i].qty + delta);
        break;
      }
      count++;
    }
  }
  renderCheckEditItems();
}

function removeCheckItem(idx) {
  let count = 0;
  for(let i = 0; i < editingCheckItems.length; i++) {
    if(!editingCheckItems[i]._removed) {
      if(count === idx) {
        editingCheckItems[i]._removed = true;
        break;
      }
      count++;
    }
  }
  renderCheckEditItems();
}

// ---- CHEKGA TAOM QO'SHISH ----
let addToCheckCart = {};

// Chek tahrirlashda qo'shilgan yangi taomlarni kuzatish
let _addToCheckOriginalQtys = {};

function openAddToCheckPanel() {
  addToCheckCart = {};
  DB.categories = JSON.parse(localStorage.getItem('mc_categories') || '[]');
  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');

  // Panel sarlavhasi
  DB.checks = JSON.parse(localStorage.getItem('mc_checks') || '[]');
  const _panelChk = DB.checks.find(c => c.id === editingCheckId);
  const _panelTitle = document.getElementById('atcPanelTitle');
  if(_panelTitle) {
    _panelTitle.textContent = _panelChk
      ? `${_panelChk.tableName} \u2013 Taom qo\u2019shish`
      : `Chekka taom qo\u2019shish`;
  }

  // Footer — check edit modal rejimdagi tugmalar
  const footerEl = document.getElementById('atcFooter');
  if(footerEl) {
    footerEl.innerHTML = `<button class="btn-back" onclick="closeAddToCheckPanel()">\u2b05 Orqaga</button>`;
  }

  // Avvalgi chekdagi taomlar qty ni eslab qolish
  _addToCheckOriginalQtys = {};
  editingCheckItems.forEach(i => {
    if(i.menuItemId && !i._removed) _addToCheckOriginalQtys[i.menuItemId] = i.qty;
  });

  const catsEl = document.getElementById('atcCats');
  catsEl.innerHTML = `<button class="cat-filter-btn active" onclick="filterAddToCheck('all', this)">Barchasi</button>`;
  DB.categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-filter-btn';
    btn.textContent = cat.name;
    btn.onclick = () => filterAddToCheck(cat.id, btn);
    catsEl.appendChild(btn);
  });

  renderAddToCheckGrid('all');
  document.getElementById('addToCheckPanel').style.display = 'flex';
}

function filterAddToCheck(catId, btn) {
  document.querySelectorAll('#atcCats .cat-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderAddToCheckGrid(catId);
}

function renderAddToCheckGrid(catId) {
  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
  let items = DB.menuItems.filter(m => !m.deleted && !m.unavailable);
  if(catId !== 'all') items = items.filter(m => m.categoryId == catId);
  items.sort((a,b) => (a.order || 0) - (b.order || 0));
  const grid = document.getElementById('atcGrid');
  grid.innerHTML = '';
  items.forEach(item => {
    const existing = editingCheckItems.find(i => i.menuItemId == item.id && !i._removed);
    const qty = existing ? existing.qty : 0;

    const card = document.createElement('div');
    card.className = 'add-item-card';
    card.id = `atc-${item.id}`;
    const imgEl = `<div class="aic-placeholder">🍽️</div>`;
    card.innerHTML = `
      ${imgEl}
      <div class="aic-body">
        <div class="aic-name">${item.name}</div>
        <div class="aic-price">${formatPrice(item.sellPrice)} so'm</div>
        <div class="aic-ctrl">
          <button class="aic-btn" onclick="updateInstantCheck('${item.id}', -1)">−</button>
          <span class="aic-num" id="atc-num-${item.id}">${qty}</span>
          <button class="aic-btn" onclick="updateInstantCheck('${item.id}', 1)">+</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function updateInstantCheck(itemId, delta) {
  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
  const item = DB.menuItems.find(m => m.id == itemId);
  if(!item) return;
  
  let existing = editingCheckItems.find(i => i.menuItemId == itemId && !i._removed);
  if(!existing && delta > 0) {
    existing = { menuItemId: itemId, name: item.name, qty: 0, price: item.sellPrice, categoryId: item.categoryId };
    editingCheckItems.push(existing);
  }
  
  if(existing) {
    existing.qty += delta;
    if(existing.qty <= 0) {
      existing._removed = true;
    }
  }
  
  renderCheckEditItems();
  
  const newQty = existing && !existing._removed ? existing.qty : 0;
  const numEl = document.getElementById(`atc-num-${itemId}`);
  if(numEl) numEl.textContent = newQty;

  if(delta > 0) showToast(item.name + " qo'shildi");
  else if(delta < 0) showToast(item.name + " olingan");
}

function closeAddToCheckPanel() {
  // editingCheckItems ni DBga saqlash (har doim — yangi qo'shilgan bo'lsa)
  if(editingCheckId) {
    DB.checks = JSON.parse(localStorage.getItem('mc_checks') || '[]');
    const chk = DB.checks.find(c => c.id === editingCheckId);
    if(chk) {
      // Yangi qo'shilgan taomlarni aniqlash (printer uchun)
      const newItems = [];
      editingCheckItems.forEach(item => {
        if(!item.menuItemId || item._removed || item.categoryId === 'service') return;
        const origQty = _addToCheckOriginalQtys[item.menuItemId] || 0;
        const addedQty = item.qty - origQty;
        if(addedQty > 0) newItems.push({ ...item, qty: addedQty });
      });
      // Chekni yangilash va saqlash
      chk.items = editingCheckItems.filter(i => !i._removed);
      chk.totalPrice = chk.items.reduce((s,i) => s + i.qty*i.price, 0);
      DB.save('checks');
      // Yangi taomlarni printerga yuborish
      if(newItems.length > 0) {
        printKitchenTickets(chk, newItems);
        showToast(`\u2705 ${newItems.length} ta yangi taom qo'shildi va chiqarildi`);
      } else {
        showToast('Chek yangilandi');
      }
      loadChecks();
    }
  }
  _addToCheckOriginalQtys = {};
  document.getElementById('addToCheckPanel').style.display = 'none';
}

function saveCheckEdit() {
  DB.checks = JSON.parse(localStorage.getItem('mc_checks') || '[]');
  const chk = DB.checks.find(c => c.id === editingCheckId);
  if(!chk) return;
  chk.items = editingCheckItems.filter(i => !i._removed);
  chk.totalPrice = chk.items.reduce((s,i) => s + i.qty*i.price, 0);
  DB.save('checks');
  closeCheckEdit();
  loadChecks();
  showToast('Chek saqlandi');
}

function sendCheckToKassaAction(checkId) {
  DB.checks = JSON.parse(localStorage.getItem('mc_checks') || '[]');
  const chk = DB.checks.find(c => c.id === checkId);
  if(!chk) return;
  chk.status = 'kassa';
  DB.save('checks');
  DB.broadcast('check_ready', chk); // kassa update bo'lishi uchun
  // Kassa printerga chek yuborish
  printReceiptToKassa(chk);
  loadChecks();
  showToast('Kassaga yuborildi va chek chiqarildi 🖨️');
}

function sendCheckToKassa() {
  saveCheckEdit();
  sendCheckToKassaAction(editingCheckId);
}

function closeCheckEdit() {
  document.getElementById('checkEditModal').classList.remove('active');
}

// ---- PRINT (legacy alias — printReceiptToKassa ga yo'naltiradi) ----
function simulatePrint(type, data) {
  // Eski kod mosligini saqlash uchun
  const chk = (typeof type === 'object') ? type : data;
  if(chk) printReceiptToKassa(chk);
}

// ---- REALTIME ----
function setupRealtime() {
  // Firestore real-time (boshqa qurilmalar)
  window.addEventListener('mc:new_order', e => {
    const order = e.detail;
    if(order && order.tableId === 'delivery' && order.customerInfo && order.customerInfo.tgId) {
      const c = order.customerInfo;
      let msg = `✅ Buyurtmangiz qabul qilindi!\n\nJami: ${formatPrice(order.totalPrice)} so'm\n`;
      if(c.paymentMethod === 'naqd') {
        msg += `To'lov turi: Naqd pul.\nTez orada yetkazib beramiz!`;
      } else {
        msg += `To'lov turi: Plastik karta.\nIltimos, ushbu karta raqamiga to'lov qiling:\n\n💳 8600 1234 5678 9012 (Karta egasi ismi)\n\nTo'lovni amalga oshirgach, biz tasdiqlaymiz va buyurtma yo'lga chiqadi.`;
      }
      sendTelegramMessage(c.tgId, msg);
    }
  });

  window.addEventListener('mc:data_changed', e => {
    const { key } = e.detail;
    if(!currentWaiter || document.getElementById('mainPanel').style.display === 'none') return;
    if(key === 'orders') {
      playBeep();
      loadOrders();
      const pending = DB.orders.filter(o => o.status === 'pending' && !o.waiterId).length;
      const badge = document.getElementById('ordersBadge');
      if(badge){ badge.textContent = pending; badge.style.display = pending>0?'flex':'none'; }
    }
    if(key === 'waiterCalls') {
      playBeep(2);
      loadCalls();
    }
    if(key === 'waiters') {
      // Boshqa qurilma shu hisobni egallab olganini tekshiramiz
      DB.waiters = JSON.parse(localStorage.getItem('mc_waiters') || '[]');
      const w = DB.waiters.find(x => x.id === currentWaiter.id);
      if(w && w.activeDeviceId && w.activeDeviceId !== getDeviceId()) {
        currentWaiter = null;
        localStorage.removeItem('mc_waiter_session');
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainPanel').style.display = 'none';
        showLoginError('Sizning hisobingiz boshqa qurilmada ochildi. Iltimos, qayta kiring.');
      }
    }
  });
  // localStorage real-time (bir xil qurilmadagi boshqa tablar)
  window.addEventListener('storage', e => {
    if(e.key === 'mc_event') {
      try {
        const ev = JSON.parse(e.newValue);
        if(ev.event === 'new_order') {
          DB.orders = JSON.parse(localStorage.getItem('mc_orders') || '[]');
          playBeep();
          loadOrders();
          const badge = document.getElementById('ordersBadge');
          const pending = DB.orders.filter(o => o.status === 'pending' && !o.waiterId).length;
          badge.textContent = pending;
          badge.style.display = pending > 0 ? 'flex' : 'none';
        }
        if(ev.event === 'waiter_call') {
          DB.waiterCalls = JSON.parse(localStorage.getItem('mc_waiter_calls') || '[]');
          playBeep(2);
          loadCalls();
        }
      } catch(err){}
    }
  });
  setInterval(() => {
    if(document.getElementById('mainPanel').style.display !== 'none') {
      DB.orders = JSON.parse(localStorage.getItem('mc_orders') || '[]');
      DB.waiterCalls = JSON.parse(localStorage.getItem('mc_waiter_calls') || '[]');
      const pendOrders = DB.orders.filter(o => o.status === 'pending' && !o.waiterId).length;
      const pendCalls = DB.waiterCalls.filter(c => c.status === 'pending').length;
      const ob = document.getElementById('ordersBadge');
      const cb = document.getElementById('callsBadge');
      if(ob){ ob.textContent = pendOrders; ob.style.display = pendOrders>0?'flex':'none'; }
      if(cb){ cb.textContent = pendCalls; cb.style.display = pendCalls>0?'flex':'none'; }
    }
  }, 3000);
}

function playBeep(times = 1) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if(!AudioContext) return;
    const ctx = new AudioContext();
    if(ctx.state === 'suspended') ctx.resume();

    const playTone = (freq, start, duration, vol) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); 
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    const playSequence = (delayOffset) => {
      // Balandroq va uzoqroq "Ding-Dong-Ding" musiqiy signali
      playTone(660, delayOffset + 0, 0.8, 0.8);   // E5
      playTone(523, delayOffset + 0.4, 0.8, 0.7); // C5
      playTone(660, delayOffset + 0.8, 1.2, 0.9); // E5
    };

    for(let i=0; i<times; i++) {
      playSequence(i * 2.0); // 2 soniya oraliq bilan
    }
  } catch(e){}
}

function openZakazForTable(tableId) {
  switchTab('zakaz');
  const sel = document.getElementById('zakazTableSelect');
  if(sel) {
    sel.value = tableId;
    onZakazTableChange();
  }
}

// ============================================================
// ZAKAZ TAB — Telefonsiz mijozlar uchun ofisant zakaz beradi
// ============================================================
function loadZakazTab() {
  zakazCart = {};
  zakazGuestCount = 1;
  zakazSelectedTable = null;
  zakazCurrentOrderId = null;
  zakazCurrentCheckId = null;
  document.getElementById('zakazGuestInput').value = 1;
  document.getElementById('zakazCartBar').style.display = 'none';
  _renderZakazTables();
  _renderZakazCats();
  currentCatId = 'all';
  currentAddFunc = 'updateZakazCart';
  renderMenuGrid('zakazMenuGrid');
}

function _renderZakazTables() {
  DB.tables = JSON.parse(localStorage.getItem('mc_tables') || '[]');
  const sel = document.getElementById('zakazTableSelect');
  const prevVal = sel.value;
  sel.innerHTML = '<option value="">– Stol tanlang –</option>';
  DB.tables.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = `${t.name} ${t.status === 'busy' ? '🔴 (Band)' : '🟢'}`;
    sel.appendChild(opt);
  });
  if(prevVal) sel.value = prevVal;
}

function onZakazTableChange() {
  const sel = document.getElementById('zakazTableSelect');
  const id = parseInt(sel.value);
  DB.tables = JSON.parse(localStorage.getItem('mc_tables') || '[]');
  zakazSelectedTable = DB.tables.find(t => t.id === id) || null;
  zakazCurrentOrderId = null;
  if(zakazSelectedTable) {
    _loadZakazForTable(zakazSelectedTable.id);
  } else {
    zakazCart = {};
    zakazGuestCount = 1;
    _renderZakazCartBar();
  }
  renderMenuGrid('zakazMenuGrid');
}

function _loadZakazForTable(tableId) {
  DB.orders = JSON.parse(localStorage.getItem('mc_orders') || '[]');
  DB.checks = JSON.parse(localStorage.getItem('mc_checks') || '[]');
  
  const activeCheck = DB.checks.find(c => c.tableId === tableId && c.status === 'active');
  if(activeCheck) {
    zakazCurrentCheckId = activeCheck.id;
    zakazCurrentOrderId = activeCheck.orderId;
    zakazGuestCount = activeCheck.guestCount || 1;
    zakazCart = {};
    (activeCheck.items || []).forEach(i => {
      if(i.menuItemId) zakazCart[i.menuItemId] = i.qty;
    });
  } else {
    zakazCurrentCheckId = null;
    const order = DB.orders.find(o => o.tableId === tableId && o.status !== 'done');
    if(order) {
      zakazCurrentOrderId = order.id;
      zakazGuestCount = order.guestCount || 1;
      zakazCart = {};
      (order.items || []).forEach(i => {
        if(i.menuItemId) zakazCart[i.menuItemId] = i.qty;
      });
    } else {
      zakazCurrentOrderId = null;
      zakazCart = {};
      zakazGuestCount = 1;
    }
  }
  document.getElementById('zakazGuestInput').value = zakazGuestCount;
  _renderZakazCartBar();
}

function changeZakazGuests(delta) {
  zakazGuestCount = Math.max(1, Math.min(20, zakazGuestCount + delta));
  document.getElementById('zakazGuestInput').value = zakazGuestCount;
}

function _renderZakazCats() {
  DB.categories = JSON.parse(localStorage.getItem('mc_categories') || '[]');
  const bar = document.getElementById('zakazCats');
  bar.innerHTML = '<button class="cat-filter-btn active" onclick="filterZakaz(\'all\', this)">Barchasi</button>';
  DB.categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-filter-btn';
    btn.textContent = cat.name;
    btn.onclick = () => filterZakaz(cat.id, btn);
    bar.appendChild(btn);
  });
}

function filterZakaz(catId, btn) {
  document.querySelectorAll('#zakazCats .cat-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentCatId = catId;
  renderMenuGrid('zakazMenuGrid');
}

function renderMenuGrid(containerId) {
  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
  if(containerId !== 'zakazMenuGrid') {
    DB.orders = JSON.parse(localStorage.getItem('mc_orders') || '[]');
  }
  let items = DB.menuItems.filter(m => !m.deleted && !m.unavailable);
  if(currentCatId !== 'all') items = items.filter(m => m.categoryId == currentCatId);
  const grid = document.getElementById(containerId);
  grid.innerHTML = '';
  if(!items.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><span>🍽️</span><p>Taomlar yo\'q</p></div>';
    return;
  }
  items.forEach(item => {
    let qty = 0;
    if(containerId === 'zakazMenuGrid') {
      qty = zakazCart[item.id] || 0;
    } else {
      const order = DB.orders.find(o => o.id == addItemTargetOrderId);
      if(order && Array.isArray(order.items)) {
        const existing = order.items.find(i => i.menuItemId == item.id);
        qty = existing ? existing.qty : 0;
      }
    }
    const card = document.createElement('div');
    card.className = 'add-item-card';
    card.id = containerId === 'zakazMenuGrid' ? `zcard-${item.id}` : `aic-${item.id}`;
    const imgEl = item.image ? `<img src="${item.image}" alt="${item.name}">` : `<div class="aic-placeholder">🍽️</div>`;
    const qtyId = containerId === 'zakazMenuGrid' ? `zqty-${item.id}` : `aic-num-${item.id}`;
    card.innerHTML = `
      ${imgEl}
      <div class="aic-body">
        <div class="aic-name">${item.name}</div>
        <div class="aic-price">${formatPrice(item.sellPrice)} so'm</div>
        <div class="aic-ctrl">
          <button class="aic-btn" onclick="${currentAddFunc}('${item.id}', -1)">−</button>
          <span class="aic-num" id="${qtyId}">${qty}</span>
          <button class="aic-btn" onclick="${currentAddFunc}('${item.id}', 1)">+</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function updateZakazCart(itemId, delta) {
  zakazCart[itemId] = Math.max(0, (zakazCart[itemId] || 0) + delta);
  if(zakazCart[itemId] === 0) delete zakazCart[itemId];
  const numEl = document.getElementById(`zqty-${itemId}`);
  if(numEl) numEl.textContent = zakazCart[itemId] || 0;
  _renderZakazCartBar();
}

function _renderZakazCartBar() {
  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
  const entries = Object.entries(zakazCart);
  const bar = document.getElementById('zakazCartBar');
  if(!entries.length) { bar.style.display = 'none'; return; }
  bar.style.display = 'block';

  const header = document.getElementById('zakazCartHeader');
  if(header) {
    if(zakazSelectedTable) {
      const typeStr = zakazCurrentCheckId ? `Chek #${zakazCurrentCheckId}` : (zakazCurrentOrderId ? `Buyurtma #${zakazCurrentOrderId}` : 'Yangi zakaz');
      header.innerHTML = `Stol: <strong>${zakazSelectedTable.name}</strong> · ${typeStr}`;
    } else {
      header.innerHTML = 'Stol tanlang';
    }
  }

  let total = 0;
  const itemsHtml = entries.map(([id, qty]) => {
    const item = DB.menuItems.find(m => m.id == id);
    if(!item) return '';
    total += item.sellPrice * qty;
    return `<div class="zakaz-cart-row">
      <span class="zcr-name">${item.name}</span>
      <span class="zcr-qty">x${qty}</span>
      <span class="zcr-price">${formatPrice(item.sellPrice * qty)}</span>
    </div>`;
  }).join('');

  document.getElementById('zakazCartItems').innerHTML = itemsHtml;
  document.getElementById('zakazTotalAmount').textContent = formatPrice(total) + ' so\'m';
}

function _buildZakazItems() {
  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
  return Object.entries(zakazCart).map(([id, qty]) => {
    const item = DB.menuItems.find(m => m.id == id);
    if(!item) return null;
    return { menuItemId: parseInt(id), name: item.name, qty, price: item.sellPrice, categoryId: item.categoryId };
  }).filter(x => x && x.qty > 0);
}

function _createOrUpdateZakazOrder({ broadcast = false } = {}) {
  if(!zakazSelectedTable) { showToast('Stol tanlang!'); return null; }
  const items = _buildZakazItems();
  if(!items.length) { showToast('Savat bo\'sh!'); return null; }

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  DB.orders = JSON.parse(localStorage.getItem('mc_orders') || '[]');
  DB.checks = JSON.parse(localStorage.getItem('mc_checks') || '[]');

  let targetObj = null;
  let prevItemMap = {};

  if(zakazCurrentCheckId) {
    const chk = DB.checks.find(c => c.id === zakazCurrentCheckId);
    if(chk) {
      targetObj = chk;
      (chk.items || []).forEach(i => { if(i.menuItemId) prevItemMap[i.menuItemId] = i.qty; });
      chk.items = items;
      chk.totalPrice = total;
      chk.guestCount = zakazGuestCount;
      DB.save('checks');

      if(chk.orderId) {
        const linkedOrder = DB.orders.find(o => o.id == chk.orderId);
        if(linkedOrder) {
          linkedOrder.items = items;
          linkedOrder.totalPrice = total;
          DB.save('orders');
        }
      }
    }
  } else if(zakazCurrentOrderId) {
    const order = DB.orders.find(o => o.id === zakazCurrentOrderId);
    if(order) {
      targetObj = order;
      (order.items || []).forEach(i => { if(i.menuItemId) prevItemMap[i.menuItemId] = i.qty; });
      order.items = items;
      order.totalPrice = total;
      order.guestCount = zakazGuestCount;
      order.note = `[Ofisant: ${currentWaiter.name}]`;
      order.waiterId = currentWaiter.id;
      order.status = 'accepted';
      order.acceptedAt = new Date().toISOString();
      DB.save('orders');
    }
  }

  if(!targetObj) {
    const order = DB.addOrder({
      tableId: zakazSelectedTable.id,
      tableName: zakazSelectedTable.name,
      guestCount: zakazGuestCount,
      items,
      note: `[Ofisant: ${currentWaiter.name}]`,
      lang: 'uz',
      totalPrice: total
    });
    order.waiterId = currentWaiter.id;
    order.status = 'accepted';
    order.acceptedAt = new Date().toISOString();
    DB.save('orders');
    zakazCurrentOrderId = order.id;
    targetObj = order;
  }

  DB.setTableStatus(zakazSelectedTable.id, 'busy');

  if(broadcast) {
    const newItems = items.filter(i => {
      const origQty = prevItemMap[i.menuItemId] || 0;
      return (i.qty - origQty) > 0;
    }).map(i => {
      const origQty = prevItemMap[i.menuItemId] || 0;
      return { ...i, qty: i.qty - origQty };
    });
    if(newItems.length) printKitchenTickets(targetObj, newItems);
    else if(Object.keys(prevItemMap).length === 0) printKitchenTickets(targetObj, items);

    if(!zakazCurrentCheckId) DB.broadcast('new_order', targetObj);
  }

  _renderZakazTables();
  _renderZakazCartBar();
  renderMenuGrid('zakazMenuGrid');
  return targetObj;
}

function saveZakaz() {
  const order = _createOrUpdateZakazOrder({ broadcast: false });
  if(order) showToast('Zakaz saqlandi');
}

function sendZakaz() {
  const order = _createOrUpdateZakazOrder({ broadcast: true });
  if(order) {
    showToast('Zakaz yuborildi va chek chiqarildi');
  }
}

function sendZakazToKassa() {
  const target = _createOrUpdateZakazOrder({ broadcast: false });
  if(!target) return;
  
  if(zakazCurrentCheckId) {
    sendCheckToKassaAction(zakazCurrentCheckId);
  } else {
    sendToKassa(target.id);
  }
}

function submitZakaz() {
  sendZakaz();
}

function formatPrice(n) { return (n || 0).toLocaleString('uz-UZ'); }

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

// Enter key for login
document.addEventListener('keydown', e => {
  if(e.key === 'Enter') {
    if(document.getElementById('loginScreen').style.display !== 'none') doLogin();
  }
});