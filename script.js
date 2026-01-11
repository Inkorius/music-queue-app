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
