// ============================================================
// MINGCHINOR KOMPLEKS - Admin Panel JS (admin-menu.js)
// ============================================================

const ADMIN_CREDS = { login: 'admin', password: 'admin123' };
let currentImgData = '';
let currentUser = null;
let editingItemId = null;
let viewingCheckId = null;
let selectedReportWaiterId = 'all';

// ---- INIT ----
window.addEventListener('mc:db_ready', () => {
  if(localStorage.getItem('mc_admin_session') === 'true') {
    const saved = localStorage.getItem('mc_current_user');
    if(saved) currentUser = JSON.parse(saved);
    showApp();
  }
  setupRealtime();
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('repDate').value = today;
});

function doAdminLogin() {
  const login = document.getElementById('aLogin').value.trim();
  const pass = document.getElementById('aPass').value;
  
  // Admin tekshirish
  if(login === ADMIN_CREDS.login && pass === ADMIN_CREDS.password) {
    currentUser = { id: 0, name: 'Admin', login: 'admin', role: 'admin' };
    localStorage.setItem('mc_admin_session', 'true');
    localStorage.setItem('mc_current_user', JSON.stringify(currentUser));
    showApp();
    return;
  }
  
  // Xodimlarni tekshirish
  DB.waiters = JSON.parse(localStorage.getItem('mc_waiters') || '[]');
  const user = DB.waiters.find(w => w.login === login && w.password === pass);
  if(user) {
    currentUser = { id: user.id, name: user.name + ' ' + user.surname, login: user.login, role: user.role };
    localStorage.setItem('mc_admin_session', 'true');
    localStorage.setItem('mc_current_user', JSON.stringify(currentUser));
    showApp();
  } else {
    document.getElementById('loginErr').textContent = "Login yoki parol noto'g'ri";
    document.getElementById('loginErr').style.display = 'block';
  }
}

function doAdminLogout() {
  localStorage.removeItem('mc_admin_session');
  localStorage.removeItem('mc_current_user');
  currentUser = null;
  document.body.classList.remove('role-cashier');
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appLayout').style.display = 'none';
}

function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appLayout').style.display = 'flex';
  
  // Session restore
  const saved = localStorage.getItem('mc_current_user');
  if(saved) currentUser = JSON.parse(saved);
  
  // Navbar filter
  filterNavbarByRole();
  
  const initialSection = currentUser.role === 'cashier' ? 'kassa' : 'reports';
  goSection(initialSection);
  updateKassaBadge();
}

function filterNavbarByRole() {
  if(!currentUser) return;
  document.querySelectorAll('.nav-item').forEach(btn => {
    const allowedRoles = btn.getAttribute('data-allowed-roles');
    if(allowedRoles) {
      const hasAccess = allowedRoles.split(',').includes(currentUser.role);
      btn.style.display = hasAccess ? '' : 'none';
    }
  });
  // Kassir uchun admin-only elementlarni (qo'shish/tahrirlash/o'chirish
  // formalari va tugmalari) CSS orqali yashirish
  document.body.classList.toggle('role-cashier', currentUser.role === 'cashier');
}

// ---- SIDEBAR ----
function goSection(name) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelector(`[data-section="${name}"]`).classList.add('active');
  document.getElementById(`section${name.charAt(0).toUpperCase()+name.slice(1)}`).classList.add('active');
  const titles = {reports:'Hisobot',menu:'Menyu',ingredients:'Kirim masalliqlari',kassa:'Kassa',tables:'Stol',waiters:'Xodim',printers:'Xprinterlar'};
  document.getElementById('mobileTitle').textContent = titles[name] || '';
  document.getElementById('sidebar').classList.remove('open');
  if(name==='reports') { const t = new Date().toISOString().split('T')[0]; document.getElementById('repDate').value=t; loadReport(); }
  if(name==='menu') { loadMenuSection(); }
  if(name==='ingredients') { loadIngredientsSection(); }
  if(name==='kassa') { loadKassa(); }
  if(name==='tables') { loadTables(); }
  if(name==='waiters') { loadWaiters(); }
  if(name==='printers') { loadPrinters(); startAutoPing(); }
  // Printers bo'limi yopilsa avtomatik ping to'xtatiladi
  if(name !== 'printers') { stopAutoPing(); }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ============================================================
// REPORTS
// ============================================================
function loadReport() {
  DB.checks = JSON.parse(localStorage.getItem('mc_checks') || '[]');
  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
  DB.waiters = JSON.parse(localStorage.getItem('mc_waiters') || '[]');

  const filtered = getReportFilteredChecks();
  renderSalesReport(filtered);
  renderChecksIncomeReport(filtered);
  renderWaiterChecksReport(filtered);
}

function switchReportView(view) {
  document.querySelectorAll('.report-mini-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.reportView === view);
  });
  document.querySelectorAll('.report-subview').forEach(panel => {
    panel.classList.toggle('active', panel.dataset.reportView === view);
  });
  loadReport();
}

function getReportFilteredChecks() {
  const dateInput = document.getElementById('repDate');
  const periodInput = document.getElementById('repPeriod');
  if(!dateInput || !periodInput) return [];
  if(!dateInput.value) dateInput.value = new Date().toISOString().split('T')[0];

  const dateStr = dateInput.value;
  const period = periodInput.value;
  const refDate = new Date(`${dateStr}T00:00:00`);

  return DB.checks.filter(c => {
    if(!c.createdAt) return false;
    const d = new Date(c.createdAt);
    if(period==='day') return sameDay(d, refDate);
    if(period==='week') return sameWeek(d, refDate);
    if(period==='month') return d.getMonth()===refDate.getMonth() && d.getFullYear()===refDate.getFullYear();
    if(period==='year') return d.getFullYear()===refDate.getFullYear();
    return true;
  });
}

