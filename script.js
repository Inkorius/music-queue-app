let musicQueue = [];
let currentTrack = {title: "Нет трека", artist: "Добавьте первый трек!"};
let donations = [];

// DOM элементы
const addTrackBtn = document.getElementById('addTrackBtn');
const trackInput = document.getElementById('trackInput');

// Добавление трека (для админки)
function addTrack() {
    if (!trackInput) return;
    
    const trackName = trackInput.value.trim();
    if (!trackName) return;
    
    const newTrack = {
        id: Date.now(),
        title: trackName,
        artist: "Неизвестный исполнитель",
        donor: "Админ",
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
    
    musicQueue.push(newTrack);
    updateDisplay();
    trackInput.value = '';
    
    // Сохраняем в localStorage
    saveToStorage();
}

// Удаление трека
function removeTrack(trackId) {
    musicQueue = musicQueue.filter(track => track.id !== trackId);
    updateDisplay();
    saveToStorage();
}

// Следующий трек
function playNext() {
    if (musicQueue.length > 0) {
        currentTrack = musicQueue.shift();
        updateDisplay();
        saveToStorage();
        return currentTrack;
    }
    return null;
}

// Сохранение в localStorage
function saveToStorage() {
    try {
        localStorage.setItem('musicQueue', JSON.stringify(musicQueue));
        localStorage.setItem('currentTrack', JSON.stringify(currentTrack));
    } catch (e) {
        console.log('Ошибка сохранения:', e);
    }
}

// Загрузка из localStorage
function loadFromStorage() {
    try {
        const savedQueue = localStorage.getItem('musicQueue');
        const savedCurrent = localStorage.getItem('currentTrack');
        
        if (savedQueue) musicQueue = JSON.parse(savedQueue);
        if (savedCurrent) currentTrack = JSON.parse(savedCurrent);
    } catch (e) {
        console.log('Ошибка загрузки:', e);
    }
}

// Обновление отображения
function updateDisplay() {
    // Текущий трек
    document.getElementById('currentTrack').textContent = currentTrack.title;
    document.getElementById('currentArtist').textContent = currentTrack.artist;
    
    // Очередь
    const queueList = document.getElementById('queueList');
    if (musicQueue.length === 0) {
        queueList.innerHTML = '<p>Очередь пуста. Будь первым!</p>';
    } else {
        let html = '';
        musicQueue.forEach((track, index) => {
            html += `
                <div class="queue-item" data-id="${track.id}">
                    <span class="queue-number">#${index + 1}</span>
                    <div class="track-info">
                        <strong>${track.title}</strong>
                        <div class="track-meta">
                            <span>${track.artist}</span>
                            <span class="donor">👤 ${track.donor}</span>
                            <span class="time">🕐 ${track.time}</span>
                        </div>
                    </div>
                    <button class="remove-btn" onclick="removeTrack(${track.id})">×</button>
                </div>
            `;
        });
        queueList.innerHTML = html;
    }
    
    // Для панели управления
    const adminQueueList = document.getElementById('adminQueueList');
    if (adminQueueList) {
        adminQueueList.innerHTML = queueList.innerHTML;
    }
}

// Добавляем стили для новых элементов
const style = document.createElement('style');
style.textContent = `
    .queue-item {
        background: rgba(255, 255, 255, 0.1);
        padding: 10px;
        border-radius: 8px;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        transition: background 0.3s;
    }
    
    .queue-item:hover {
        background: rgba(255, 255, 255, 0.15);
    }
    
    .queue-number {
        background: #667eea;
        color: white;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 10px;
        font-weight: bold;
    }
    
    .track-info {
        flex: 1;
    }
    
    .track-meta {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        margin-top: 4px;
        display: flex;
        gap: 10px;
    }
    
    .donor {
        color: #ffeb3b;
    }
    
    .time {
        color: #4caf50;
    }
    
    .remove-btn {
        background: rgba(244, 67, 54, 0.3);
        color: white;
        border: none;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 18px;
        transition: background 0.3s;
    }
    
    .remove-btn:hover {
        background: rgba(244, 67, 54, 0.6);
    }
`;
document.head.appendChild(style);

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    loadFromStorage();
    updateDisplay();
    
    // Для админки
    if (addTrackBtn) {
        addTrackBtn.addEventListener('click', addTrack);
    }
    
    if (trackInput) {
        trackInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') addTrack();
        });
    }
    
    // Автообновление каждые 5 секунд
    setInterval(updateDisplay, 5000);
});

// Глобальные функции для кнопок
window.removeTrack = removeTrack;
window.playNext = playNext;

// Имитация донатов (только для демо)
function simulateDonation() {
    const donors = ['Алексей', 'Мария', 'Дмитрий', 'Анна', 'Сергей'];
    const tracks = [
        {title: 'Shape of You', artist: 'Ed Sheeran'},
        {title: 'Blinding Lights', artist: 'The Weeknd'},
        {title: 'Bad Guy', artist: 'Billie Eilish'},
        {title: 'Dance Monkey', artist: 'Tones and I'},
        {title: 'Bohemian Rhapsody', artist: 'Queen'}
    ];
    
    const randomDonor = donors[Math.floor(Math.random() * donors.length)];
    const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
    
    const newTrack = {
        id: Date.now(),
        title: randomTrack.title,
        artist: randomTrack.artist,
        donor: randomDonor,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
    
    musicQueue.push(newTrack);
    updateDisplay();
    saveToStorage();
    
    // Показываем уведомление
    showNotification(`🎵 ${randomDonor} заказал: ${randomTrack.title}`);
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
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Для демо: имитация доната каждые 30 секунд
setInterval(simulateDonation, 30000);
