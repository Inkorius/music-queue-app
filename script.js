// ========== Глобальные переменные ==========
let musicQueue = JSON.parse(localStorage.getItem('musicQueue')) || [];
let currentTrack = JSON.parse(localStorage.getItem('currentTrack')) || {
    title: "Нет трека", 
    artist: "Добавьте первый трек!"
};

// DonationAlerts
const PROXY_URL = 'https://music-queue-dkt871bdw-evgeniis-projects-09062643.vercel.app/api/donation-proxy'; // ЗАМЕНИТЕ НА ВАШ VERCEL URL
let daAccessToken = null;
let lastDonationId = localStorage.getItem('lastDonationId') || null;

// ========== Основные функции очереди ==========

// Сохранение в localStorage
function saveQueue() {
    localStorage.setItem('musicQueue', JSON.stringify(musicQueue));
    localStorage.setItem('currentTrack', JSON.stringify(currentTrack));
}

// Добавление трека
function addTrack(title, artist = 'Неизвестный исполнитель', donor = 'Админ') {
    const newTrack = {
        id: Date.now(),
        title: title,
        artist: artist,
        donor: donor,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
    
    musicQueue.push(newTrack);
    saveQueue();
    updateDisplay();
    
    showNotification(`🎵 ${donor} добавил: ${title}`);
    
    return newTrack;
}

// Удаление трека
function removeTrack(trackId) {
    musicQueue = musicQueue.filter(track => track.id !== trackId);
    saveQueue();
    updateDisplay();
}

// Следующий трек
function playNext() {
    if (musicQueue.length > 0) {
        currentTrack = musicQueue.shift();
        saveQueue();
        updateDisplay();
        showNotification(`▶️ Сейчас играет: ${currentTrack.title}`);
        return currentTrack;
    } else {
        showNotification('🎵 Очередь пуста');
        return null;
    }
}

// Обновление отображения
function updateDisplay() {
    // Текущий трек
    const currentTrackEl = document.getElementById('currentTrack');
    const currentArtistEl = document.getElementById('currentArtist');
    
    if (currentTrackEl) {
        currentTrackEl.textContent = currentTrack.title;
    }
    if (currentArtistEl) {
        currentArtistEl.textContent = currentTrack.artist;
    }
    
    // Очередь
    const queueListEl = document.getElementById('queueList');
    if (queueListEl) {
        if (musicQueue.length === 0) {
            queueListEl.innerHTML = '<p class="empty-queue">Очередь пуста. Будь первым!</p>';
        } else {
            let html = '';
            musicQueue.forEach((track, index) => {
                html += `
                    <div class="queue-item" data-id="${track.id}">
                        <div class="queue-number">#${index + 1}</div>
                        <div class="track-info">
                            <div class="track-title">${track.title}</div>
                            <div class="track-artist">${track.artist}</div>
                            <div class="track-meta">
                                <span class="donor">👤 ${track.donor}</span>
                                <span class="time">🕐 ${track.time}</span>
                            </div>
                        </div>
                        <button class="remove-btn" onclick="removeTrack(${track.id})">×</button>
                    </div>
                `;
            });
            queueListEl.innerHTML = html;
        }
    }
    
    // Для админки
    const adminQueueList = document.getElementById('adminQueueList');
    if (adminQueueList) {
        adminQueueList.innerHTML = queueListEl ? queueListEl.innerHTML : '';
    }
}

// ========== DonationAlerts Integration ==========

// Инициализация DonationAlerts
async function initDonationAlerts() {
    try {
        // Получаем новый токен через прокси
        const tokenResponse = await fetch(`${PROXY_URL}?action=get-token`);
        
        if (!tokenResponse.ok) {
            console.error('Ошибка получения токена:', tokenResponse.status);
            return false;
        }
        
        const tokenData = await tokenResponse.json();
        
        if (tokenData.access_token) {
            daAccessToken = tokenData.access_token;
            localStorage.setItem('da_access_token', daAccessToken);
            localStorage.setItem('da_token_expiry', Date.now() + (tokenData.expires_in * 1000));
            
            console.log('✅ DonationAlerts токен получен');
            showNotification('✅ DonationAlerts подключён');
            return true;
        } else {
            console.error('Токен не получен:', tokenData);
            return false;
        }
    } catch (error) {
        console.error('Ошибка инициализации DonationAlerts:', error);
        return false;
    }
}

// Периодическая проверка донатов
function startDonationPolling() {
    setInterval(async () => {
        if (!daAccessToken) return;
        
        try {
            const response = await fetch(`${PROXY_URL}?action=get-donations&page=1`, {
                headers: {
                    'X-Access-Token': daAccessToken
                }
            });
            
            if (!response.ok) {
                console.error('Ошибка API:', response.status);
                // Попробуем обновить токен
                if (response.status === 401) {
                    await initDonationAlerts();
                }
                return;
            }
            
            const data = await response.json();
            
            if (data.data && data.data.length > 0) {
                const latestDonation = data.data[0];
                
                // Проверяем, новый ли это донат
                if (latestDonation.id.toString() !== lastDonationId) {
                    lastDonationId = latestDonation.id.toString();
                    localStorage.setItem('lastDonationId', lastDonationId);
                    processDonation(latestDonation);
                }
            }
        } catch (error) {
            console.log('Ошибка проверки донатов:', error);
        }
    }, 10000); // Проверяем каждые 10 секунд
}

// Обработка доната
function processDonation(donation) {
    console.log('Новый донат:', donation);
    
    // Показываем уведомление
    showNotification(`💖 ${donation.username}: ${donation.amount} ${donation.currency}`);
    
    // Добавляем в историю донатов
    addToDonationHistory(donation);
    
    // Проверяем команду !музыка
    if (donation.message) {
        const message = donation.message.toLowerCase();
        
        if (message.includes('!музыка') || message.includes('!song')) {
            const trackQuery = donation.message
                .replace(/!(музыка|song)\s*/i, '')
                .trim();
            
            if (trackQuery) {
                // Добавляем трек в очередь
                addTrack(
                    trackQuery,
                    'Исполнитель неизвестен',
                    `${donation.username} (${donation.amount}${donation.currency})`
                );
                
                // Уведомление о добавлении трека
                showNotification(`🎵 ${donation.username} заказал: ${trackQuery}`);
            }
        }
    }
}

// История донатов
function addToDonationHistory(donation) {
    let history = JSON.parse(localStorage.getItem('donation_history') || '[]');
    
    history.unshift({
        id: donation.id,
        username: donation.username,
        amount: donation.amount,
        currency: donation.currency,
        message: donation.message || '',
        time: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString()
    });
    
    // Ограничиваем 50 последними донатами
    if (history.length > 50) {
        history = history.slice(0, 50);
    }
    
    localStorage.setItem('donation_history', JSON.stringify(history));
    updateDonationDisplay();
}

// Обновление отображения донатов
function updateDonationDisplay() {
    const history = JSON.parse(localStorage.getItem('donation_history') || '[]');
    const container = document.getElementById('donationsList');
    
    if (!container) return;
    
    if (history.length === 0) {
        container.innerHTML = '<p>Донатов пока нет</p>';
        return;
    }
    
    let html = '';
    history.slice(0, 10).forEach(donation => {
        html += `
            <div class="donation-item">
                <div class="donation-header">
                    <strong>${donation.username}</strong>
                    <span class="donation-amount">${donation.amount} ${donation.currency}</span>
                </div>
                ${donation.message ? `<div class="donation-message">${donation.message}</div>` : ''}
                <div class="donation-time">${donation.time} ${donation.date}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Автоматическое обновление токена при истечении
function checkTokenExpiry() {
    const expiry = localStorage.getItem('da_token_expiry');
    if (expiry && Date.now() > parseInt(expiry)) {
        console.log('Токен истёк, обновляем...');
        initDonationAlerts();
    }
}

// ========== Уведомления ==========

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        animation: slideIn 0.5s, fadeOut 0.5s 2.5s;
        z-index: 1000;
        backdrop-filter: blur(10px);
        border-left: 4px solid #4caf50;
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// ========== Стили для уведомлений ==========

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    
    .queue-item {
        background: rgba(255, 255, 255, 0.1);
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        transition: background 0.3s;
        border-left: 3px solid #667eea;
    }
    
    .queue-item:hover {
        background: rgba(255, 255, 255, 0.15);
    }
    
    .queue-number {
        background: #667eea;
        color: white;
        width: 35px;
        height: 35px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 15px;
        font-weight: bold;
        font-size: 14px;
    }
    
    .track-info {
        flex: 1;
    }
    
    .track-title {
        font-weight: bold;
        font-size: 16px;
        margin-bottom: 4px;
    }
    
    .track-artist {
        opacity: 0.8;
        font-size: 14px;
        margin-bottom: 6px;
    }
    
    .track-meta {
        display: flex;
        gap: 15px;
        font-size: 12px;
        opacity: 0.7;
    }
    
    .donor {
        color: #ffeb3b;
    }
    
    .time {
        color: #4caf50;
    }
    
    .remove-btn {
        background: rgba(244, 67, 54, 0.2);
        color: white;
        border: none;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 20px;
        transition: background 0.3s;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-left: 10px;
    }
    
    .remove-btn:hover {
        background: rgba(244, 67, 54, 0.6);
    }
    
    .empty-queue {
        text-align: center;
        padding: 30px;
        opacity: 0.5;
        font-style: italic;
    }
    
    .donation-item {
        background: rgba(255, 215, 0, 0.1);
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 10px;
        border-left: 3px solid gold;
    }
    
    .donation-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }
    
    .donation-amount {
        color: gold;
        font-weight: bold;
        font-size: 1.1em;
    }
    
    .donation-message {
        font-style: italic;
        opacity: 0.9;
        margin: 8px 0;
        padding: 5px;
        background: rgba(255,255,255,0.05);
        border-radius: 4px;
    }
    
    .donation-time {
        font-size: 0.8em;
        opacity: 0.6;
        text-align: right;
    }
`;
document.head.appendChild(style);

// ========== Инициализация ==========

document.addEventListener('DOMContentLoaded', function() {
    // Загружаем очередь
    const savedQueue = localStorage.getItem('musicQueue');
    const savedCurrent = localStorage.getItem('currentTrack');
    
    if (savedQueue) musicQueue = JSON.parse(savedQueue);
    if (savedCurrent) currentTrack = JSON.parse(savedCurrent);
    
    // Обновляем отображение
    updateDisplay();
    updateDonationDisplay();
    
    // Инициализация DonationAlerts
    const savedToken = localStorage.getItem('da_access_token');
    const savedExpiry = localStorage.getItem('da_token_expiry');
    
    if (savedToken && savedExpiry && Date.now() < parseInt(savedExpiry)) {
        daAccessToken = savedToken;
        startDonationPolling();
        console.log('✅ Используем сохранённый токен DonationAlerts');
    } else {
        console.log('🔄 Получаем новый токен DonationAlerts...');
        initDonationAlerts().then(success => {
            if (success) {
                startDonationPolling();
            } else {
                console.log('Не удалось подключиться к DonationAlerts');
            }
        });
    }
    
    // Проверяем истечение токена каждые 30 секунд
    setInterval(checkTokenExpiry, 30000);
    
    // Обновляем отображение каждые 3 секунды
    setInterval(updateDisplay, 3000);
    setInterval(updateDonationDisplay, 5000);
});

// ========== Глобальные функции для кнопок ==========

// Для использования в onclick атрибутах
window.removeTrack = removeTrack;
window.playNext = playNext;

// Функция для админки
window.addTrackAdmin = function() {
    const trackInput = document.getElementById('trackInput');
    const donorInput = document.getElementById('donorInput');
    
    if (!trackInput) return;
    
    const title = trackInput.value.trim();
    const donor = donorInput ? donorInput.value.trim() || 'Админ' : 'Админ';
    
    if (title) {
        addTrack(title, 'Исполнитель неизвестен', donor);
        trackInput.value = '';
        if (donorInput) donorInput.value = '';
    }
};