function renderSalesReport(filtered) {
  const statsEl = document.getElementById('reportStats');
  const tableEl = document.getElementById('reportChecksTable');
  if(!statsEl || !tableEl) return;

  let totalCost = 0;
  let totalSell = 0;
  filtered.forEach(c => {
    (c.items || []).forEach(item => {
      const mi = DB.menuItems.find(m => m.id === item.menuItemId);
      totalCost += (mi?.costPrice || 0) * item.qty;
      totalSell += item.price * item.qty;
    });
  });
  const profit = totalSell - totalCost;

  statsEl.innerHTML = `
    <div class="stat-card"><div class="stat-val cost">${formatPrice(totalCost)} so'm</div><div class="stat-label">Tannarx</div></div>
    <div class="stat-card"><div class="stat-val sell">${formatPrice(totalSell)} so'm</div><div class="stat-label">Sotilish narxi</div></div>
    <div class="stat-card"><div class="stat-val profit">${formatPrice(profit)} so'm</div><div class="stat-label">Sof foyda</div></div>
  `;

  if(!filtered.length) {
    tableEl.innerHTML = '<div class="empty-state"><span>📊</span><p>Bu davrda cheklar yo\'q</p></div>';
    return;
  }

  tableEl.innerHTML = `
    <div class="card">
      <h3>Cheklar ro'yxati</h3>
      <div class="table-responsive">
        <table class="data-table">
          <thead><tr><th>№</th><th>Stol</th><th>Kishi</th><th>Sana</th><th>Jami</th></tr></thead>
          <tbody>${filtered.map((c,i) => `
            <tr>
              <td>${i+1}</td>
              <td>${c.tableName || '-'}</td>
              <td>${c.guestCount || '-'}</td>
              <td>${new Date(c.createdAt).toLocaleString('uz-UZ')}</td>
              <td style="font-weight:700;color:var(--success)">${formatPrice(c.totalPrice)} so'm</td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderChecksIncomeReport(filtered) {
  const tableEl = document.getElementById('reportChecksIncomeTable');
  if(!tableEl) return;

  const sorted = [...filtered].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  if(!sorted.length) {
    tableEl.innerHTML = '<div class="empty-state"><span>🧾</span><p>Tanlangan davrda cheklar topilmadi</p></div>';
    return;
  }

  tableEl.innerHTML = `
    <div class="card">
      <h3>Cheklar bo'yicha tushum</h3>
      <div class="table-responsive">
        <table class="data-table">
          <thead><tr><th>№</th><th>Sana</th><th>Stol</th><th>Ofisant</th><th>Kishi</th><th>Jami</th><th>Chek</th></tr></thead>
          <tbody>${sorted.map((c,i) => `
            <tr>
              <td>${i+1}</td>
              <td>${new Date(c.createdAt).toLocaleString('uz-UZ')}</td>
              <td>${c.tableName || '-'}</td>
              <td>${c.waiterName || '-'}</td>
              <td>${c.guestCount || '-'}</td>
              <td style="font-weight:700;color:var(--success)">${formatPrice(c.totalPrice)} so'm</td>
              <td><button class="report-view-btn" onclick="openReportCheck(${c.id})">Ko'rish</button></td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderWaiterChecksReport(filtered) {
  const waiters = DB.waiters.filter(w => w.role !== 'admin');
  const filtersEl = document.getElementById('reportWaiterFilters');
  const statsEl = document.getElementById('reportWaiterStats');
  const tableEl = document.getElementById('reportWaiterChecksTable');
  if(!filtersEl || !statsEl || !tableEl) return;

  if(!waiters.length) {
    filtersEl.innerHTML = '';
    statsEl.innerHTML = '';
    tableEl.innerHTML = '<div class="empty-state"><span>👨‍🍳</span><p>Ofisantlar topilmadi</p></div>';
    return;
  }

  const waiterIds = waiters.map(w => String(w.id));
  if(selectedReportWaiterId !== 'all' && !waiterIds.includes(String(selectedReportWaiterId))) {
    selectedReportWaiterId = 'all';
  }

  filtersEl.innerHTML = `
    <button class="waiter-filter-btn ${selectedReportWaiterId === 'all' ? 'active' : ''}" onclick="setReportWaiterFilter('all')">Barchasi</button>
    ${waiters.map(w => `
      <button class="waiter-filter-btn ${String(selectedReportWaiterId) === String(w.id) ? 'active' : ''}" onclick="setReportWaiterFilter(${w.id})">
        ${w.name} ${w.surname}
      </button>
    `).join('')}
  `;

  const feePerGuest = parseInt(localStorage.getItem('mc_service_fee')) || 0;

  statsEl.innerHTML = waiters.map(w => {
    const waiterChecks = filtered.filter(chk => checkMatchesWaiter(chk, w));
    const waiterTotal = waiterChecks.reduce((sum, chk) => sum + (chk.totalPrice || 0), 0);
    const waiterGuests = waiterChecks.reduce((sum, chk) => sum + (chk.guestCount || 1), 0);
    const waiterServiceFee = waiterGuests * feePerGuest;
    return `
      <div class="report-waiter-card">
        <div class="report-waiter-name">${w.name} ${w.surname}</div>
        <div class="report-waiter-meta">Cheklar: ${waiterChecks.length} ta</div>
        <div class="report-waiter-meta">Mehmonlar: ${waiterGuests} ta</div>
        <div class="report-waiter-meta" style="color:var(--success);font-weight:700;margin-top:4px;">Xizmat haqi: ${formatPrice(waiterServiceFee)} so'm</div>
      </div>
    `;
  }).join('');

  const selectedWaiter = waiters.find(w => String(w.id) === String(selectedReportWaiterId));
  const visibleChecks = selectedReportWaiterId === 'all'
    ? [...filtered]
    : filtered.filter(chk => selectedWaiter && checkMatchesWaiter(chk, selectedWaiter));
  visibleChecks.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  if(!visibleChecks.length) {
    tableEl.innerHTML = '<div class="empty-state"><span>🧾</span><p>Tanlangan ofisantda bu davr uchun chek yo\'q</p></div>';
    return;
  }

  tableEl.innerHTML = `
    <div class="card">
      <h3>Ofisant cheklari</h3>
      <div class="table-responsive">
        <table class="data-table">
          <thead><tr><th>№</th><th>Chek raqami</th><th>Sana</th><th>Stol</th><th>Ofisant</th><th>Mehmon</th><th>Jami</th><th>Chek</th></tr></thead>
          <tbody>${visibleChecks.map((c,i) => `
            <tr>
              <td>${i+1}</td>
              <td>#${c.id}</td>
              <td>${new Date(c.createdAt).toLocaleString('uz-UZ')}</td>
              <td>${c.tableName || '-'}</td>
              <td>${c.waiterName || '-'}</td>
              <td>${c.guestCount || 1} ta</td>
              <td style="font-weight:700;color:var(--success)">${formatPrice(c.totalPrice)} so'm</td>
              <td><button class="report-view-btn" onclick="openReportCheck(${c.id})">Ko'rish</button></td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    </div>
  `;
}

function setReportWaiterFilter(waiterId) {
  selectedReportWaiterId = waiterId === 'all' ? 'all' : parseInt(waiterId);
  loadReport();
}

function checkMatchesWaiter(chk, waiter) {
  if(String(chk.waiterId) === String(waiter.id)) return true;
  const fullName = `${waiter.name} ${waiter.surname}`.trim().toLowerCase();
  const waiterName = (chk.waiterName || '').trim().toLowerCase();
  return waiterName === fullName || waiterName === waiter.name.toLowerCase();
}

function openReportCheck(checkId) {
  DB.checks = JSON.parse(localStorage.getItem('mc_checks') || '[]');
  const chk = DB.checks.find(c => String(c.id) === String(checkId));
  if(!chk) { showToast('Chek topilmadi'); return; }

  const tsStr = new Date(chk.createdAt).toLocaleString('uz-UZ');
  const itemsHtml = (chk.items || []).map(item => `
    <div class="receipt-row">
      <span>${item.name}</span>
      <span>${item.qty}x${formatPrice(item.price)}=${formatPrice(item.qty*item.price)}</span>
    </div>
  `).join('');

  document.getElementById('reportCheckContent').innerHTML = `
    <div class="receipt-brand">Mingchinor Kompleks</div>
    <hr class="receipt-divider">
    <div class="receipt-row"><span>Stol:</span><span>${chk.tableName || '-'}</span></div>
    <div class="receipt-row"><span>Sana:</span><span>${tsStr}</span></div>
    <div class="receipt-row"><span>Ofisant:</span><span>${chk.waiterName || '-'}</span></div>
    <div class="receipt-row"><span>Mehmon:</span><span>${chk.guestCount || '-'}</span></div>
    <hr class="receipt-divider">
    ${itemsHtml || '<div class="receipt-row"><span>Buyurtmalar yo\'q</span><span></span></div>'}
    <hr class="receipt-divider">
    <div class="receipt-row"><strong>Jami:</strong><strong>${formatPrice(chk.totalPrice)} so'm</strong></div>
  `;
  document.getElementById('reportCheckModal').classList.add('active');
}

function closeReportCheck() {
  document.getElementById('reportCheckModal').classList.remove('active');
}
function sameDay(a,b) { return a.toDateString()===b.toDateString(); }
function sameWeek(a,b) {
  const startOf = d => { const x=new Date(d); x.setDate(x.getDate()-x.getDay()); x.setHours(0,0,0,0); return x; };
  return startOf(a).getTime()===startOf(b).getTime();
}

// ============================================================
// MENU
// ============================================================
function loadMenuSection() {
  loadCategorySelect();
  renderMenuTable();
  initMenuSortable();
}

function loadCategorySelect() {
  DB.categories = JSON.parse(localStorage.getItem('mc_categories') || '[]');
  const sel = document.getElementById('menuCatSelect');
  const editSel = document.getElementById('editItemCat');
  [sel, editSel].forEach(s => {
    if(!s) return;
    const val = s.value;
    s.innerHTML = '<option value="">– Tanlang –</option>';
    DB.categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id; opt.textContent = cat.name;
      s.appendChild(opt);
    });
    if(val) s.value = val;
  });
}

function showCreateCat() { document.getElementById('createCatModal').classList.add('active'); }
function closeCreateCat() { document.getElementById('createCatModal').classList.remove('active'); }

function createCategory() {
  const name = document.getElementById('newCatName').value.trim();
  const printer = document.getElementById('newCatPrinter').value || '';
  if(!name) return;
  DB.categories = JSON.parse(localStorage.getItem('mc_categories') || '[]');
  if(DB.categories.find(c => c.name.toLowerCase()===name.toLowerCase())) {
    showToast('Bu kategoriya mavjud!'); return;
  }
  DB.categories.push({ id: DB.nextId(DB.categories), name, printerTarget: printer });
  DB.save('categories');
  closeCreateCat();
  document.getElementById('newCatName').value = '';
  document.getElementById('newCatPrinter').value = '';
  loadCategorySelect();
  showToast(`"${name}" kategoriyasi yaratildi${printer ? ` (printer: ${PRINTER_LABELS[printer] || printer})` : ''}`);
}

function previewImg(e) {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    currentImgData = ev.target.result;
    document.getElementById('imgPreview').src = currentImgData;
    document.getElementById('imgPreviewWrap').style.display = 'flex';
    document.getElementById('imgPreviewWrap').style.alignItems = 'center';
    document.getElementById('imgPreviewWrap').style.gap = '8px';
  };
  reader.readAsDataURL(file);
}

function loadImgUrl() {
  const url = document.getElementById('menuItemImgUrl').value.trim();
  if(!url) return;
  currentImgData = url;
  document.getElementById('imgPreview').src = url;
  document.getElementById('imgPreviewWrap').style.display = 'flex';
  document.getElementById('imgPreviewWrap').style.alignItems = 'center';
  document.getElementById('imgPreviewWrap').style.gap = '8px';
}

function clearImg() {
  currentImgData = '';
  document.getElementById('imgPreview').src = '';
  document.getElementById('imgPreviewWrap').style.display = 'none';
  document.getElementById('menuItemImg').value = '';
  document.getElementById('menuItemImgUrl').value = '';
}

function addMenuItem() {
  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
  DB.categories = JSON.parse(localStorage.getItem('mc_categories') || '[]');
  const catId = parseInt(document.getElementById('menuCatSelect').value);
  const name = document.getElementById('menuItemName').value.trim();
  const cost = parseInt(document.getElementById('menuItemCost').value) || 0;
  const sell = parseInt(document.getElementById('menuItemSell').value) || 0;
  const printerTarget = document.getElementById('menuItemPrinter').value || '';
  const errEl = document.getElementById('menuFormErr');
  errEl.style.display = 'none';

  if(!catId) { errEl.textContent='Kategoriya tanlang'; errEl.style.display='block'; return; }
  if(!name) { errEl.textContent='Taom nomi kiriting'; errEl.style.display='block'; return; }
  if(DB.menuItems.find(m => m.name.toLowerCase()===name.toLowerCase() && !m.deleted)) {
    errEl.textContent='Bu nomli taom allaqachon mavjud'; errEl.style.display='block'; return;
  }

  const item = {
    id: DB.nextId(DB.menuItems),
    categoryId: catId,
    name, costPrice: cost, sellPrice: sell,
    printerTarget,
    image: currentImgData,
    unavailable: false, deleted: false
  };
  DB.menuItems.push(item);
  DB.save('menuItems');
  DB.broadcast('menu_updated', {});

  // Reset form
  document.getElementById('menuItemName').value = '';
  document.getElementById('menuItemCost').value = '';
  document.getElementById('menuItemSell').value = '';
  document.getElementById('menuItemPrinter').value = '';
  clearImg();
  renderMenuTable();
  showToast(`"${name}" qo'shildi`);
}

