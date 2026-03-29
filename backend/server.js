require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const socketIo = require('socket.io');

// Import modules
const printerService = require('./printer');

const app = express();
const PORT = process.env.PORT || 3001;
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// ==================== MONGODB ULANISH ====================
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB-ga muvaffaqiyatli ulanildi'))
.catch(err => console.error('❌ MongoDB ulanish xatosi:', err));

// ==================== MODELLAR ====================
const MenuSchema = new mongoose.Schema({
    id: Number,
    emoji: String,
    name: String,
    desc: String,
    cost: Number,
    price: Number,
    category: String,
    available: { type: Boolean, default: true },
    image: String
});
const Menu = mongoose.model('Menu', MenuSchema);

const OrderSchema = new mongoose.Schema({
    id: { type: String, default: uuidv4 },
    tableNumber: Number,
    numberOfPeople: { type: Number, default: 1 },
    items: Array,
    totalAmount: Number,
    serviceFee: Number,
    status: { type: String, default: 'pending' }, // pending, confirmed, printed, completed
    createdAt: { type: Date, default: Date.now },
    confirmedAt: Date,
    printedAt: Date
});
const Order = mongoose.model('Order', OrderSchema);

const ConfigSchema = new mongoose.Schema({
    service_fee: { type: Number, default: 5000 }
});
const Config = mongoose.model('Config', ConfigSchema);

const WaiterCallSchema = new mongoose.Schema({
    tableNumber: Number,
    numberOfPeople: Number,
    calledAt: { type: Date, default: Date.now },
    status: { type: String, default: 'pending' }
});
const WaiterCall = mongoose.model('WaiterCall', WaiterCallSchema);

// ==================== INITIAL DATA ====================
async function checkInitialData() {
    const menuCount = await Menu.countDocuments();
    if (menuCount === 0) {
        console.log('📦 Baza bo\'sh, standart menyu yuklanmoqda...');
        await Menu.insertMany(getDefaultMenu());
    }
    const configCount = await Config.countDocuments();
    if (configCount === 0) {
        await Config.create({ service_fee: 5000 });
    }
}
checkInitialData();

function getDefaultMenu() {
    return [
        { id: 1, emoji: "🥣", name: "Mastava", desc: "Qo'zichoq go'shti, sabzavotlar", cost: 18000, price: 28000, category: "🍜 Birinchi taomlar", available: true },
        { id: 2, emoji: "🍲", name: "Shurva", desc: "Qo'y go'shti, karam, sabzi", cost: 15000, price: 25000, category: "🍜 Birinchi taomlar", available: true },
        { id: 3, emoji: "🥘", name: "Lagman", desc: "El noodles, go'sht, sabzavot", cost: 20000, price: 32000, category: "🍜 Birinchi taomlar", available: true },
        { id: 4, emoji: "🫕", name: "Moshxo'rda", desc: "Mosh, guruch, yog'", cost: 12000, price: 22000, category: "🍜 Birinchi taomlar", available: true },
        { id: 5, emoji: "🍚", name: "Osh (Palov)", desc: "Qo'zichoq go'shti, sabzi, guruch", cost: 22000, price: 38000, category: "🍽️ Ikkinchi taomlar", available: true },
        { id: 6, emoji: "🥩", name: "Kabob", desc: "Qo'y go'shti, zira, piyoz", cost: 28000, price: 45000, category: "🍽️ Ikkinchi taomlar", available: true },
        { id: 7, emoji: "🫔", name: "Dimlama", desc: "Go'sht, kartoshka, sabzavotlar", cost: 20000, price: 35000, category: "🍽️ Ikkinchi taomlar", available: true },
        { id: 8, emoji: "🍗", name: "Tovuq qovurma", desc: "Basmati guruch bilan", cost: 25000, price: 40000, category: "🍽️ Ikkinchi taomlar", available: true },
        { id: 9, emoji: "🥗", name: "Achichuk salat", desc: "Pomidor, bodring, piyoz, ko'k", cost: 8000, price: 15000, category: "🍽️ Ikkinchi taomlar", available: true },
        { id: 10, emoji: "🫓", name: "Patir non", desc: "Tandirda pishirilgan", cost: 4000, price: 8000, category: "🫓 Non va sneklar", available: true },
        { id: 11, emoji: "🥙", name: "Somsa", desc: "Go'shtli, yangi pishirilgan", cost: 6000, price: 12000, category: "🫓 Non va sneklar", available: true },
        { id: 12, emoji: "🥟", name: "Manti", desc: "Qo'y go'shti bilan (6 dona)", cost: 18000, price: 30000, category: "🫓 Non va sneklar", available: true },
        { id: 13, emoji: "🍵", name: "Ko'k choy", desc: "Chinni piyolada", cost: 3000, price: 8000, category: "🧃 Ichimliklar", available: true },
        { id: 14, emoji: "☕", name: "Qora choy", desc: "Limon bilan", cost: 3000, price: 8000, category: "🧃 Ichimliklar", available: true },
        { id: 15, emoji: "🧃", name: "Sharbat", desc: "Mavsumiy mevalar", cost: 8000, price: 18000, category: "🧃 Ichimliklar", available: true },
        { id: 16, emoji: "🥛", name: "Ayron", desc: "Yangi, sovuq", cost: 5000, price: 12000, category: "🧃 Ichimliklar", available: true },
        { id: 17, emoji: "💧", name: "Mineral suv", desc: "Gaz'li / gaz'siz (0.5L)", cost: 3000, price: 7000, category: "🧃 Ichimliklar", available: true },
        { id: 18, emoji: "🍯", name: "Halva", desc: "An'anaviy, yong'oq bilan", cost: 10000, price: 20000, category: "🍰 Shirinliklar", available: true },
        { id: 19, emoji: "🍮", name: "Murabbo", desc: "O'rik murabbo, qaymoq", cost: 7000, price: 15000, category: "🍰 Shirinliklar", available: true },
        { id: 20, emoji: "🍩", name: "Pishiriqlar", desc: "Kunlik assortment", cost: 7000, price: 14000, category: "🍰 Shirinliklar", available: true }
    ];
}

