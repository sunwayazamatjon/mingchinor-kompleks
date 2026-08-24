// ============================================================
// MINGCHINOR KOMPLEKS — Firebase Data Store (data.js)
// Ma'lumotlar Firebase Firestore da saqlanadi
// Ko'p kafe qo'llab-quvvatlaydi (?cafe=ID URL parametri)
// ============================================================

// ---- FIREBASE INIT ----
if (!firebase.apps || !firebase.apps.length) {
  firebase.initializeApp(FIREBASE_CONFIG);
}
const _fs = firebase.firestore();

// ---- KAFE ID ----
const CAFE_ID = (new URLSearchParams(window.location.search).get('cafe') || DEFAULT_CAFE_ID).toLowerCase().trim();

// ---- FIRESTORE DOCUMENT REFERENCES ----
// Har bir ma'lumot turi alohida hujjat: cafes/{cafeId}/data/{type}
function _ref(type) {
  return _fs.collection('cafes').doc(CAFE_ID).collection('data').doc(type);
}
function _eventsRef() {
  return _fs.collection('cafes').doc(CAFE_ID).collection('events');
}

// ---- DEFAULT DATA ----
const _defaults = {
  categories: [],
  menu:        [],
  ingredients: [],
  tables: [
    {id:1,name:'Stol 1',status:'free'},
    {id:2,name:'Stol 2',status:'free'},
    {id:3,name:'Stol 3',status:'free'},
    {id:4,name:'Stol 4',status:'free'},
    {id:5,name:'Stol 5',status:'free'},
    {id:6,name:'Stol 6',status:'free'},
  ],
  waiters: [
    {id:1,name:'Admin',surname:'Admin',login:'admin',password:'admin123',role:'admin',servedToday:0}
  ],
  orders:      [],
  checks:      [],
  waiterCalls: []
};

// localStorage key mapping
const _lsKey = {
  categories:  'mc_categories',
  menuItems:   'mc_menu',
  ingredients: 'mc_ingredients',
  tables:      'mc_tables',
  waiters:     'mc_waiters',
  orders:      'mc_orders',
  checks:      'mc_checks',
  waiterCalls: 'mc_waiter_calls'
};

// DB key ↔ Firestore doc id mapping
const _fsKey = {
  categories:  'categories',
  menuItems:   'menu',
  ingredients: 'ingredients',
  tables:      'tables',
  waiters:     'waiters',
  orders:      'orders',
  checks:      'checks',
  waiterCalls: 'waiterCalls'
};

// ---- DB OBJECT ----
const DB = {
  // In-memory cache (localStorage fallback initially)
  categories:  JSON.parse(localStorage.getItem('mc_categories')  || '[]'),
  menuItems:   JSON.parse(localStorage.getItem('mc_menu')         || '[]'),
  ingredients: JSON.parse(localStorage.getItem('mc_ingredients')  || '[]'),
  tables:      JSON.parse(localStorage.getItem('mc_tables')       || JSON.stringify(_defaults.tables)),
  waiters:     JSON.parse(localStorage.getItem('mc_waiters')      || JSON.stringify(_defaults.waiters)),
  orders:      JSON.parse(localStorage.getItem('mc_orders')       || '[]'),
  checks:      JSON.parse(localStorage.getItem('mc_checks')       || '[]'),
  waiterCalls: JSON.parse(localStorage.getItem('mc_waiter_calls') || '[]'),

  cafeId: CAFE_ID,
  _ready: false,

  // ---- SAVE ----
  // Firestore + localStorage ga bir vaqtda saqlaydi
  save(key) {
    const fsDocId = _fsKey[key]; // e.g. 'categories', 'menu', etc.
    const lsK     = _lsKey[key];
    if (!fsDocId || !lsK) return;

    const data = this[key];
    // 1. localStorage (offline fallback)
    localStorage.setItem(lsK, JSON.stringify(data));
    // 2. Firestore (bulut)
    _ref(fsDocId).set({ items: data }).catch(e => {
      console.warn('[DB] Firestore save error:', key, e);
    });
  },

  // ---- HELPERS ----
  nextId(arr) {
    return arr.length ? Math.max(...arr.map(x => x.id || 0)) + 1 : 1;
  },
  getTable(id)    { return this.tables.find(t => t.id == id); },
  getWaiter(id)   { return this.waiters.find(w => w.id == id); },
  getMenuItem(id) { return this.menuItems.find(m => m.id == id); },

  setTableStatus(id, status) {
    const t = this.getTable(id);
    if (t) { t.status = status; this.save('tables'); }
  },

  addOrder(order) {
    order.id        = this.nextId(this.orders);
    order.createdAt = new Date().toISOString();
    order.status    = 'pending';
    this.orders.push(order);
    this.save('orders');
    this.setTableStatus(order.tableId, 'busy');
    return order;
  },

  addCheck(check) {
    check.id        = this.nextId(this.checks);
    check.createdAt = new Date().toISOString();
    this.checks.push(check);
    this.save('checks');
    return check;
  },

  // ---- BROADCAST ----
  // Boshqa qurilmalarga real-time xabar yuboradi (Firestore + localStorage)
  broadcast(event, data) {
    const payload = { event, data, ts: Date.now() };
    // localStorage (bir qurilmadagi boshqa tab'lar uchun)
    localStorage.setItem('mc_event', JSON.stringify(payload));
    // Firestore (boshqa qurilmalar uchun) — eski eventlarni tozalaymiz
    _eventsRef().add(payload).then(doc => {
      // 10 soniyadan keyin o'chirish
      setTimeout(() => doc.delete().catch(() => {}), 10000);
    }).catch(e => console.warn('[DB] broadcast error:', e));
  }
};