function renderMenuTable() {
  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
  DB.categories = JSON.parse(localStorage.getItem('mc_categories') || '[]');
  const tbody = document.getElementById('menuTableBody');
  
  if(!DB.menuItems.filter(m => !m.deleted).length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-dim)">Taomlar yo\'q</td></tr>';
    return;
  }
  
  tbody.innerHTML = '';
  
  // Kategoriyalarni tartiblash
  const sortedCats = [...DB.categories].sort((a,b) => (a.order || 0) - (b.order || 0));
  
  // Har bir kategoriya uchun
  sortedCats.forEach(cat => {
    const catItems = DB.menuItems
      .filter(m => !m.deleted && m.categoryId == cat.id)
      .sort((a,b) => (a.order || 0) - (b.order || 0));
      
    if(catItems.length > 0) {
      // Kategoriya sarlavhasi row
      const catRow = document.createElement('tr');
      catRow.className = 'cat-row';
      catRow.innerHTML = `<td colspan="7">${cat.name}</td>`;
      tbody.appendChild(catRow);
      
      // Kategoriya ichidagi taomlar
      catItems.forEach((item, i) => {
        const tr = createMenuRow(item, i + 1, cat.name);
        tbody.appendChild(tr);
      });
    }
  });

  // Kategoriyasiz qolgan taomlar (agar bo'lsa)
  const uncategorized = DB.menuItems
    .filter(m => !m.deleted && (!m.categoryId || !DB.categories.find(c => c.id == m.categoryId)))
    .sort((a,b) => (a.order || 0) - (b.order || 0));
    
  if(uncategorized.length > 0) {
    const otherRow = document.createElement('tr');
    otherRow.className = 'cat-row';
    otherRow.innerHTML = `<td colspan="7">Boshqalar</td>`;
    tbody.appendChild(otherRow);
    
    uncategorized.forEach((item, i) => {
      const tr = createMenuRow(item, i + 1, 'Boshqa');
      tbody.appendChild(tr);
    });
  }
}

function createMenuRow(item, index, catName) {
  const tr = document.createElement('tr');
  tr.dataset.id = item.id;
  tr.className = 'item-row';
  tr.innerHTML = `
    <td class="drag-handle" style="cursor:move; color:var(--text-muted); font-size:18px;">⠿</td>
    <td>${index}</td>
    <td>
      ${item.image ? `<img src="${item.image}" class="td-img" style="margin-right:8px;vertical-align:middle">` : ''}
      ${item.name}
      ${item.unavailable ? '<span class="td-badge unavailable" style="margin-left:8px">Pausa</span>' : ''}
    </td>
    <td>${catName}</td>
    <td>${formatPrice(item.costPrice)}</td>
    <td>${formatPrice(item.sellPrice)}</td>
    <td>
      <div class="actions-cell">
        <button class="btn-icon edit admin-only" onclick="openEditItem('${item.id}')" title="Tahrirlash">✏️</button>
        <button class="btn-icon toggle" onclick="toggleItem('${item.id}')" title="${item.unavailable?'Qayta yoqish':'Vaqtincha o\'chirish'}">${item.unavailable?'▶':'⏸'}</button>
        <button class="btn-icon danger admin-only" onclick="deleteItem('${item.id}')" title="O'chirish">🗑️</button>
      </div>
    </td>
  `;
  return tr;
}

function openEditItem(id) {
  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
  const item = DB.menuItems.find(m => m.id == id);
  if(!item) return;
  editingItemId = id;
  loadCategorySelect();
  document.getElementById('editItemId').value = id;
  document.getElementById('editItemCat').value = item.categoryId;
  document.getElementById('editItemName').value = item.name;
  document.getElementById('editItemCost').value = item.costPrice;
  document.getElementById('editItemSell').value = item.sellPrice;
  document.getElementById('editItemPrinter').value = item.printerTarget || '';
  document.getElementById('editItemImgUrl').value = item.image || '';
  const pw = document.getElementById('editImgPreviewWrap');
  if(item.image) {
    document.getElementById('editImgPreview').src = item.image;
    pw.style.display='block';
  } else pw.style.display='none';
  document.getElementById('editItemImgUrl').onchange = () => {
    const v = document.getElementById('editItemImgUrl').value;
    document.getElementById('editImgPreview').src = v;
    pw.style.display = v ? 'block' : 'none';
  };
  document.getElementById('editItemModal').classList.add('active');
}

function closeEditItem() { document.getElementById('editItemModal').classList.remove('active'); }

function saveEditItem() {
  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
  const item = DB.menuItems.find(m => String(m.id)===String(editingItemId));
  if(!item) return;
  const newName = document.getElementById('editItemName').value.trim();
  const duplicate = DB.menuItems.find(m => m.name.toLowerCase()===newName.toLowerCase() && String(m.id)!==String(editingItemId) && !m.deleted);
  if(duplicate) { showToast('Bu nomli taom allaqachon mavjud!'); return; }
  item.categoryId = parseInt(document.getElementById('editItemCat').value);
  item.name = newName;
  item.costPrice = parseInt(document.getElementById('editItemCost').value) || 0;
  item.sellPrice = parseInt(document.getElementById('editItemSell').value) || 0;
  item.printerTarget = document.getElementById('editItemPrinter').value || '';
  item.image = document.getElementById('editItemImgUrl').value || item.image;
  DB.save('menuItems');
  DB.broadcast('menu_updated', {});
  closeEditItem();
  renderMenuTable();
  showToast('Taom yangilandi');
}

function toggleItem(id) {
  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
  const item = DB.menuItems.find(m => m.id == id);
  if(!item) return;
  item.unavailable = !item.unavailable;
  DB.save('menuItems');
  DB.broadcast('menu_updated', {});
  renderMenuTable();
  showToast(item.unavailable ? 'Vaqtincha o\'chirildi' : 'Qayta yoqildi');
}

function deleteItem(id) {
  if(!confirm('Taomni o\'chirasizmi?')) return;
  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
  const item = DB.menuItems.find(m => m.id == id);
  if(!item) return;
  item.deleted = true;
  DB.save('menuItems');
  DB.broadcast('menu_updated', {});
  renderMenuTable();
  showToast('Taom o\'chirildi');
}

// ---- SORTABLE ----
function initMenuSortable() {
  const tbody = document.getElementById('menuTableBody');
  if(!tbody) return;
  
  if(window._menuSortable) window._menuSortable.destroy();
  
  window._menuSortable = new Sortable(tbody, {
    handle: '.drag-handle',
    draggable: '.item-row', // Faqat item-rowlarni drag qilish mumkin (cat-rowlar sarlavha bo'lib qoladi)
    animation: 150,
    ghostClass: 'sortable-ghost',
    onEnd: function() {
      saveMenuOrder();
    }
  });
}