// ==================== API ENDPOINTS ====================

// Tizim sozlamalari
app.get('/api/config', async (req, res) => {
    try {
        const config = await Config.findOne();
        res.json(config);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/config', async (req, res) => {
    const { password, config } = req.body;
    if (password !== 'mingchinor123' && password !== '1234') {
        return res.status(401).json({ error: 'Parol noto\'g\'ri' });
    }
    try {
        const updated = await Config.findOneAndUpdate({}, { service_fee: parseInt(config.service_fee) }, { new: true });
        res.json({ success: true, config: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 1. Menyuni olish
app.get('/api/menu', async (req, res) => {
    try {
        const menu = await Menu.find().sort({ id: 1 });
        res.json(menu);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Admin: menyuni yangilash
app.post('/api/admin/menu', async (req, res) => {
    const { password, menu } = req.body;
    if (password !== 'mingchinor123') {
        return res.status(401).json({ error: 'Parol noto\'g\'ri' });
    }
    try {
        await Menu.deleteMany({});
        await Menu.insertMany(menu);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Buyurtma berish
app.post('/api/order', async (req, res) => {
    const { tableNumber, numberOfPeople, items, totalAmount, serviceFee } = req.body;
    
    if (!tableNumber || !items || items.length === 0) {
        return res.status(400).json({ error: 'Stol raqami va buyurtma majburiy' });
    }
    
    try {
        const orderId = uuidv4();
        const order = new Order({
            id: orderId,
            tableNumber: parseInt(tableNumber),
            numberOfPeople: parseInt(numberOfPeople) || 1,
            items: items,
            totalAmount: totalAmount,
            serviceFee: serviceFee || 0,
            status: 'pending'
        });
        
        await order.save();
        res.json({ success: true, orderId: orderId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Ofisant: kutilayotgan buyurtmalarni olish
app.get('/api/admin/pending-orders', async (req, res) => {
    try {
        const pending = await Order.find({ status: 'pending' }).sort({ createdAt: -1 });
        res.json(pending);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Ofisant: buyurtmani tasdiqlash va printerga jo'natish
app.post('/api/admin/confirm-order/:orderId', async (req, res) => {
    const { orderId } = req.params;
    const { password } = req.body;
    
    if (password !== 'mingchinor123') {
        return res.status(401).json({ error: 'Parol noto\'g\'ri' });
    }
    
    try {
        const order = await Order.findOne({ id: orderId });
        if (!order) {
            return res.status(404).json({ error: 'Buyurtma topilmadi' });
        }
        
        order.status = 'confirmed';
        order.confirmedAt = new Date();
        await order.save();
        
        // Printerga jo'natish (Agent uchun navbatga tushadi yoki lokal bo'lsa darhol)
        try {
            await printerService.printOrder(order);
            order.status = 'printed';
            order.printedAt = new Date();
            await order.save();
        } catch (err) {
            console.error('Printer error (navbatga olindi):', err.message);
        }
        
        res.json({ success: true, order });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Barcha buyurtmalar tarixi (admin uchun)
app.get('/api/admin/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 }).limit(100);
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 7. Printerni qayta urinish
app.post('/api/admin/retry-print/:orderId', async (req, res) => {
    const { orderId } = req.params;
    const { password } = req.body;
    if (password !== 'mingchinor123') {
        return res.status(401).json({ error: 'Parol noto\'g\'ri' });
    }
    
    try {
        const order = await Order.findOne({ id: orderId });
        if (!order) {
            return res.status(404).json({ error: 'Buyurtma topilmadi' });
        }
        
        await printerService.printOrder(order);
        order.status = 'printed';
        order.printedAt = new Date();
        await order.save();
        res.json({ success: true });
    } catch (err) {
        console.error('Print retry error:', err);
        res.status(500).json({ error: 'Printerga ulanishda xatolik' });
    }
});

// 8. Sotilgan taomlar bo'yicha hisobot
app.get('/api/admin/stats/sales', async (req, res) => {
    const { password } = req.query;
    if (password !== 'mingchinor123') {
        return res.status(401).json({ error: 'Parol noto\'g\'ri' });
    }
    
    try {
        const completedOrders = await Order.find({ status: { $in: ['confirmed', 'printed'] } });
        
        const itemStats = {};
        let totalRevenue = 0;
        let totalCost = 0;
        let totalPeopleServed = 0;
        
        completedOrders.forEach(order => {
            totalRevenue += (order.totalAmount - (order.serviceFee || 0));
            totalPeopleServed += (order.numberOfPeople || 1);
            
            order.items.forEach(item => {
                const key = item.id;
                const itemCost = item.cost || 0;
                if (!itemStats[key]) {
                    itemStats[key] = {
                        id: item.id, name: item.name, emoji: item.emoji,
                        price: item.price, cost: itemCost, quantity: 0, 
                        totalRevenue: 0, totalCost: 0
                    };
                }
                itemStats[key].quantity += item.qty;
                itemStats[key].totalRevenue += item.price * item.qty;
                itemStats[key].totalCost += itemCost * item.qty;
                totalCost += itemCost * item.qty;
            });
        });
        
        const itemList = Object.values(itemStats).map(item => ({
            ...item, 
            profit: item.totalRevenue - item.totalCost,
            profitMargin: item.totalRevenue > 0 ? ((item.totalRevenue - item.totalCost) / item.totalRevenue * 100).toFixed(1) : 0
        }));
        
        res.json({
            summary: { 
                totalOrders: completedOrders.length, 
                totalRevenue, 
                totalCost, 
                totalProfit: totalRevenue - totalCost,
                totalPeopleServed,
                profitMargin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100).toFixed(1) : 0
            },
            items: itemList
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== PRINT AGENT API ====================
app.get('/api/agent/pending-prints', async (req, res) => {
    try {
        const pending = await Order.find({ status: 'confirmed' });
        res.json(pending);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/agent/mark-printed/:orderId', async (req, res) => {
    const { orderId } = req.params;
    try {
        const order = await Order.findOne({ id: orderId });
        if (order) {
            order.status = 'printed';
            order.printedAt = new Date();
            await order.save();
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== OFISANT CHAQIRISH API ====================
app.get('/api/admin/waiter-calls', async (req, res) => {
    try {
        const calls = await WaiterCall.find({ status: 'pending' }).sort({ calledAt: -1 });
        res.json(calls);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/waiter-call', async (req, res) => {
    const { tableNumber, numberOfPeople } = req.body;
    if (!tableNumber) return res.status(400).json({ error: 'Stol raqami majburiy' });
    
    try {
        await WaiterCall.findOneAndUpdate(
            { tableNumber: parseInt(tableNumber), status: 'pending' },
            { 
                numberOfPeople: parseInt(numberOfPeople) || 1,
                calledAt: new Date()
            },
            { upsert: true, new: true }
        );
        
        io.emit('waiter-call', { tableNumber: parseInt(tableNumber), numberOfPeople: parseInt(numberOfPeople) || 1, calledAt: new Date() });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/waiter-calls/dismiss/:tableNumber', async (req, res) => {
    const tableNumber = parseInt(req.params.tableNumber);
    try {
        await WaiterCall.updateMany({ tableNumber, status: 'pending' }, { status: 'dismissed' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/waiter-calls/clear', async (req, res) => {
    try {
        await WaiterCall.updateMany({ status: 'pending' }, { status: 'dismissed' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Socket.io logic
io.on('connection', (socket) => {
    socket.on('call-waiter', async (data) => {
        try {
            const call = {
                tableNumber: parseInt(data.tableNumber),
                numberOfPeople: parseInt(data.numberOfPeople) || 1,
                calledAt: new Date(),
                status: 'pending'
            };
            await WaiterCall.findOneAndUpdate(
                { tableNumber: call.tableNumber, status: 'pending' },
                call,
                { upsert: true }
            );
            io.emit('waiter-call', call);
        } catch (err) {
            console.error('Socket waiter-call error:', err.message);
        }
    });
});

// Serverni ishga tushirish
server.listen(PORT, () => {
    console.log(`🚀 Server bulutli bazada (MongoDB) ishga tushdi. Port: ${PORT}`);
});

module.exports = app;