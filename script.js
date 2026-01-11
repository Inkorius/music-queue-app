// Единое хранилище в localStorage
let musicQueue = JSON.parse(localStorage.getItem('musicQueue')) || [];
let currentTrack = JSON.parse(localStorage.getItem('currentTrack')) || {
    title: "Нет трека", 
    artist: "Добавьте первый трек!"
};

// Функция для сохранения
function saveQueue() {
    localStorage.setItem('musicQueue', JSON.stringify(musicQueue));
    localStorage.setItem('currentTrack', JSON.stringify(currentTrack));
}

// Функция для обновления отображения
function updateDisplay() {
    // Обновляем на главной странице
    const currentTrackEl = document.getElementById('currentTrack');
    const currentArtistEl = document.getElementById('currentArtist');
    const queueListEl = document.getElementById('queueList');
    
    if (currentTrackEl) {
        currentTrackEl.textContent = currentTrack.title;
        currentArtistEl.textContent = currentTrack.artist;
    }
    
    if (queueListEl) {
        if (musicQueue.length === 0) {
            queueListEl.innerHTML = '<p class="empty-queue">Очередь пуста. Будь первым!</p>';
        } else {
            let html = '';
            musicQueue.forEach((track, index) => {
                html += `
                    <div class="queue-item">
                        <div class="queue-number">#${index + 1}</div>
                        <div class="track-info">
                            <div class="track-title">${track.title}</div>
                            <div class="track-artist">${track.artist}</div>
                        </div>
                        <div class="donor-name">${track.donor}</div>
                    </div>
                `;
            });
            queueListEl.innerHTML = html;
        }
    }
    
    // Обновляем в админке
    const adminQueueList = document.getElementById('adminQueueList');
    if (adminQueueList) {
        adminQueueList.innerHTML = queueListEl ? queueListEl.innerHTML : '';
    }
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
    
    // Уведомление
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

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    // Загружаем данные
    const savedQueue = localStorage.getItem('musicQueue');
    const savedCurrent = localStorage.getItem('currentTrack');
    
    if (savedQueue) musicQueue = JSON.parse(savedQueue);
    if (savedCurrent) currentTrack = JSON.parse(savedCurrent);
    
    updateDisplay();
    
    // Обновляем каждые 2 секунды
    setInterval(updateDisplay, 2000);
});

// Для админки
if (window.location.pathname.includes('admin.html')) {
    document.addEventListener('DOMContentLoaded', function() {
        const trackInput = document.getElementById('trackInput');
        const donorInput = document.getElementById('donorInput');
        const addBtn = document.getElementById('addTrackBtn');
        
        function addTrackFromAdmin() {
            const title = trackInput.value.trim();
            const donor = donorInput.value.trim() || 'Админ';
            
            if (title) {
                addTrack(title, 'Исполнитель неизвестен', donor);
                trackInput.value = '';
                donorInput.value = '';
            }
        }
        
        if (addBtn) addBtn.addEventListener('click', addTrackFromAdmin);
        if (trackInput) {
            trackInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') addTrackFromAdmin();
            });
        }
    });
}

// Уведомления
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
        padding: 10px 20px;
        border-radius: 5px;
        animation: slideIn 0.5s, fadeOut 0.5s 2.5s;
        z-index: 1000;
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// ========== DonationAlerts Functions ==========

async function checkDonations() {
    const token = localStorage.getItem('donationalerts_token');
    
    if (!token) {
        console.log('Токен DonationAlerts не найден');
        return;
    }
    
    try {
        // Получаем последние донаты (страница 1, 1 элемент)
        const response = await fetch('https://www.donationalerts.com/api/v1/alerts/donations?page=1', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error('Ошибка API DonationAlerts:', response.status);
            return;
        }
        
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            // Берем самый последний донат
            const latestDonation = data.data[0];
            
            // Проверяем, не обрабатывали ли мы этот донат уже
            const lastProcessedId = localStorage.getItem('last_processed_donation_id');
            
            if (lastProcessedId !== latestDonation.id.toString()) {
                // Новый донат! Обрабатываем
                processNewDonation(latestDonation);
                localStorage.setItem('last_processed_donation_id', latestDonation.id.toString());
            }
        }
    } catch (error) {
        console.error('Ошибка при проверке донатов:', error);
    }
}

function processNewDonation(donation) {
    console.log('Новый донат:', donation);
    
    // Показываем уведомление о донате
    showNotification(`💖 ${donation.username}: ${donation.amount} ${donation.currency}`);
    
    // Проверяем сообщение на команду !музыка
    if (donation.message) {
        const messageLower = donation.message.toLowerCase();
        
        if (messageLower.includes('!музыка') || messageLower.includes('!song')) {
            // Извлекаем название трека (убираем команду и лишние пробелы)
            const trackName = donation.message
                .replace(/!(музыка|song)\s*/i, '')
                .trim();
            
            if (trackName) {
                // Добавляем трек в очередь
                addTrack(
                    trackName,
                    'Исполнитель неизвестен',
                    `${donation.username} (${donation.amount}${donation.currency})`
                );
                
                // Дополнительное уведомление
                showNotification(`🎵 ${donation.username} заказал: ${trackName}`);
            }
        }
    }
    
    // Добавляем донат в историю (необязательно)
    addToDonationHistory(donation);
}

function addToDonationHistory(donation) {
    let history = JSON.parse(localStorage.getItem('donation_history') || '[]');
    
    // Добавляем новый донат в начало
    history.unshift({
        username: donation.username,
        amount: donation.amount,
        currency: donation.currency,
        message: donation.message || '',
        time: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString()
    });
    
    // Ограничиваем историю последними 50 донатами
    if (history.length > 50) {
        history = history.slice(0, 50);
    }
    
    localStorage.setItem('donation_history', JSON.stringify(history));
}

// Запускаем проверку донатов каждые 30 секунд
setInterval(checkDonations, 30000);

// Стили для уведомлений
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
`;
document.head.appendChild(style);

function displayDonationHistory() {
    const history = JSON.parse(localStorage.getItem('donation_history') || '[]');
    const container = document.getElementById('donationsList');
    
    if (!container) return;
    
    if (history.length === 0) {
        container.innerHTML = '<p>Донатов пока нет</p>';
        return;
    }
    
    let html = '';
    history.slice(0, 5).forEach(donation => { // Показываем последние 5
        html += `
            <div class="donation-item">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong>${donation.username}</strong>
                    <span class="donation-amount">${donation.amount} ${donation.currency}</span>
                </div>
                ${donation.message ? `<div class="donation-message">${donation.message}</div>` : ''}
                <div class="donation-time">${donation.time}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Обновляем отображение донатов при загрузке и периодически
document.addEventListener('DOMContentLoaded', function() {
    displayDonationHistory();
    setInterval(displayDonationHistory, 10000); // Обновляем каждые 10 секунд
});
