const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'frontend', 'script.js');
let content = fs.readFileSync(file, 'utf8');

// Replace callWaiter function
const oldFn = /function callWaiter\(\) \{[\s\S]*?^}/m;

const newFn = `function callWaiter() {
    if (!currentTableNumber) {
        alert('Iltimos, avval stol raqamini tanlang!');
        return;
    }
    
    const callData = {
        tableNumber: currentTableNumber,
        numberOfPeople: numberOfPeople,
        timestamp: new Date().toISOString()
    };
    
    if (socket && socket.connected) {
        socket.emit('call-waiter', callData);
    }
    
    // REST orqali ham yuborish (ishonchlilik uchun)
    fetch(API_URL + '/api/waiter-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callData)
    }).catch(e => console.warn('REST waiter-call error:', e));
    
    showToast('\u{1F4E2} Stol ' + currentTableNumber + ' ofisant chaqirildi!');
    
    const btn = document.getElementById('callWaiterBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-bell"></i>';
        }, 30000);
    }
}`;

content = content.replace(/function callWaiter\(\) \{[\s\S]*?\n\}/, newFn);
fs.writeFileSync(file, content, 'utf8');
console.log('script.js patched!');
