const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

// Botingizning tokeni
const token = '7684216714:AAHZKjfT4_v0WzCE_qlilRfBfhTC0iFP7wU';
// Web App manzili
const webAppUrl = 'https://sunwayazamatjon.github.io/mingchinor-kompleks/bot.html';

// Portni band qilish (Render va boshqa hostinglar har 2 minutda botni o'chirib yoqmasligi uchun)
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is running normally...\n');
}).listen(PORT, () => {
  console.log(`[Health-Check] Server port ${PORT} da ishga tushdi.`);
});

// Botni polling usulida ishga tushirish
const bot = new TelegramBot(token, {polling: true});

// Eski webhook to'qnashuvlarini tozalash
bot.deleteWebHook()
  .then(() => console.log("[Webhook] Eski webhooklar muvaffaqiyatli tozalandi."))
  .catch(err => console.log("[Webhook Check] Webhookni tozalashda xatolik:", err.message));

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Agar xabarda matn bo'lmasa (masalan, rasm, kontakt yoki web_app yuborgan ma'lumot bo'lsa)
  if (!text) return;

  // /start bosilganda
  if(text === '/start') {
    await bot.sendMessage(chatId, 'Assalomu alaykum! Mingchinor Kompleks botiga xush kelibsiz.\n\nIltimos, pastdagi tugmani bosib menyuni oching va buyurtma bering:', {
      reply_markup: {
        keyboard: [
          [{ text: '🍽 Menyu va Buyurtma berish', web_app: { url: webAppUrl } }],
          [{ text: '📞 Biz bilan aloqa' }, { text: '📍 Bizning manzil' }]
        ],
        resize_keyboard: true
      }
    });
  }
  
  // Aloqa bosilganda
  else if(text === '📞 Biz bilan aloqa') {
    bot.sendMessage(chatId, "Bizning raqamlar:\n+998 90 123 45 67\n+998 99 987 65 43");
  }

  // Manzil bosilganda
  else if(text === '📍 Bizning manzil') {
    bot.sendLocation(chatId, 41.2995, 69.2401); // Kenglik va uzunlik (Google mapsdan olib o'zgartirasiz)
    bot.sendMessage(chatId, "Manzil: Toshkent shahar, falonchi ko'chasi 12-uy.");
  }
});

console.log("=========================================");
console.log("Mingchinor Boti muvaffaqiyatli ishga tushdi!");
console.log("=========================================");
