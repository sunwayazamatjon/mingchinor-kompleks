# Mingchinor Kafe - Boshqa kompyuterga o'rnatish qo'llanmasi

Ushbu dastur **Kafe serveri** sifatida ishlaydigan bitta asosiy kompyuterga o'rnatilishi va u orqali lokal tarmoqdagi (Wi-Fi) barcha ofitsiantlar, adminlar va mijozlar telefon / planshet orqali ulanishi uchun mo'ljallangan.

## 1. Dastlabki talablar (Prerequisites)
Yangi kompyuterga dasturni o'rnatish uchun quyidagilarni o'rnatishingiz shart:
1. **Node.js**: [nodejs.org](https://nodejs.org) saytidan lts (Long Term Support) versiyasini yuklab o'rnating.
2. **Docker Desktop**: [docker.com](https://www.docker.com/products/docker-desktop/) saytidan yuklab o'rnating (Redis ma'lumotlar bazasi uchun).
   *Eslatma:* Docker o'rnatilgach, kompyuter qayta ishga tushishi va Docker orqa fonda ishlashni davom ettirishi kerak.

## 2. Dasturni ishga tushirish
1. Dastur fayllari (papka) ni yangi kompyuterga ko'chiring.
2. Papka ichiga kirib, `start.bat` fayliga ikki marta bosing.
3. Birinchi marta ishlaganda internet orqali kerakli kutubxonalar (`node_modules`) qilinadi.
4. Va nihoyat ekranda ikkita qora oyna chiqadi (Backend va Frontend server). Dastur ishga tushdi!

---

## 3. Lokal tarmoq (Wi-Fi) orqali boshqa qurilmalardan (telefonlardan) ulanish

Dastur faqat server kompyuterning o'zida ishlashi uchun emas, boshqa telefonlardan guruh bo'lib ishlashi uchun ham mo'ljallangan. Boshqa telefondan (ofitsiantlar, mijozlar) ulanish uchun:

1. Asosiy kompyuteringiz (Server) va ulanmoqchi bo'lgan telefonlar **bitta Wi-Fi tarmog'iga** ulangan bo'lishi shart.
2. Server kompyuteringizning **IP manzilini** aniqlang:
   - Klaviaturada `Win + R` bosing, `cmd` yozib Enter bo'sing.
   - Qora oynada `ipconfig` buyrug'ini tering.
   - `IPv4 Address` deb yozilgan joydagi raqamni toping (masalan, `192.168.1.100`).
3. Telefoningiz (yoki planshet/boshqa noutbuk) dagi brauzerga o'sha manzilni yozasiz, masalan:
   - **Mijozlar menyusi**: `http://192.168.1.100:3000`
   - **Admin menyu**: `http://192.168.1.100:3000/admin-menu.html`
   - **Ofitsiant paneli**: `http://192.168.1.100:3000/admin-panel.html`

> **Muhim:** Endilikda dasturning manba kodlaridagi API manzillari qaysi kompyuterdan/telefondan kirilsa ham *avtomatik* ravishda o'sha to'g'ri (dynamic) IP qilib ishlaydigan qilingan. Hec qanday faylni tahrirlash shart emas!

## 4. Xavfsizlik devori (Firewall)
Agar telefonlardan kirolmasangiz (sayt aylanib qolib ishlamasa), kompyuteringizning **Windows Defender Firewall** sozlamasidan *3000* va *3001* portlariga ulanishga yoki ilovaga ulanishga kiruvchi ruxsat (Inbound rules) berishingiz kerak bo'lishi mumkin. Eng oddiy usul: Tarmoqni "Public" dan "Private" ga o'zgartirish.
