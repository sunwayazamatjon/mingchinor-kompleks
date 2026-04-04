const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'frontend', 'script.js');
let content = fs.readFileSync(file, 'utf8');

// Find and replace the event listeners section and add openWaiterPanel/closeWaiterPanel
const oldSection = `// ============ 9. EVENT LISTENERLAR ============`;
const insertBefore = `// ============ 9. EVENT LISTENERLAR ============
if (cartIconBtn) cartIconBtn.addEventListener('click', () => cartOverlay.classList.add('open'));
if (closeCartBtn) closeCartBtn.addEventListener('click', () => cartOverlay.classList.remove('open'));
if (orderBtn) orderBtn.addEventListener('click', placeOrder);
if (closeSuccessBtn) closeSuccessBtn.addEventListener('click', closeModal);
// Bell tugmasi endi waiter panelini ochadi
if (callWaiterBtn) callWaiterBtn.addEventListener('click', openWaiterPanel);

function openWaiterPanel() {
    const panel = document.getElementById('waiterPanel');
    const overlay = document.getElementById('waiterPanelOverlay');
    const tableEl = document.getElementById('wpTableNum');
    const peopleEl = document.getElementById('wpPeople');
    if (tableEl) tableEl.textContent = currentTableNumber || '—';
    if (peopleEl) peopleEl.textContent = numberOfPeople || '—';
    if (panel) panel.classList.add('open');
    if (overlay) overlay.classList.add('open');
}

function closeWaiterPanel() {
    const panel = document.getElementById('waiterPanel');
    const overlay = document.getElementById('waiterPanelOverlay');
    if (panel) panel.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
}`;

// Replace the old event listeners block
content = content.replace(
    /\/\/ ============ 9\. EVENT LISTENERLAR ============[\s\S]*?if \(callWaiterBtn\) callWaiterBtn\.addEventListener\('click', callWaiter\);/,
    insertBefore
);

fs.writeFileSync(file, content, 'utf8');
console.log('Event listeners patched!');
