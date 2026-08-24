// ============================================================
// MINGCHINOR KOMPLEKS — Print Bridge Server
// print-bridge.js
//
// NIMA UCHUN KERAK:
// Admin panel (admin-menu.html) https:// orqali ochilganda, brauzer
// xavfsizlik siyosati (Mixed Content) tufayli LAN ichidagi http://
// printerlarga TO'G'RIDAN-TO'G'RI so'rov yuborishga yo'l qo'ymaydi.
// Biroq brauzer 127.0.0.1 (localhost) manziliga so'rov yuborishni HECH
// QACHON bloklamaydi. Shu sababli bu kichik dastur kassa kompyuterida
// background'da ishlab turadi: admin panel unga (127.0.0.1:8787) murojaat
// qiladi, u esa o'zi (oddiy Node.js dastur, brauzer emas — hech qanday
// cheklovga bog'liq emas) haqiqiy printer IP siga ulanadi.
//
// ISHGA TUSHIRISH:
//   1) Kompyuterda Node.js o'rnatilgan bo'lishi kerak (nodejs.org)
//   2) Terminal/CMD da shu papkaga o'ting va bering:
//        node print-bridge.js
//   3) "Print-bridge server ishga tushdi: http://127.0.0.1:8787" degan
//      xabarni ko'rsangiz — tayyor. Admin panelni ochib, "Xprinterlar"
//      bo'limida "Tekshirish" tugmasini bosing.
//   4) Dastur doim fon rejimida ishlab turishi kerak (kompyuter yoqilganda
//      avtomatik ishga tushirish uchun Windows Task Scheduler yoki "pm2"
//      kabi vositalardan foydalanish tavsiya etiladi).
//
// MUHIM ESLATMA (printer porti haqida):
// Ko'pchilik tarmoqli chek printerlari (shu jumladan Xprinter modellari)
// standart holda TCP 9100-portda "raw"/ESC-POS ma'lumotlarini qabul
// qiladi. Quyidagi kod aynan shu portga ulanadi. Agar sizning
// printeringiz boshqa portda ishlasa (masalan, o'zining HTTP serveri
// bo'lsa), PRINTER_PORT o'zgaruvchisini yoki pingPrinter/sendToPrinter
// funksiyalarini printeringiz hujjatiga mos ravishda o'zgartiring.
// ============================================================

const http = require('http');
const net = require('net');
const url = require('url');

const BRIDGE_PORT = 8787;
const PRINTER_PORT = 9100;   // Standart ESC/POS tarmoq printer porti
const CONNECT_TIMEOUT_MS = 2500;

// ---- Printerga TCP orqali ulanishni tekshirish (ping) ----
function pingPrinter(ip) {
  return new Promise(resolve => {
    const t0 = Date.now();
    const socket = new net.Socket();
    let done = false;

    const finish = online => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve({ online, latency: Date.now() - t0 });
    };

    socket.setTimeout(CONNECT_TIMEOUT_MS);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));

    socket.connect(PRINTER_PORT, ip);
  });
}

// ---- Printerga chek ma'lumotini yuborish (oddiy matn sifatida) ----
function sendToPrinter(ip, printData) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let done = false;

    const finish = (err) => {
      if (done) return;
      done = true;
      socket.destroy();
      if (err) reject(err); else resolve();
    };

    socket.setTimeout(CONNECT_TIMEOUT_MS);
    socket.once('timeout', () => finish(new Error('timeout')));
    socket.once('error', err => finish(err));

    socket.connect(PRINTER_PORT, ip, () => {
      // ESC/POS: printerni ishga tushirish (init) + matn + qog'ozni kesish
      const ESC = '\x1b';
      const GS = '\x1d';
      const init = ESC + '@';
      const cut = GS + 'V' + '\x00';
      const text = (printData.receiptText || '') + '\n\n\n';
      socket.write(init + text + cut, 'binary', () => finish(null));
    });
  });
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    // Admin panel boshqa origin'dan (masalan https://sizning-sayt.com) so'rov
    // yuboradi, shuning uchun CORS ruxsati kerak.
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);

  if (req.method === 'OPTIONS') {
    // CORS preflight
    sendJson(res, 200, { ok: true });
    return;
  }

  if (parsed.pathname === '/ping' && req.method === 'GET') {
    const ip = (parsed.query.ip || '').toString().trim();
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
      sendJson(res, 400, { online: false, error: 'invalid_ip' });
      return;
    }
    const result = await pingPrinter(ip);
    sendJson(res, 200, result);
    return;
  }

  if (parsed.pathname === '/print' && req.method === 'POST') {
    const ip = (parsed.query.ip || '').toString().trim();
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
      sendJson(res, 400, { ok: false, error: 'invalid_ip' });
      return;
    }
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async () => {
      try {
        const printData = JSON.parse(body || '{}');
        await sendToPrinter(ip, printData);
        console.log(`[PRINT-BRIDGE] ✅ Chek printerga yuborildi: ${ip}`);
        sendJson(res, 200, { ok: true });
      } catch (e) {
        console.warn(`[PRINT-BRIDGE] ❌ Print xatosi (${ip}):`, e.message);
        sendJson(res, 502, { ok: false, error: e.message });
      }
    });
    return;
  }

  sendJson(res, 404, { error: 'not_found' });
});

server.listen(BRIDGE_PORT, '127.0.0.1', () => {
  console.log(`✅ Print-bridge server ishga tushdi: http://127.0.0.1:${BRIDGE_PORT}`);
  console.log(`   Admin panel endi shu server orqali LAN printerlarga ulanadi.`);
  console.log(`   Dasturni yopmang — u fon rejimida ishlab turishi kerak.`);
});