function saveMenuOrder() {
  const tbody = document.getElementById('menuTableBody');
  const rows = Array.from(tbody.querySelectorAll('tr'));
  
  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
  
  rows.forEach((row, index) => {
    const id = row.dataset.id;
    const item = DB.menuItems.find(m => m.id == id);
    if(item) {
      item.order = index + 1;
    }
  });
  
  DB.save('menuItems');
  DB.broadcast('menu_updated', {});
  showToast('Tartib saqlandi');
  
  // Re-render to update numbers (№ column)
  renderMenuTable();
}

// ============================================================
// INGREDIENTS (KIRIM MASALLIQLARI)
// ============================================================
const ING_UNIT_LABELS = { kg: 'kg', g: 'g', l: 'l', ml: 'ml', dona: 'dona' };

function loadIngredientsSection() {
  renderIngredientsGrid('all');
  loadRecipeDropdowns();
  loadDishRecipe();
  
  // Category filter buttons
  document.querySelectorAll('#ingredientCategoryFilter .cat-filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('#ingredientCategoryFilter .cat-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.cat;
      renderIngredientsGrid(cat);
    });
  });
}

function getIngredientCategory(ing) {
  // Determine category based on unit or name patterns
  if(['dona', 'piece', 'sht'].includes(ing.unit)) {
    if(ing.name.toLowerCase().includes('suv') || ing.name.toLowerCase().includes('ichimlik') || ing.name.toLowerCase().includes('cola') || ing.name.toLowerCase().includes('pepsi')) {
      return 'liquids';
    }
    if(ing.name.toLowerCase().includes('shokolad') || ing.name.toLowerCase().includes('shirinlik') || ing.name.toLowerCase().includes('konfet') || ing.name.toLowerCase().includes('halva')) {
      return 'sweets';
    }
    if(ing.name.toLowerCase().includes('non') || ing.name.toLowerCase().includes('chor') || ing.name.toLowerCase().includes('pechenie')) {
      return 'bread';
    }
    return 'weight';
  }
  return 'weight';
}

