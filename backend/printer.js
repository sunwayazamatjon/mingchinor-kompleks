const net = require('net');

// Printer konfiguratsiyasi
const PRINTERS = {
    kitchen: {
        name: 'Oshxona',
        ip: '192.168.1.12',
        port: 9100,
        categories: ['🍜 Birinchi taomlar', '🍽️ Ikkinchi taomlar', '🫓 Non va sneklar']
    },
    kabob: {
        name: 'Kabobxona',
        ip: '192.168.1.13',
        port: 9100,
        categories: ['🍽️ Ikkinchi taomlar'] // Kaboblar uchun maxsus logika pastda
    },
    bar: {
        name: 'Bar',
        ip: '192.168.1.102',
        port: 9100,
        categories: ['🧃 Ichimliklar', '🍰 Shirinliklar']
    }
};

function formatPrice(price) {
    return price.toLocaleString('uz-UZ') + " so'm";
}

function getPrinterForItem(item) {
    const name = item.name.toLowerCase();
    const cat = item.category;

    // Kabobxona: Nomi 'kabob' yoki 'shashlik' bo'lgan taomlar uchun
    if (name.includes('kabob') || name.includes('shashlik')) {
        return PRINTERS.kabob;
    }

    // Bar: Ichimliklar va Shirinliklar uchun
    if (PRINTERS.bar.categories.includes(cat)) {
        return PRINTERS.bar;
    }

    // Oshxona: Boshqa barcha taomlar uchun
    return PRINTERS.kitchen;
}

// ESC/POS komandalarini manuel yozish (tashqi library kerak emas)
function buildReceipt(printerName, order) {
    const ESC = '\x1B';
    const GS = '\x1D';
    const lines = [];

    const cut = () => GS + 'V' + '\x01'; // partial cut

    let text = '';
    text += ESC + '@';                          // Initialize
    text += ESC + 'a' + '\x01';                // Center align
    text += ESC + 'E' + '\x01';                // Bold on
    text += 'MINGCHINOR KOMPLEKS\n';
    text += ESC + 'E' + '\x00';                // Bold off
    text += 'Milliy taomlar kafesi\n';
    text += '----------------------------\n';
    text += ESC + 'a' + '\x00';                // Left align
    text += `Stol: ${order.tableNumber}\n`;
    text += `Vaqt: ${new Date().toLocaleString('uz-UZ')}\n`;
    text += `Bo'lim: ${printerName}\n`;
    text += '----------------------------\n';

    order.items.forEach(item => {
        text += `${item.qty}x ${item.name}\n`;
        text += `   ${formatPrice(item.price * item.qty)}\n`;
    });

    text += '----------------------------\n';
    text += ESC + 'E' + '\x01';                // Bold on
    text += `JAMI: ${formatPrice(order.totalAmount)}\n`;
    text += ESC + 'E' + '\x00';                // Bold off
    text += '\n\n\n';
    text += cut();

    return Buffer.from(text, 'latin1');
}

async function printToPrinter(printer, orderData) {
    return new Promise((resolve, reject) => {
        const buffer = buildReceipt(printer.name, orderData);

        const client = new net.Socket();

        client.connect(printer.port, printer.ip, () => {
            client.write(buffer);
            client.end();
            resolve(true);
        });

        client.on('error', (err) => {
            reject(err);
        });

        setTimeout(() => {
            client.destroy();
            reject(new Error('Printer timeout'));
        }, 10000);
    });
}

async function printOrder(order) {
    const printerJobs = {
        kitchen: [],
        kabob: [],
        bar: []
    };

    order.items.forEach(item => {
        const printerObj = getPrinterForItem(item);
        if (printerObj.name === 'Kabobxona') {
            printerJobs.kabob.push(item);
        } else if (printerObj.name === 'Bar') {
            printerJobs.bar.push(item);
        } else {
            printerJobs.kitchen.push(item);
        }
    });

    const results = [];

    for (const [key, items] of Object.entries(printerJobs)) {
        if (items.length > 0) {
            const printerConfig = PRINTERS[key];
            const partialOrder = {
                ...order,
                items: items,
                totalAmount: items.reduce((sum, i) => sum + (i.price * i.qty), 0)
            };
            try {
                const res = await printToPrinter(printerConfig, partialOrder);
                results.push(res);
            } catch (err) {
                console.warn(`${printerConfig.name} printer xatosi:`, err.message);
                throw err; // Re-throw to handle in server.js queue
            }
        }
    }

    return results;
}

// Mijoz uchun chek chiqarish
async function printCustomerReceipt(order) {
    // Mijoz cheki uchun printer (masalan, kassa printeri)
    const customerPrinter = {
        name: 'Kassa',
        ip: '192.168.1.100', // Kassa printer IP
        port: 9100
    };

    const ESC = '\x1B';
    const GS = '\x1D';
    const lines = [];

    const cut = () => GS + 'V' + '\x01';

    let text = '';
    text += ESC + '@';                          // Initialize
    text += ESC + 'a' + '\x01';                // Center align
    text += ESC + 'E' + '\x01';                // Bold on
    text += 'MINGCHINOR-KOMPLEKS\n';
    text += ESC + 'E' + '\x00';                // Bold off
    text += '\n';
    text += ESC + 'a' + '\x00';                // Left align
    text += `Sana: ${new Date().toLocaleDateString('uz-UZ')}\n`;
    text += `Vaqt: ${new Date().toLocaleTimeString('uz-UZ')}\n`;
    text += '----------------------------\n';

    order.items.forEach(item => {
        text += `${item.name}\n`;
        text += `${item.qty} dona x ${formatPrice(item.price)} = ${formatPrice(item.price * item.qty)}\n`;
    });

    text += '----------------------------\n';
    text += `Ofisant xizmat ko'rsatgan mijozlar soni: ${order.numberOfPeople || 1}\n`;
    text += ESC + 'E' + '\x01';                // Bold on
    text += `JAMI: ${formatPrice(order.totalAmount)}\n`;
    text += ESC + 'E' + '\x00';                // Bold off
    text += '\n\n\n';
    text += cut();

    const buffer = Buffer.from(text, 'latin1');

    return new Promise((resolve, reject) => {
        const client = new net.Socket();

        client.connect(customerPrinter.port, customerPrinter.ip, () => {
            client.write(buffer);
            client.end();
            resolve(true);
        });

        client.on('error', (err) => {
            reject(err);
        });

        setTimeout(() => {
            client.destroy();
            reject(new Error('Timeout'));
        }, 5000);
    });
}

module.exports = { printOrder, printCustomerReceipt, PRINTERS };