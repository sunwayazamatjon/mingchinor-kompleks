const axios = require('axios');
const chalk = require('chalk');
const { processOrderPrint } = require('./printer');

// ======= KONFIGURATSIYA =======
// Vercel-dagi manzilingizni shu yerga yozing
const SERVER_URL = 'https://mingchinor-kompleks.vercel.app'; 
const INTERVAL_MS = 3000; // Har 3 sekundda tekshiradi

console.log(chalk.cyan.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
console.log(chalk.cyan.bold('   MINGCHINOR PRINT AGENT v1.0   '));
console.log(chalk.cyan.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
console.log(chalk.yellow(`🌐 Serverga ulanish: `) + chalk.white(SERVER_URL));
console.log(chalk.yellow(`⏳ Qidirish intervali: `) + chalk.white(`${INTERVAL_MS/1000} soniya`));
console.log(chalk.green('\n[!] Agent muaffaqiyatli ishga tushdi va ulanishni kutmoqda...\n'));

let isPolling = false;

async function checkPendingPrints() {
    if (isPolling) return;
    isPolling = true;

    try {
        const response = await axios.get(`${SERVER_URL}/api/agent/pending-prints`);
        const jobs = response.data; // List of orders

        if (jobs && jobs.length > 0) {
            console.log(chalk.green(`\n[+] ${jobs.length} ta yangi buyurtma keldi. Bosib chiqarilmoqda...`));

            for (const order of jobs) {
                // Printerga jo'natish
                const success = await processOrderPrint(order);
                
                if (success) {
                    console.log(chalk.bgGreen.black(` [V] Buyurtma #${order.tableNumber}-stol printerdan chiqdi. `));
                    // Serverga aytamizki, biz buni printerdan chiqardik, uni ro'yxatdan o'chir!
                    await axios.post(`${SERVER_URL}/api/agent/mark-printed/${order.id}`);
                } else {
                    console.log(chalk.red(` [X] Buyurtma #${order.tableNumber}-stol printer bilan muammo! Kutib turibdi.`));
                }
            }
        }
    } catch (err) {
        if (err.code === 'ECONNREFUSED') {
            process.stdout.write(chalk.gray(`\rServer o'chiq (${SERVER_URL}). Qayta ulanish kutilmoqda...     `));
        } else {
            console.error('\n' + chalk.red('Tarmoq xatosi: '), err.message);
        }
    } finally {
        isPolling = false;
    }
}

// Darhol birinchi marta ishga tushirish
checkPendingPrints();

// Keyin kaskad tarzida doimiy aylantirish
setInterval(checkPendingPrints, INTERVAL_MS);