function renderIngredientsGrid(category = 'all') {
  DB.ingredients = JSON.parse(localStorage.getItem('mc_ingredients') || '[]');
  const grid = document.getElementById('ingredientsGridContainer');
  if(!grid) return;
  
  const items = DB.ingredients.filter(x => !x.deleted);
  
  let filtered = items;
  if(category !== 'all') {
    filtered = items.filter(ing => getIngredientCategory(ing) === category);
  }
  
  if(!filtered.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--text-dim)">Bu kategoriyada masalliqlar yo\'q</div>';
    return;
  }
  
  grid.innerHTML = filtered.map(ing => {
    const unitLabel = ING_UNIT_LABELS[ing.unit] || ing.unit;
    return `
      <div class="ingredient-card">
        <h4>${ing.name}</h4>
        <div class="qty">${ing.qty} ${unitLabel}</div>
        <div class="unit">₹ ${ing.price}</div>
        <div style="margin-top:8px;display:flex;gap:4px;justify-content:center">
          <button class="btn-small" onclick="editIngredient(${ing.id})" style="flex:1">✏️</button>
          <button class="btn-small" onclick="deleteIngredient(${ing.id})" style="flex:1;background:var(--danger-dim);color:var(--danger)">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

function addIngredient() {
  DB.ingredients = JSON.parse(localStorage.getItem('mc_ingredients') || '[]');
  const name = document.getElementById('ingName').value.trim();
  const unit = document.getElementById('ingUnit').value;
  const qty = parseFloat(document.getElementById('ingQty').value) || 0;
  const price = parseInt(document.getElementById('ingPrice').value) || 0;
  const errEl = document.getElementById('ingFormErr');
  errEl.style.display = 'none';

  if(!name) { errEl.textContent = 'Masalliq nomini kiriting'; errEl.style.display = 'block'; return; }
  if(DB.ingredients.find(x => x.name.toLowerCase() === name.toLowerCase() && !x.deleted)) {
    errEl.textContent = "Bu nomli masalliq allaqachon mavjud"; errEl.style.display = 'block'; return;
  }

  const ingredient = {
    id: DB.nextId(DB.ingredients),
    name, unit, qty, price,
    deleted: false
  };
  DB.ingredients.push(ingredient);
  DB.save('ingredients');
  DB.broadcast('ingredients_updated', {});

  document.getElementById('ingName').value = '';
  document.getElementById('ingQty').value = '';
  document.getElementById('ingPrice').value = '';
  renderIngredientsTable();
  loadRecipeDropdowns();
  showToast(`"${name}" qo'shildi`);
}

function renderIngredientsTable() {
  DB.ingredients = JSON.parse(localStorage.getItem('mc_ingredients') || '[]');
  const tbody = document.getElementById('ingredientsTableBody');
  if(!tbody) return;

  const items = DB.ingredients.filter(x => !x.deleted);
  if(!items.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-dim)">Masalliqlar yo\'q</td></tr>';
    return;
  }

  tbody.innerHTML = items.map((ing, i) => {
    const unitLabel = ING_UNIT_LABELS[ing.unit] || ing.unit;
    const total = (ing.qty || 0) * (ing.price || 0);
    return `
      <tr data-id="${ing.id}">
        <td>${i + 1}</td>
        <td>${ing.name}</td>
        <td>${ing.qty} ${unitLabel}</td>
        <td>${formatPrice(ing.price)} so'm</td>
        <td>${formatPrice(total)} so'm</td>
        <td>
          <div class="actions-cell admin-only">
            <button class="btn-icon danger" onclick="deleteIngredient('${ing.id}')" title="O'chirish">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function editIngredient(id) {
  DB.ingredients = JSON.parse(localStorage.getItem('mc_ingredients') || '[]');
  const ing = DB.ingredients.find(x => String(x.id) === String(id));
  if(!ing) return;
  
  const newQty = prompt(`Yangi miqdor (hozir: ${ing.qty}):`, ing.qty);
  if(newQty === null) return;
  
  const qty = parseFloat(newQty) || 0;
  if(qty < 0) { showToast('Miqdor manfiy bo\'la olmaydi', 'error'); return; }
  
  ing.qty = qty;
  DB.save('ingredients');
  DB.broadcast('ingredients_updated', {});
  renderIngredientsGrid('all');
  showToast('Masalliq yangilandi');
}

function deleteIngredient(id) {
  if(!confirm("Masalliqni o'chirasizmi?")) return;
  DB.ingredients = JSON.parse(localStorage.getItem('mc_ingredients') || '[]');
  const ing = DB.ingredients.find(x => String(x.id) === String(id));
  if(!ing) return;
  ing.deleted = true;
  DB.save('ingredients');
  DB.broadcast('ingredients_updated', {});
  renderIngredientsGrid('all');
  showToast("Masalliq o'chirildi");
}

// ---- RETSEPT (masalliq — taom bog'lanishi) ----
function loadRecipeDropdowns() {
  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
  DB.ingredients = JSON.parse(localStorage.getItem('mc_ingredients') || '[]');

  const dishSel = document.getElementById('recipeDishSelect');
  const ingSel = document.getElementById('recipeIngSelect');
  if(!dishSel || !ingSel) return;

  const prevDish = dishSel.value;
  dishSel.innerHTML = '<option value="">– Taomni tanlang –</option>';
  DB.menuItems.filter(m => !m.deleted).forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id; opt.textContent = m.name;
    dishSel.appendChild(opt);
  });
  if(prevDish) dishSel.value = prevDish;

  ingSel.innerHTML = '<option value="">– Masalliqni tanlang –</option>';
  DB.ingredients.filter(x => !x.deleted).forEach(ing => {
    const opt = document.createElement('option');
    opt.value = ing.id;
    opt.textContent = `${ing.name} (${ING_UNIT_LABELS[ing.unit] || ing.unit})`;
    ingSel.appendChild(opt);
  });

  loadDishRecipe();
}

function loadDishRecipe() {
  const dishId = document.getElementById('dishRecipeSelect').value;
  const tbody = document.getElementById('recipeIngredientsBody');
  if(!dishId) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:16px;color:var(--text-dim)">Taom tanlang</td></tr>'; return; }

  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
  DB.ingredients = JSON.parse(localStorage.getItem('mc_ingredients') || '[]');
  const item = DB.menuItems.find(m => String(m.id) === String(dishId));
  if(!item) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:16px;color:var(--text-dim)">Taom topilmadi</td></tr>'; return; }

  const recipe = Array.isArray(item.recipe) ? item.recipe : [];
  if(!recipe.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:16px;color:var(--text-dim)">Bu taom uchun retsept hali kiritilmagan</td></tr>';
    return;
  }

  tbody.innerHTML = recipe.map(r => {
    const ing = DB.ingredients.find(x => String(x.id) === String(r.ingredientId));
    const ingName = ing ? ing.name : '(o\'chirilgan masalliq)';
    const unitLabel = ing ? (ING_UNIT_LABELS[ing.unit] || ing.unit) : '';
    return `
      <tr>
        <td>${ingName}</td>
        <td><input type="number" value="${r.qty}" step="any" onchange="updateRecipeQty(${dishId}, '${r.ingredientId}', this.value)" style="width:70px;padding:4px;border:1px solid var(--border);border-radius:4px"></td>
        <td>${unitLabel}</td>
        <td>
          <div class="actions-cell">
            <button class="btn-icon" onclick="removeRecipeIngredient(${dishId}, '${r.ingredientId}')" title="O'chirish" style="background:var(--danger-dim);color:var(--danger)">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function addRecipeIngredient() {
  const dishId = document.getElementById('dishRecipeSelect').value;
  const ingredientId = document.getElementById('recipeIngredientSelect').value;
  const qty = parseFloat(document.getElementById('recipeQtyInput').value);

  if(!dishId) { showToast('Avval taomni tanlang', 'error'); return; }
  if(!ingredientId) { showToast('Masalliqni tanlang', 'error'); return; }
  if(!qty || qty <= 0) { showToast("Miqdorni to'g'ri kiriting", 'error'); return; }

  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
  const item = DB.menuItems.find(m => String(m.id) === String(dishId));
  if(!item) return;

  if(!Array.isArray(item.recipe)) item.recipe = [];
  const existing = item.recipe.find(r => String(r.ingredientId) === String(ingredientId));
  if(existing) {
    existing.qty = qty;
  } else {
    item.recipe.push({ ingredientId, qty });
  }
  DB.save('menuItems');

  document.getElementById('recipeQty').value = '';
  loadDishRecipe();
  showToast('Retseptga qo\'shildi');
}

function removeRecipeIngredient(dishId, ingredientId) {
  if(!dishId) return;
  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
  const item = DB.menuItems.find(m => String(m.id) === String(dishId));
  if(!item || !Array.isArray(item.recipe)) return;
  item.recipe = item.recipe.filter(r => String(r.ingredientId) !== String(ingredientId));
  DB.save('menuItems');
  loadDishRecipe();
  showToast('Retseptdan olib tashlandi');
}

function updateRecipeQty(dishId, ingredientId, newQty) {
  const qty = parseFloat(newQty) || 0;
  if(qty <= 0) { showToast('Miqdor 0 dan katta bo\'lishi kerak', 'error'); return; }
  
  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
  const item = DB.menuItems.find(m => String(m.id) === String(dishId));
  if(!item || !Array.isArray(item.recipe)) return;
  
  const recipe = item.recipe.find(r => String(r.ingredientId) === String(ingredientId));
  if(recipe) {
    recipe.qty = qty;
    DB.save('menuItems');
    loadDishRecipe();
    showToast('Retsept yangilandi');
  }
}

// ============================================================
// KASSA
// ============================================================
function updateKassaBadge() {
  DB.checks = JSON.parse(localStorage.getItem('mc_checks') || '[]');
  const pending = DB.checks.filter(c => c.status === 'kassa').length;
  const badge = document.getElementById('kassaBadge');
  if(badge) { badge.textContent=pending; badge.style.display=pending>0?'flex':'none'; }
}

function loadKassa() {
  DB.checks = JSON.parse(localStorage.getItem('mc_checks') || '[]');
  DB.tables = JSON.parse(localStorage.getItem('mc_tables') || JSON.stringify(_defaults.tables));
  
  const grid = document.getElementById('kassaTablesGrid');
  const panel = document.getElementById('kassaChecksPanel');
  if(!grid) return;
  
  // Har bir stol uchun unga tegishli "kassa" yoki "paid" statusidagi cheklar soni
  const tableChecks = {};
  DB.tables.forEach(t => {
    tableChecks[t.id] = DB.checks.filter(c => c.tableId === t.id && (c.status === 'kassa' || c.status === 'paid'));
  });

  updateKassaBadge();
  
  grid.innerHTML = '';
  DB.tables.forEach(table => {
    const chks = tableChecks[table.id] || [];
    const card = document.createElement('div');
    card.className = 'table-card';
    card.onclick = () => selectTableForKassa(table.id, chks);
    card.innerHTML = `
      <div class="table-number">${table.id}</div>
      <div class="table-status">${table.status === 'busy' ? 'Mashg\'ul' : 'Bo\'sh'}</div>
      <div class="table-count">${chks.length} chek</div>
    `;
    grid.appendChild(card);
  });
}

let currentKassaTableId = null;

function selectTableForKassa(tableId, checks) {
  currentKassaTableId = tableId;
  const panel = document.getElementById('kassaChecksPanel');
  const grid = document.getElementById('kassaTablesGrid');
  const title = document.getElementById('kassaTableTitle');
  const list = document.getElementById('kassaChecksList');
  
  // Active stol tagiga alohida rang berish
  document.querySelectorAll('.table-card').forEach(c => c.classList.remove('active'));
  event.target.closest('.table-card').classList.add('active');
  
  panel.style.display = 'block';
  title.textContent = `Stol ${tableId} — Cheklar (${checks.length} ta)`;
  
  if(!checks.length) {
    list.innerHTML = '<div class="empty-state"><span>📋</span><p>Bu stol uchun chek yo\'q</p></div>';
    return;
  }
  
  checks.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  list.innerHTML = '';
  
  checks.forEach(chk => {
    const div = document.createElement('div');
    div.className = 'kassa-card';
    const ts = new Date(chk.createdAt);
    const tsStr = ts.toLocaleTimeString('uz-UZ', {hour:'2-digit', minute:'2-digit'});
    const statusBadge = chk.status === 'kassa' 
      ? '<span style="color:var(--warn);font-size:12px;font-weight:700">To\'lov kutilmoqda 🕒</span>'
      : '<span style="color:var(--accent);font-size:12px;font-weight:700">To\'langan ✓</span>';
    
    div.innerHTML = `
      <div class="kassa-card-head">
        <div>
          <h3>${chk.tableName} &nbsp; ${statusBadge}</h3>
          <p>${tsStr} · ${chk.guestCount} kishi · ${chk.waiterName}</p>
        </div>
      </div>
      <div class="kassa-check-items">
        ${(chk.items || []).map(i => `<div class="check-item-row">• ${i.name} x${i.qty} = ${formatPrice(i.price * i.qty)} so'm</div>`).join('')}
      </div>
      <div class="kassa-check-total">
        Jami: <strong>${formatPrice(chk.totalPrice)} so'm</strong>
      </div>
      ${chk.status === 'kassa' ? `<button class="btn-primary" onclick="openPaymentModal(${chk.id})" style="width:100%;margin-top:10px">💰 To'lov Qabul Qilish</button>` : ''}
    `;
    list.appendChild(div);
  });
}

function kassaDeselectTable() {
  document.getElementById('kassaChecksPanel').style.display = 'none';
  document.querySelectorAll('.table-card').forEach(c => c.classList.remove('active'));
  currentKassaTableId = null;
}

let paymentCheckId = null;

function openPaymentModal(checkId) {
  DB.checks = JSON.parse(localStorage.getItem('mc_checks') || '[]');
  const chk = DB.checks.find(c => c.id === checkId);
  if(!chk) return;
  
  paymentCheckId = checkId;
  document.getElementById('payAmount').textContent = formatPrice(chk.totalPrice);
  document.getElementById('payItemCount').textContent = (chk.items || []).length;
  document.getElementById('paymentModal').style.display = 'flex';
}

function closePaymentModal() {
  document.getElementById('paymentModal').style.display = 'none';
  paymentCheckId = null;
}

function confirmPayment(method) {
  if(!paymentCheckId) return;
  DB.checks = JSON.parse(localStorage.getItem('mc_checks') || '[]');
  const chk = DB.checks.find(c => c.id === paymentCheckId);
  if(!chk) return;
  
  // To'lovni qaysi turda amalga oshirilganini yozish
  chk.paymentMethod = method;
  chk.status = 'paid';
  chk.paidAt = new Date().toISOString();
  deductIngredientsForCheck(chk);
  DB.save('checks');
  
  const methods = { cash: 'Naqd', card: 'Karta', transfer: "Pul o'tkazma", mixed: 'Aralash' };
  showToast(`✓ To'lov qabul qilindi (${methods[method]}). Chek chiqarildi.`);
  simulatePrint(chk);
  
  closePaymentModal();
  DB.setTableStatus(chk.tableId, 'free');
  loadKassa();
  updateKassaBadge();
}


// ===
function freeTableAndPay(checkId) {
  DB.checks = JSON.parse(localStorage.getItem('mc_checks') || '[]');
  const chk = DB.checks.find(c => c.id === checkId);
  if(!chk) return;

  chk.status = 'paid';
  chk.paidAt = new Date().toISOString();
  deductIngredientsForCheck(chk);
  DB.save('checks');
  
  DB.setTableStatus(chk.tableId, 'free');
  
  loadKassa();
  updateKassaBadge();
  showToast('Stol bo\'shatildi va To\'lov qabul qilindi ✓');
}

function printReceiptDirect(checkId) {
  DB.checks = JSON.parse(localStorage.getItem('mc_checks') || '[]');
  const chk = DB.checks.find(c => c.id === checkId);
  if(!chk) return;
  simulatePrint(chk);
  showToast('Chek printerga yuborildi 🖨️');
}

function openKassaCheck(checkId) {
  DB.checks = JSON.parse(localStorage.getItem('mc_checks') || '[]');
  const chk = DB.checks.find(c => c.id===checkId);
  if(!chk) return;
  viewingCheckId = checkId;
  const ts = new Date(chk.createdAt);
  const tsStr = ts.toLocaleString('uz-UZ');
  let itemsHtml = chk.items.map(item => `
    <div class="receipt-row">
      <span>${item.name}</span>
      <span>${item.qty}x${formatPrice(item.price)}=${formatPrice(item.qty*item.price)}</span>
    </div>
  `).join('');
  document.getElementById('receiptContent').innerHTML = `
    <div class="receipt-brand">🌿 Mingchinor Kompleks</div>
    <hr class="receipt-divider">
    <div class="receipt-row"><span>Stol:</span><span>${chk.tableName}</span></div>
    <div class="receipt-row"><span>Sana:</span><span>${tsStr}</span></div>
    <div class="receipt-row"><span>Ofisant:</span><span>${chk.waiterName}</span></div>
    <hr class="receipt-divider">
    ${itemsHtml}
    <hr class="receipt-divider">
    <div class="receipt-row"><strong>Jami:</strong><strong>${formatPrice(chk.totalPrice)} so'm</strong></div>
    <div class="receipt-footer">Yoqimli ishtaxa! 🌿</div>
  `;
  document.getElementById('kassaCheckModal').classList.add('active');
}

function closeKassaCheck() { document.getElementById('kassaCheckModal').classList.remove('active'); }

function printReceipt() {
  if(!viewingCheckId) return;
  DB.checks = JSON.parse(localStorage.getItem('mc_checks') || '[]');
  const chk = DB.checks.find(c => c.id===viewingCheckId);
  if(!chk) return;
  // Mark as paid
  chk.status = 'paid';
  chk.paidAt = new Date().toISOString();
  deductIngredientsForCheck(chk);
  DB.save('checks');
  simulatePrint(chk);
  closeKassaCheck();
  loadKassa();
  updateKassaBadge();
  showToast('Chek chiqarildi ✓');
}

// Retsept bo'yicha taom sotilganda masalliqlar miqdorini ombordan ayiradi.
// Har bir chek faqat bir marta ayiriladi (chk.stockDeducted bilan himoyalangan).
function deductIngredientsForCheck(chk) {
  if(chk.stockDeducted) return;
  DB.menuItems = JSON.parse(localStorage.getItem('mc_menu') || '[]');
  DB.ingredients = JSON.parse(localStorage.getItem('mc_ingredients') || '[]');
  let changed = false;

  (chk.items || []).forEach(chkItem => {
    if(!chkItem.menuItemId || chkItem.menuItemId === 'service_fee') return;
    const menuItem = DB.menuItems.find(m => String(m.id) === String(chkItem.menuItemId));
    if(!menuItem || !Array.isArray(menuItem.recipe) || !menuItem.recipe.length) return;

    menuItem.recipe.forEach(r => {
      const ing = DB.ingredients.find(x => String(x.id) === String(r.ingredientId));
      if(!ing) return;
      const usedQty = (Number(r.qty) || 0) * (Number(chkItem.qty) || 0);
      ing.qty = Math.max(0, (Number(ing.qty) || 0) - usedQty);
      changed = true;
    });
  });

  if(changed) DB.save('ingredients');
  chk.stockDeducted = true;
}

function buildPrintRows(items) {
  return (items || []).map((item, idx) => {
    const qty = Number(item.qty) || 0;
    const price = Number(item.price) || 0;
    const amount = qty * price;
    return {
      serial: idx + 1,
      name: item.name || '-',
      qty,
      amount
    };
  });
}

function escHtml(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toReceiptText(chk, rows) {
  const dateStr = new Date(chk.createdAt || Date.now()).toLocaleString('uz-UZ');
  const lines = [];
  lines.push('MINGCHINOR KOMPLEKS');
  lines.push(`Stol: ${chk.tableName || '-'}`);
  lines.push(`Sana: ${dateStr}`);
  lines.push(`Ofisant: ${chk.waiterName || '-'}`);
  lines.push('--------------------------------');
  lines.push('T/r  Nomi          Miqdori   Puli');
  rows.forEach(r => {
    const idx = String(r.serial).padEnd(3, ' ');
    const name = String(r.name || '-').slice(0, 12).padEnd(12, ' ');
    const qty = String(r.qty).padStart(6, ' ');
    const amount = formatPrice(r.amount).padStart(9, ' ');
    lines.push(`${idx} ${name} ${qty} ${amount}`);
  });
  lines.push('--------------------------------');
  lines.push(`Jami: ${formatPrice(chk.totalPrice || 0)} so'm`);
  return lines.join('\n');
}

function print58mmReceipt(chk, rows) {
  const win = window.open('', '_blank', 'width=420,height=760');
  if(!win) {
    showToast('Print oynasi bloklandi');
    return;
  }

  const dateStr = new Date(chk.createdAt || Date.now()).toLocaleString('uz-UZ');
  const rowsHtml = rows.map(r => `
    <tr>
      <td>${r.serial}</td>
      <td>${escHtml(r.name)}</td>
      <td>${r.qty}</td>
      <td>${formatPrice(r.amount)}</td>
    </tr>
  `).join('');

  const html = `
<!doctype html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <title>Chek</title>
  <style>
    @page { size: 58mm auto; margin: 2mm; }
    * { box-sizing: border-box; }
    html, body {
      width: 58mm;
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      font-family: Arial, sans-serif;
      font-size: 10px;
      line-height: 1.35;
    }
    .receipt { width: 54mm; margin: 0 auto; padding: 1mm 0; }
    .brand { text-align: center; font-size: 12px; font-weight: 700; letter-spacing: .4px; }
    .meta { margin-top: 2mm; }
    .meta-row { display: flex; justify-content: space-between; gap: 4px; }
    .divider { border-top: 1px dashed #000; margin: 2mm 0; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { font-size: 9px; padding: 1px 0; vertical-align: top; word-wrap: break-word; }
    th { border-bottom: 1px solid #000; text-align: left; }
    th:nth-child(1), td:nth-child(1) { width: 12%; }
    th:nth-child(2), td:nth-child(2) { width: 49%; }
    th:nth-child(3), td:nth-child(3) { width: 16%; text-align: center; }
    th:nth-child(4), td:nth-child(4) { width: 23%; text-align: right; }
    .total { margin-top: 2mm; font-size: 11px; font-weight: 700; display: flex; justify-content: space-between; }
    .foot { margin-top: 2mm; text-align: center; font-size: 9px; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="brand">MINGCHINOR KOMPLEKS</div>
    <div class="meta">
      <div class="meta-row"><span>Stol:</span><span>${escHtml(chk.tableName || '-')}</span></div>
      <div class="meta-row"><span>Sana:</span><span>${escHtml(dateStr)}</span></div>
      <div class="meta-row"><span>Ofisant:</span><span>${escHtml(chk.waiterName || '-')}</span></div>
      <div class="meta-row"><span>Mehmon:</span><span>${escHtml(chk.guestCount || '-')}</span></div>
    </div>
    <div class="divider"></div>
    <table>
      <thead>
        <tr><th>T/r</th><th>Nomi</th><th>Miqdori</th><th>Puli</th></tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
    <div class="divider"></div>
    <div class="total"><span>Jami:</span><span>${formatPrice(chk.totalPrice || 0)} so'm</span></div>
    <div class="foot">Xush kelibsiz!</div>
  </div>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
  setTimeout(() => {
    win.focus();
    win.print();
    win.onafterprint = () => win.close();
  }, 150);
}

// Kassa kompyuterida lokal ishlaydigan "print-bridge" server manzili.
// 127.0.0.1 (localhost) har doim "ishonchli manzil" hisoblanadi, shuning
// uchun HTTPS sahifadan ham brauzer uni hech qachon bloklamaydi.
const PRINT_BRIDGE_URL = 'http://127.0.0.1:8787';

function simulatePrint(chk) {
  const rows = buildPrintRows(chk.items);
  print58mmReceipt(chk, rows);

  const ips = JSON.parse(localStorage.getItem('mc_printer_ips') || '{}');
  const ip = ips['kassa'];
  if(!ip) {
    console.warn('[KASSA PRINTER] IP sozlanmagan!');
    showToast('58mm chek ochildi. Kassa printer IP sozlanmagan!');
    return;
  }

  const printData = {
    type: 'KASSA',
    template: 'TABLE_RECEIPT_V1',
    columns: ['T/r', 'Nomi', 'Miqdori', 'Puli'],
    paperWidthMm: 58,
    paperColor: 'white',
    tableName: chk.tableName,
    waiter: chk.waiterName,
    guestCount: chk.guestCount,
    createdAt: chk.createdAt,
    rows,
    items: chk.items,
    receiptText: toReceiptText(chk, rows),
    total: chk.totalPrice,
    totalLabel: 'Jami',
    currency: "so'm",
    time: new Date().toLocaleTimeString('uz-UZ')
  };

  console.log(`[PRINT REQUEST to KASSA IP: ${ip}]`, JSON.stringify(printData, null, 2));
  fetch(`${PRINT_BRIDGE_URL}/print?ip=${encodeURIComponent(ip)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(printData)
  }).catch(e => {
    console.warn('[KASSA PRINTER] Bridge orqali ulanish xatosi:', e.message);
    showToast('⚠️ Print-bridge dastur ishlamayapti. "node print-bridge.js" ni ishga tushiring.');
  });
}

// ============================================================
// TABLES
// ============================================================
function loadTables() {
  DB.tables = JSON.parse(localStorage.getItem('mc_tables') || '[]');
  const grid = document.getElementById('tablesGrid');
  grid.innerHTML = '';
  DB.tables.forEach(table => {
    const div = document.createElement('div');
    div.className = 'table-admin-card';
    div.innerHTML = `
      <span class="t-icon">${table.status==='busy'?'🔴':'🟢'}</span>
      <span class="t-name">${table.name}</span>
      <span class="t-status ${table.status}">${table.status==='busy'?'Band':'Bo\'sh'}</span>
      <div class="table-actions">
        <button class="btn-icon danger" onclick="removeTable(${table.id})" title="O'chirish">🗑️</button>
      </div>
    `;
    grid.appendChild(div);
  });
}

function addTable() {
  const name = document.getElementById('tableNameInput').value.trim();
  if(!name) { showToast('Stol nomini kiriting'); return; }
  DB.tables = JSON.parse(localStorage.getItem('mc_tables') || '[]');
  DB.tables.push({ id: DB.nextId(DB.tables), name, status: 'free' });
  DB.save('tables');
  DB.broadcast('tables_updated', {});
  document.getElementById('tableNameInput').value = '';
  loadTables();
  showToast(`"${name}" qo'shildi`);
}

function removeTable(id) {
  if(!confirm("Stolni o'chirasizmi?")) return;
  DB.tables = JSON.parse(localStorage.getItem('mc_tables') || '[]');
  DB.tables = DB.tables.filter(t => t.id!==id);
  DB.save('tables');
  DB.broadcast('tables_updated', {});
  loadTables();
  showToast("Stol o'chirildi");
}

// ============================================================
// WAITERS
// ============================================================
function loadWaiters() {
  DB.waiters = JSON.parse(localStorage.getItem('mc_waiters') || '[]');
  DB.checks = JSON.parse(localStorage.getItem('mc_checks') || '[]');
  
  const fee = localStorage.getItem('mc_service_fee') || '0';
  const feeInput = document.getElementById('globalServiceFee');
  if(feeInput) feeInput.value = fee;

  const today = new Date().toDateString();
  const list = document.getElementById('waitersList');
  const nonAdmin = DB.waiters.filter(w => w.role !== 'admin');
  if(!nonAdmin.length) {
    list.innerHTML = '<div class="empty-state"><span>👨‍🍳</span><p>Ofisantlar yo\'q</p></div>';
    return;
  }
  list.innerHTML = '';
  nonAdmin.forEach(w => {
    const todayCount = DB.checks.filter(c => c.waiterId===w.id && new Date(c.createdAt).toDateString()===today).length;
    const div = document.createElement('div');
    div.className = 'waiter-card';
    div.innerHTML = `
      <div class="waiter-card-left" onclick="openEditWaiter(${w.id})">
        <div class="waiter-avatar">👤</div>
        <div class="waiter-info">
          <h4>${w.name} ${w.surname}</h4>
          <p>@${w.login}</p>
          <p style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px">${w.role === 'cashier' ? 'Kassir' : 'Ofisant'}</p>
          <p class="waiter-stats">Bugun: ${todayCount} mijoz</p>
        </div>
      </div>
      <div class="waiter-actions">
        <button class="btn-icon edit" onclick="openEditWaiter(${w.id})">✏️</button>
        <button class="btn-icon danger" onclick="deleteWaiter(${w.id})">🗑️</button>
      </div>
    `;
    list.appendChild(div);
  });
}

function addWaiter() {
  DB.waiters = JSON.parse(localStorage.getItem('mc_waiters') || '[]');
  const name = document.getElementById('wFirstName').value.trim();
  const surname = document.getElementById('wLastName').value.trim();
  const login = document.getElementById('wLogin').value.trim();
  const pass = document.getElementById('wPass').value;
  const role = document.getElementById('wRole') ? document.getElementById('wRole').value : 'waiter';
  const errEl = document.getElementById('waiterFormErr');
  errEl.style.display = 'none';
  if(!name||!surname||!login||!pass) { errEl.textContent='Barcha maydonlarni to\'ldiring'; errEl.style.display='block'; return; }
  if(DB.waiters.find(w => w.login===login)) { errEl.textContent='Bu login band'; errEl.style.display='block'; return; }
  DB.waiters.push({ id: DB.nextId(DB.waiters), name, surname, login, password: pass, role: 'waiter', servedToday: 0 });
  DB.save('waiters');
  ['wFirstName','wLastName','wLogin','wPass'].forEach(id => document.getElementById(id).value='');
  loadWaiters();
  showToast(`${name} qo'shildi`);
}

function openEditWaiter(id) {
  DB.waiters = JSON.parse(localStorage.getItem('mc_waiters') || '[]');
  const w = DB.waiters.find(x => x.id===id);
  if(!w) return;
  document.getElementById('editWaiterId').value = id;
  document.getElementById('ewFirst').value = w.name;
  document.getElementById('ewLast').value = w.surname;
  document.getElementById('ewLogin').value = w.login;
  document.getElementById('ewPass').value = w.password;
  document.getElementById('ewRole').value = w.role === 'cashier' ? 'cashier' : 'waiter';

  // Qurilma-qulfi holati (faqat ofisant/kassir uchun mantiqli - admin uchun ko'rsatilmaydi)
  const statusBox = document.getElementById('ewDeviceStatus');
  const statusText = document.getElementById('ewDeviceStatusText');
  if(w.activeDeviceId) {
    statusBox.style.display = 'block';
    statusText.textContent = `🔒 Ushbu hisob hozir bitta qurilmada band (${w.deviceBoundAt ? new Date(w.deviceBoundAt).toLocaleString('uz-UZ') : 'vaqt noma\'lum'})`;
  } else {
    statusBox.style.display = 'block';
    statusText.textContent = '🔓 Hech qanday qurilmaga bog\'lanmagan';
  }

  document.getElementById('editWaiterModal').classList.add('active');
}

function closeEditWaiter() { document.getElementById('editWaiterModal').classList.remove('active'); }

function saveEditWaiter() {
  const id = parseInt(document.getElementById('editWaiterId').value);
  DB.waiters = JSON.parse(localStorage.getItem('mc_waiters') || '[]');
  const w = DB.waiters.find(x => x.id===id);
  if(!w) return;
  const newLogin = document.getElementById('ewLogin').value.trim();
  if(DB.waiters.find(x => x.login===newLogin && x.id!==id)) { showToast('Bu login band!'); return; }
  w.name = document.getElementById('ewFirst').value.trim();
  w.surname = document.getElementById('ewLast').value.trim();
  w.login = newLogin;
  w.password = document.getElementById('ewPass').value;
  w.role = document.getElementById('ewRole').value;
  DB.save('waiters');
  closeEditWaiter();
  loadWaiters();
  showToast('Xodim yangilandi');
}

// Xodimning telefoniga bog'langan qulfni admin tomonidan qo'lda bo'shatish
// (masalan, telefon almashtirilganda yoki yo'qolganda kerak bo'ladi)
function unbindWaiterDevice() {
  const id = parseInt(document.getElementById('editWaiterId').value);
  DB.waiters = JSON.parse(localStorage.getItem('mc_waiters') || '[]');
  const w = DB.waiters.find(x => x.id===id);
  if(!w) return;
  delete w.activeDeviceId;
  delete w.deviceBoundAt;
  DB.save('waiters');
  showToast('Qurilma qulfi bo\'shatildi ✓');
  openEditWaiter(id); // statusni yangilash
}

function deleteWaiter(id) {
  if(!confirm("Xodimni o'chirasizmi?")) return;
  DB.waiters = JSON.parse(localStorage.getItem('mc_waiters') || '[]');
  DB.waiters = DB.waiters.filter(w => w.id!==id);
  DB.save('waiters');
  loadWaiters();
  showToast('Xodim o\'chirildi');
}

function saveServiceFee() {
  const fee = parseInt(document.getElementById('globalServiceFee').value) || 0;
  localStorage.setItem('mc_service_fee', fee);
  showToast('Xizmat haqi saqlandi');
}

// ---- REALTIME ----
function setupRealtime() {
  const isReportsOpen = () => document.getElementById('sectionReports').classList.contains('active');
  const isKassaOpen = () => document.getElementById('sectionKassa').classList.contains('active');

  // Firestore real-time (boshqa qurilmalar)
  window.addEventListener('mc:data_changed', e => {
    const { key } = e.detail;
    if(key === 'checks') {
      updateKassaBadge();
      if(isKassaOpen()) loadKassa();
      if(isReportsOpen()) loadReport();
    }
    if(key === 'waiters' && isReportsOpen()) {
      loadReport();
    }
    if(key === 'ingredients' && document.getElementById('sectionIngredients').classList.contains('active')) {
      renderIngredientsTable();
    }
  });
  // localStorage real-time (bir xil qurilmadagi boshqa tablar)
  window.addEventListener('storage', e => {
    if(e.key === 'mc_event') {
      try {
        const ev = JSON.parse(e.newValue);
        if(ev.event==='check_ready' || ev.event==='check_paid') {
          updateKassaBadge();
          if(isKassaOpen()) loadKassa();
          if(isReportsOpen()) loadReport();
        }
      } catch(err){}
    }
    if(e.key === 'mc_checks') {
      DB.checks = JSON.parse(e.newValue || '[]');
      updateKassaBadge();
      if(isReportsOpen()) loadReport();
    }
    if(e.key === 'mc_waiters') {
      DB.waiters = JSON.parse(e.newValue || '[]');
      if(isReportsOpen()) loadReport();
    }
  });
  setInterval(updateKassaBadge, 5000);
}

// ---- HELPERS ----
function formatPrice(n) { return (n||0).toLocaleString('uz-UZ'); }

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

document.addEventListener('keydown', e => {
  if(e.key==='Enter' && document.getElementById('loginScreen').style.display!=='none') doAdminLogin();
});

// ============================================================
// PRINTERS
// ============================================================
function loadPrinters() {
  const ips = JSON.parse(localStorage.getItem('mc_printer_ips') || '{"kassa":"","milliy":"","kabob":"","baliq":""}');
  const binds = JSON.parse(localStorage.getItem('mc_printer_binds') || '{"milliy":[],"kabob":[],"baliq":[]}');
  DB.categories = JSON.parse(localStorage.getItem('mc_categories') || '[]');

  ['kassa','milliy','kabob','baliq'].forEach(type => {
    const ipInput = document.getElementById(`pip-${type}`);
    if(ipInput) ipInput.value = ips[type] || '';
    
    // Bindings render
    if(type !== 'kassa') {
      const bindContainer = document.getElementById(`pbind-${type}`);
      const catsLabel = document.getElementById(`pcats-${type}`);
      if(bindContainer && catsLabel) {
        bindContainer.innerHTML = '';
        const myBinds = binds[type] || [];
        
        let boundNames = [];
        DB.categories.forEach(cat => {
          const strCatId = String(cat.id);
          const isChecked = myBinds.map(x => String(x)).includes(strCatId);
          if(isChecked) boundNames.push(cat.name);
          
          const lbl = document.createElement('label');
          lbl.className = 'printer-cat-check';
          lbl.innerHTML = `<input type="checkbox" onchange="togglePrinterBind('${type}', '${strCatId}', this.checked)" ${isChecked ? 'checked' : ''}> ${cat.name}`;
          bindContainer.appendChild(lbl);
        });
        
        catsLabel.textContent = boundNames.length ? boundNames.join(', ') : 'Kategoriya bog\'lanmagan';
      }
    }
  });

  // Panelni ochganda darhol barcha printerlarni tekshir
  setTimeout(() => pingAllPrinters(), 300);
}

function savePrinterIP(type, ip) {
  const ips = JSON.parse(localStorage.getItem('mc_printer_ips') || '{"kassa":"","milliy":"","kabob":"","baliq":""}');
  ips[type] = ip;
  localStorage.setItem('mc_printer_ips', JSON.stringify(ips));
}

function togglePrinterBind(type, catId, isChecked) {
  const binds = JSON.parse(localStorage.getItem('mc_printer_binds') || '{"milliy":[],"kabob":[],"baliq":[]}');
  if(!binds[type]) binds[type] = [];
  const strId = String(catId); // har doim string sifatida saqlaymiz
  if(isChecked) {
    if(!binds[type].includes(strId)) binds[type].push(strId);
  } else {
    binds[type] = binds[type].filter(id => String(id) !== strId);
  }
  localStorage.setItem('mc_printer_binds', JSON.stringify(binds));
  loadPrinters(); // refresh labels
}

const PRINTER_LABELS = { kassa: 'Kassa', milliy: 'Milliy Taomlar', kabob: 'Kabobxona', baliq: 'Baliqxona' };

function setPrinterStatus(type, status, latencyMs) {
  const dot = document.getElementById(`pdot-${type}`);
  const txt = document.getElementById(`ptxt-${type}`);
  const card = document.getElementById(`pcard-${type}`);
  if(!dot || !txt) return;

  dot.className = `status-dot ${status}`;
  if(status === 'online') {
    txt.textContent = latencyMs !== undefined ? `Onlayn (${latencyMs}ms)` : 'Onlayn ✓';
    if(card) card.classList.add('printer-online');
    if(card) card.classList.remove('printer-offline');
  } else if(status === 'offline') {
    txt.textContent = 'Oflayn — topilmadi';
    if(card) card.classList.add('printer-offline');
    if(card) card.classList.remove('printer-online');
  } else if(status === 'pinging') {
    txt.textContent = 'Tekshirilmoqda...';
    if(card) card.classList.remove('printer-online','printer-offline');
  } else {
    txt.textContent = 'IP kiritilmagan';
    if(card) card.classList.remove('printer-online','printer-offline');
  }
}

async function pingSingle(type) {
  const ips = JSON.parse(localStorage.getItem('mc_printer_ips') || '{}');
  const ip = ips[type];
  const label = PRINTER_LABELS[type] || type;

  if(!ip || ip.trim() === '') {
    showToast(`${label}: IP manzil kiritilmagan`);
    setPrinterStatus(type, 'unknown');
    return;
  }

  const isValidIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(ip.trim());
  if(!isValidIp) {
    showToast(`${label}: Noto'g'ri IP format`);
    setPrinterStatus(type, 'offline');
    return;
  }

  setPrinterStatus(type, 'pinging');

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${PRINT_BRIDGE_URL}/ping?ip=${encodeURIComponent(ip.trim())}`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timer);
    if(!res.ok) throw new Error('bridge_bad_response');
    const data = await res.json();

    if(data.online) {
      setPrinterStatus(type, 'online', data.latency);
      showToast(`✅ ${label} onlayn (${data.latency}ms)`);
    } else {
      setPrinterStatus(type, 'offline');
      showToast(`❌ ${label}: Printer javob bermadi`);
    }
  } catch(e) {
    setPrinterStatus(type, 'offline');
    if(e.name === 'AbortError') {
      showToast(`❌ ${label}: Bridge server javob bermadi (timeout)`);
    } else {
      showToast(`⚠️ Print-bridge dastur ishlamayapti. Kassa kompyuterida "node print-bridge.js" ni ishga tushiring.`);
    }
  }
}

function pingAllPrinters() {
  ['kassa','milliy','kabob','baliq'].forEach((type, i) => {
    setTimeout(() => pingSingle(type), i * 400); // ketma-ket ping
  });
}

// Avtomatik har 30 soniyada tekshirish (printers bo'limi ochiq bo'lsa)
let _autoPingInterval = null;
function startAutoPing() {
  stopAutoPing();
  _autoPingInterval = setInterval(() => {
    if(document.getElementById('sectionPrinters') &&
       document.getElementById('sectionPrinters').classList.contains('active')) {
      pingAllPrinters();
    }
  }, 30000);
}
function stopAutoPing() {
  if(_autoPingInterval) { clearInterval(_autoPingInterval); _autoPingInterval = null; }
}


