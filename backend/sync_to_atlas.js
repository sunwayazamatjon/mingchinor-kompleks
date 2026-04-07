require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI .env faylida topilmadi!');
    process.exit(1);
}

// Menu Model (Schema)
const MenuSchema = new mongoose.Schema({
    id: Number,
    emoji: String,
    name: String,
    name_uz: String,
    name_ru: String,
    name_en: String,
    desc: String,
    desc_uz: String,
    desc_ru: String,
    desc_en: String,
    cost: Number,
    price: Number,
    category: String,
    category_uz: String,
    category_ru: String,
    category_en: String,
    available: { type: Boolean, default: true },
    image: String
});
const Menu = mongoose.model('Menu', MenuSchema);

async function syncMenu() {
    try {
        console.log('🔄 MongoDB Atlas-ga ulanilmoqda...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB-ga muvaffaqiyatli ulanildi.');

        const dataPath = path.join(__dirname, '../data/menu.json');
        if (!fs.existsSync(dataPath)) {
            console.error('❌ menu.json fayli topilmadi:', dataPath);
            process.exit(1);
        }

        const menuData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        console.log(`📦 ${menuData.length} ta taom tayyorlandi.`);

        console.log('🧹 Mavjud menyuni tozalash...');
        await Menu.deleteMany({});
        
        console.log('🚀 Yangi ma\'lumotlarni yuklash...');
        await Menu.insertMany(menuData);
        
        console.log('✨ Muvaffaqiyatli yakunlandi!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Xatolik:', err);
        process.exit(1);
    }
}

syncMenu();
