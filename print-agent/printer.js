const net = require('net');
const EscPosEncoder = require('esc-pos-encoder');

// Kafedagi printerlarning aniq LAN manzillari
const PRINTERS = {
    kitchen: {
        name: 'Oshxona',
        ip: '192.168.1.12', 
        port: 9100,
        categories: ['🍜 Birinchi taomlar', '🍽️ Ikkinchi taomlar', '🫓 Non va sneklar']
    },
    kebab: {
        name: 'Kabobxona',
        ip: '192.168.1.13', 
        port: 9100,
        categories: ['🧃 Ichimliklar', '🥗 Achichuk salat', '🥩 Kabobxona']
    }
};

function formatPrice(price) {
    return price.toLocaleString('uz-UZ') + " so'm";
}

function getPrinterForItem(category) {
    for (const [key, printer] of Object.entries(PRINTERS)) {
        if (printer.categories.includes(category)) {
            return printer;
        }
    }
    return PRINTERS.kitchen; // To'g'ri kelmasa Oshxonaga otib tashlaydi
}

async function printToPrinter(printer, orderData) {
    return new Promise((resolve, reject) => {
        const encoder = new EscPosEncoder();
        
        const receipt = encoder
            .initialize()
            .text('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
            .bold(true)
            .text('        MINGCHINOR KAFESI\n')
            .bold(false)
            .text('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
            .text(`Stol: ${orderData.tableNumber}\n`)
            .text(`Vaqt: ${new Date().toLocaleString('uz-UZ')}\n`)
            .text('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
            .bold(true)
            .text(`${printer.name} Bo'limi!\n`)
            .bold(false)
            .text('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n');
        
        orderData.items.forEach(item => {
            receipt
                .text(`${item.qty} dona -> ${item.name}\n`);
        });
        
        receipt
            .text('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
            .text('Tayyorlashni boshlang!\n\n\n')
            .cut();
        
        const buffer = receipt.encode();
        const client = new net.Socket();
        
        client.on('error', (err) => {
            console.log(`[Error] ${printer.name} ga ulanmadi (${printer.ip}). Qurilma o'chiq bo'lishi mumkin.`);
            reject(err);
        });

        client.connect(printer.port, printer.ip, () => {
            client.write(buffer);
            client.end();
            resolve(true);
        });
        
        setTimeout(() => {
            client.destroy();
            reject(new Error('Printer javob bermadi (Timeout)'));
        }, 3000);
    });
}

async function processOrderPrint(order) {
    const kitchenItems = [];
    const kebabItems = [];
    
    order.items.forEach(item => {
        const printer = getPrinterForItem(item.category);
        if (printer.name === 'Oshxona') kitchenItems.push(item);
        else if (printer.name === 'Kabobxona') kebabItems.push(item);
        else kitchenItems.push(item); // Standart oshxonaga
    });
    
    let isSuccess = true;

    if (kitchenItems.length > 0) {
        try {
            await printToPrinter(PRINTERS.kitchen, { ...order, items: kitchenItems });
        } catch(e) { isSuccess = false; }
    }
    
    if (kebabItems.length > 0) {
        try {
            await printToPrinter(PRINTERS.kebab, { ...order, items: kebabItems });
        } catch(e) { isSuccess = false; }
    }
    
    return isSuccess;
}

module.exports = { processOrderPrint, PRINTERS };
