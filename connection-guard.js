/*
 * CONNECTION GUARD — Internet/Wi-Fi holatini kuzatish
 * Bu dastur Firebase realtime'ga bog'liq bo'lgani uchun,
 * internet uzilganda ekranni bloklab, foydalanuvchini ogohlantiradi.
 *
 * Ishlaydi ham brauzerda (navigator.onLine), ham Electron desktop'da
 * (window.electronAPI orqali haqiqiy tarmoq tekshiruvi bilan) — muhitga moslashadi.
 */
(function () {
  let overlay = null;
  let isBlocked = false;
  let checkTimer = null;

  function createOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'connectionGuardOverlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 999999;
      background: rgba(10,12,20,0.96);
      display: none; align-items: center; justify-content: center;
      flex-direction: column; color: #fff;
      font-family: 'Segoe UI', Tahoma, sans-serif;
      text-align: center; backdrop-filter: blur(4px);
    `;
    overlay.innerHTML = `
      <div style="font-size:64px;margin-bottom:16px">📡</div>
      <div style="font-size:22px;font-weight:700;margin-bottom:8px">Internet aloqasi yo'qoldi</div>
      <div style="font-size:14px;color:#9aa3b8;max-width:420px;line-height:1.5;margin-bottom:20px">
        Bu dastur internet (Wi-Fi) orqali serverga ulanishi kerak.
        Iltimos Wi-Fi ulanishini tekshiring — aloqa tiklangach dastur avtomatik davom etadi.
      </div>
      <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#6c8fff">
        <div id="cgSpinner" style="width:14px;height:14px;border:2px solid #6c8fff;border-top-color:transparent;border-radius:50%;animation:cgSpin 0.8s linear infinite"></div>
        <span>Qayta ulanishga urinilmoqda...</span>
      </div>
      <style>@keyframes cgSpin{to{transform:rotate(360deg)}}</style>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function showBlock() {
    if (isBlocked) return;
    isBlocked = true;
    createOverlay().style.display = 'flex';
  }

  function hideBlock() {
    if (!isBlocked) return;
    isBlocked = false;
    if (overlay) overlay.style.display = 'none';
  }

  // Haqiqiy tarmoq tekshiruvi (Firestore'ga yengil so'rov)
  async function pingServer() {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 4000);
      await fetch('https://firestore.googleapis.com/', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(t);
      return true;
    } catch (e) {
      return false;
    }
  }

  async function checkNow() {
    // 1) Electron muhitida bo'lsa — main process orqali aniq tekshirish
    if (window.electronAPI && window.electronAPI.checkConnection) {
      // onConnectionStatus eventi orqali kelib turadi, lekin darhol ham so'raymiz
      return;
    }
    // 2) Brauzer muhiti — navigator.onLine + real ping
    if (!navigator.onLine) {
      showBlock();
      return;
    }
    const ok = await pingServer();
    if (ok) hideBlock(); else showBlock();
  }

  // Electron muhitida real-time status kelib turadi
  if (window.electronAPI && window.electronAPI.onConnectionStatus) {
    window.electronAPI.onConnectionStatus((online) => {
      if (online) hideBlock(); else showBlock();
    });
  }

  // Brauzer eventlari (har ikkala muhitda ham ishlaydi, zarar qilmaydi)
  window.addEventListener('online', checkNow);
  window.addEventListener('offline', showBlock);

  // Har 6 soniyada tekshirish (faqat brauzer rejimida faol foydalaniladi)
  checkTimer = setInterval(checkNow, 6000);

  // Boshlang'ich tekshiruv
  document.addEventListener('DOMContentLoaded', checkNow);
})();
