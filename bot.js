// ============================================================
// MINGCHINOR KOMPLEKS - Telegram Bot Web App (bot.js)
// ============================================================

const tg = window.Telegram ? window.Telegram.WebApp : null;
let cart = {};
let currentCatId = 'all';

window.addEventListener('mc:db_ready', () => {
  if (tg) {
    tg.ready();
    tg.expand();
  }
  loadCategories();
  loadMenuItems();
  listenRealtime();
});

function loadCategories() {
  DB.categories = JSON.parse(localStorage.getItem('mc_categories') || '[]');
  const bar = document.getElementById('categoriesBar');
  bar.innerHTML = `<button class="cat-btn active" data-cat="all" onclick="filterCategory('all')">Barchasi</button>`;
  
  const sortedCats = DB.categories.sort((a,b) => (a.order || 0) - (b.order || 0));
  sortedCats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.dataset.cat = cat.id;
    btn.textContent = cat.name_uz || cat.name;
    btn.onclick = () => filterCategory(cat.id);
    bar.appendChild(btn);
  });
}

function filterCategory(catId) {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-cat="${catId}"]`)?.classList.add('active');
  currentCatId = catId;
  renderMenuItems();
}

function renderMenuItems() {
  const content = document.getElementById('menuContent');
  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
  
  let items = DB.menuItems.filter(m => !m.deleted);
  if(currentCatId !== 'all') items = items.filter(m => m.categoryId == currentCatId);
  items.sort((a,b) => (a.order || 0) - (b.order || 0));

  if(!items.length) {
    content.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
      <div style="font-size:40px">🍽️</div>
      <p style="margin-top:12px;font-size:14px">Taomlar yo'q</p>
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
    const itemName = item.name_uz || item.name;
    const imgSrc = item.image || '';
    const imgHtml = imgSrc
      ? `<img class="menu-card-img" src="${imgSrc}" alt="${itemName}" loading="lazy" onclick="openImgModal('${imgSrc}','${itemName.replace(/'/g,"\\'")}',${item.sellPrice})">`
      : `<div class="menu-card-img-placeholder" onclick="openImgModal('','${itemName.replace(/'/g,"\\'")}',${item.sellPrice})">🍽️</div>`;
    card.innerHTML = `
      ${imgHtml}
      <div class="menu-card-body">
        <div class="menu-card-name">${itemName}</div>
        <div class="menu-card-price">${formatPrice(item.sellPrice)} so'm</div>
        <div class="menu-card-controls">
          ${qty > 0 ? `
            <div class="qty-ctrl">
              <button class="qty-btn" onclick="updateCart('${item.id}',-1)">−</button>
              <span class="qty-num">${qty}</span>
              <button class="qty-btn" onclick="updateCart('${item.id}',1)">+</button>
            </div>
          ` : `<button class="add-btn" onclick="updateCart('${item.id}',1)">Savatga</button>`}
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
  content.innerHTML = '';
  content.appendChild(grid);
}

function updateCart(itemId, delta) {
  cart[itemId] = Math.max(0, (cart[itemId] || 0) + delta);
  if(cart[itemId] === 0) delete cart[itemId];
  updateCartFAB();
  renderMenuItems();
}

function updateCartFAB() {
  const total = getCartTotal();
  const count = getCartCount();
  const fab = document.getElementById('cartFab');
  if(count > 0) {
    fab.style.display = 'flex';
    document.getElementById('cartCount').textContent = count;
    document.getElementById('cartTotal').textContent = formatPrice(total) + ' so\'m';
  } else {
    fab.style.display = 'none';
  }
}

function getCartTotal() {
  return Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = DB.menuItems.find(m => m.id == id);
    return sum + (item ? item.sellPrice * qty : 0);
  }, 0);
}

function getCartCount() {
  return Object.values(cart).reduce((a, b) => a + b, 0);
}

function openCart() {
  const modal = document.getElementById('cartModal');
  modal.classList.add('active');
  
  // Telegram username orqali phone raqam placeholder
  if(tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
    const p = document.getElementById('delPhone');
    if(!p.value) p.value = ""; 
  }
  
  renderCartItems();
}

function closeCart() {
  document.getElementById('cartModal').classList.remove('active');
}

function renderCartItems() {
  const container = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  const emptyEl = document.getElementById('emptyCart');
  const count = getCartCount();

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
    const itemName = item.name_uz || item.name;
    const div = document.createElement('div');
    div.className = 'cart-item';
    const imgEl = item.image
      ? `<img class="cart-item-img" src="${item.image}" alt="${itemName}">`
      : `<div class="cart-item-img" style="display:flex;align-items:center;justify-content:center;font-size:22px">🍽️</div>`;
    div.innerHTML = `
      ${imgEl}
      <div class="cart-item-info">
        <div class="cart-item-name">${itemName}</div>
        <div class="cart-item-price">${formatPrice(item.sellPrice * qty)} so'm</div>
      </div>
      <div class="cart-item-qty">
        <button class="cq-btn" onclick="updateCartModal(${id},-1)">−</button>
        <span class="cq-num">${qty}</span>
        <button class="cq-btn" onclick="updateCartModal(${id},1)">+</button>
      </div>
    `;
    container.appendChild(div);
  });

  document.getElementById('cartTotalAmount').textContent = formatPrice(getCartTotal()) + ' so\'m';
}

function updateCartModal(itemId, delta) {
  cart[itemId] = Math.max(0, (cart[itemId] || 0) + delta);
  if(cart[itemId] === 0) delete cart[itemId];
  updateCartFAB();
  renderMenuItems();
  renderCartItems();
}

let userLat = null;
let userLng = null;

function requestLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {
      userLat = position.coords.latitude;
      userLng = position.coords.longitude;
      document.getElementById('delAddress').value = "Joylashuv aniqlandi 📍";
      showToast("Joylashuv aniqlandi");
    }, error => {
      showToast("Lokatsiyaga ruxsat berilmadi yoki xato");
    });
  } else {
    showToast("Telefoningizda lokatsiya funksiyasi ishlamaydi");
  }
}

function placeDeliveryOrder() {
  if(getCartCount() === 0) return;
  
  const phone = document.getElementById('delPhone').value.trim();
  const address = document.getElementById('delAddress').value.trim();
  const payment = document.getElementById('delPayment').value;
  const note = document.getElementById('delNote').value.trim();
  
  if(!phone || !address) {
    showToast("Telefon va Manzilni kiritish majburiy!");
    return;
  }

  const items = Object.entries(cart).map(([id, qty]) => {
    const item = DB.menuItems.find(m => m.id == id);
    return { menuItemId: parseInt(id), name: item?.name, qty, price: item?.sellPrice, categoryId: item?.categoryId };
  }).filter(x => x.qty > 0);

  let tgUser = "Mijoz";
  let tgId = "";
  if(tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
    tgUser = tg.initDataUnsafe.user.first_name;
    tgId = tg.initDataUnsafe.user.id;
  }

  const orderNote = `[DOSTAVKA] Tel: ${phone} | To'lov: ${payment}\n${note}`;
  
  const order = DB.addOrder({
    tableId: 'delivery',
    tableName: 'Dostavka / Olib ketish',
    guestCount: 1,
    items,
    note: orderNote,
    lang: 'uz',
    totalPrice: getCartTotal(),
    customerInfo: {
      name: tgUser,
      tgId: tgId,
      phone: phone,
      address: address,
      lat: userLat,
      lng: userLng,
      paymentMethod: payment
    }
  });

  DB.broadcast('new_order', order);

  cart = {};
  updateCartFAB();
  closeCart();
  
  // Agar Telegram WebApp ichida bo'lsa, oynani yopish yoki xabar berish
  if(tg) {
    tg.sendData(JSON.stringify({ action: 'order_placed', orderId: order.id }));
    showToast("Buyurtma qabul qilindi!");
    setTimeout(() => tg.close(), 2000);
  } else {
    showToast("Buyurtmangiz qabul qilindi! Operator aloqaga chiqadi.");
    setTimeout(() => location.reload(), 2000);
  }
}

function openImgModal(src, name, price) {
  const modal = document.getElementById('imgModal');
  document.getElementById('imgModalSrc').src = src || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="%23251407"/><text x="100" y="110" font-size="60" text-anchor="middle">🍽️</text></svg>';
  document.getElementById('imgModalName').textContent = name;
  document.getElementById('imgModalPrice').textContent = formatPrice(price) + ' so\'m';
  modal.classList.add('active');
}
function closeImgModal() {
  document.getElementById('imgModal').classList.remove('active');
}

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}
function formatPrice(n) {
  return (n || 0).toLocaleString('uz-UZ');
}

function listenRealtime() {
  window.addEventListener('mc:data_changed', e => {
    const { key, items } = e.detail;
    if(key === 'menuItems') {
      DB.menuItems = items;
      loadCategories();
      renderMenuItems();
    }
  });
}
