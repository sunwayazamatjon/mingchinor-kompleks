// API manzilini dinamik aniqlash (Lokal yoki Bulut)
const getApiUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const customApi = urlParams.get('api');
    
    // 1. URL parametrda 'api' bo'lsa (masalan: ?api=192.168.1.100)
    if (customApi) return `http://${customApi}:3001`;

    // 2. Agar localhostda bo'lsa, localhost:3001
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3001';
    }

    // 3. Agar boshqa qurilmadan (IP orqali) kirilgan bo'lsa
    if (/^[0-9.]+$/.test(window.location.hostname)) {
        return `http://${window.location.hostname}:3001`;
    }

    // 4. Standart: Vercel/Bulutda bo'lsa (Nisbiy yo'l ishlatamiz)
    if (window.location.hostname.includes('vercel.app') || window.location.hostname.includes('.')) {
        return window.location.origin; // Vercel-da /api o'zi vercel.json orqali ishlaydi
    }

    return 'http://localhost:3001'; 
};

const API_URL = getApiUrl();