// ---- FIRESTORE DAN YUKLASH ----
async function _loadFromFirestore() {
  const keys = ['categories', 'menu', 'ingredients', 'tables', 'waiters', 'orders', 'checks', 'waiterCalls'];
  const dbMap = {
    categories:  'categories',
    menu:        'menuItems',
    ingredients: 'ingredients',
    tables:      'tables',
    waiters:     'waiters',
    orders:      'orders',
    checks:      'checks',
    waiterCalls: 'waiterCalls'
  };

  try {
    const snaps = await Promise.all(keys.map(k => _ref(k).get()));
    snaps.forEach((snap, i) => {
      const key   = keys[i];
      const dbKey = dbMap[key];
      if (snap.exists && Array.isArray(snap.data().items)) {
        DB[dbKey] = snap.data().items;
        localStorage.setItem(_lsKey[dbKey] || ('mc_' + key), JSON.stringify(DB[dbKey]));
      } else {
        // Firestore da yo'q — defaults ni yuklash
        const def = _defaults[key];
        if (def && def.length) {
          DB[dbKey] = def;
          _ref(key).set({ items: def }).catch(() => {});
          localStorage.setItem(_lsKey[dbKey] || ('mc_' + key), JSON.stringify(def));
        }
      }
    });
    console.log(`[DB] ✅ Firestore yuklandi (kafe: "${CAFE_ID}")`);
  } catch (e) {
    console.warn('[DB] ⚠️ Firestore yuklanmadi, localStorage ishlatilmoqda:', e.message);
  }
}

// ---- REAL-TIME TINGLOVCHILAR (onSnapshot) ----
function _setupListeners() {
  const watch = {
    categories:  'categories',
    menu:        'menuItems',
    ingredients: 'ingredients',
    tables:      'tables',
    orders:      'orders',
    checks:      'checks',
    waiterCalls: 'waiterCalls'
  };

  Object.entries(watch).forEach(([fsDocId, dbKey]) => {
    _ref(fsDocId).onSnapshot(snap => {
      if (!snap.exists) return;
      const items = snap.data().items;
      if (!Array.isArray(items)) return;
      DB[dbKey] = items;
      localStorage.setItem(_lsKey[dbKey] || ('mc_' + fsDocId), JSON.stringify(items));
      // UI ni xabardor qilish
      window.dispatchEvent(new CustomEvent('mc:data_changed', { detail: { key: dbKey, items } }));
    }, err => console.warn('[DB] onSnapshot error:', fsDocId, err.message));
  });

  // Boshqa qurilmalardan kelgan eventlar
  _eventsRef()
    .orderBy('ts', 'desc')
    .limit(1)
    .onSnapshot(snap => {
      snap.docChanges().forEach(change => {
        if (change.type !== 'added') return;
        const ev = change.doc.data();
        // Faqat so'nggi 8 soniya ichidagi eventlar
        if (Date.now() - ev.ts > 8000) return;
        window.dispatchEvent(new CustomEvent('mc:' + ev.event, { detail: ev.data }));
      });
    }, () => {});
}

// ---- CROSS-TAB (bir qurilmada) — localStorage ----
window.addEventListener('storage', e => {
  if (e.key === 'mc_event') {
    try {
      const ev = JSON.parse(e.newValue);
      window.dispatchEvent(new CustomEvent('mc:' + ev.event, { detail: ev.data }));
    } catch (_) {}
  }
});

// ---- BOOTSTRAP ----
// DOMContentLoaded da Firestore dan yuklaydi, tayyor bo'lganda 'mc:db_ready' event chiqaradi
window.addEventListener('DOMContentLoaded', async () => {
  await _loadFromFirestore();
  _setupListeners();
  DB._ready = true;
  window.dispatchEvent(new Event('mc:db_ready'));
});
