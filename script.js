// ========== Глобальные переменные ==========
const SUPABASE_URL = 'https://zxqnmicfjoqbzazflwjd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cW5taWNmam9xYnphemZsd2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMTMzMTcsImV4cCI6MjA4Mzg4OTMxN30.2OKy4ZVFeaPGNspmHKh9l7wVIKI1Z96kie0cOaigGxA';

let musicQueue = [];
let currentTrack = {
    title: "Нет трека", 
    artist: "Добавьте первый трек!"
};

// Инициализация Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Экспорт для админки
window.musicQueue = musicQueue;
window.currentTrack = currentTrack;
window.supabaseClient = supabase;

// DonationAlerts
const DA_SUPABASE_FUNCTION = `${SUPABASE_URL}/functions/v1/donation-proxy`;
let daAccessToken = null;
let lastDonationId = localStorage.getItem('lastDonationId') || null;

// ========== Функции для работы с Supabase ==========

// Загрузка очереди из Supabase
async function loadQueueFromSupabase() {
    try {
        console.log('Загрузка очереди из Supabase...');
        
        // Загружаем очередь
        const { data: queueData, error: queueError } = await supabase
            .from('music_queue')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (queueError) throw queueError;
        
        if (queueData && queueData.length > 0) {
            musicQueue = queueData.map((item, index) => ({
                id: item.id,
                title: item.title,
                artist: item.artist || 'Неизвестный исполнитель',
                donor: item.donor || 'Админ',
                time: new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            }));
            console.log(`Загружено ${musicQueue.length} треков из Supabase`);
        } else {
            musicQueue = [];
            console.log('Очередь в Supabase пуста');
        }
        
        // Загружаем текущий трек
        const { data: currentData, error: currentError } = await supabase
            .from('current_track')
            .select('*')
            .eq('id', 1)
            .single();
        
        if (!currentError && currentData) {
            currentTrack = {
                title: currentData.title || "Нет трека",
                artist: currentData.artist || "Добавьте первый трек!"
            };
            console.log('Текущий трек загружен:', currentTrack.title);
        }
        
        return true;
    } catch (error) {
        console.error('Ошибка загрузки очереди из Supabase:', error);
        // Fallback на localStorage
        const savedQueue = localStorage.getItem('musicQueue');
        const savedCurrent = localStorage.getItem('currentTrack');
        
        if (savedQueue) musicQueue = JSON.parse(savedQueue);
        if (savedCurrent) currentTrack = JSON.parse(savedCurrent);
        
        console.log('Используем localStorage как fallback');
        return false;
    }
}

// Сохранение очереди в Supabase
async function saveQueueToSupabase() {
    try {
        console.log('Сохранение очереди в Supabase...');
        
        // Удаляем старую очередь
        const { error: deleteError } = await supabase
            .from('music_queue')
            .delete()
            .neq('id', 0);
        
        if (deleteError) {
            console.warn('Ошибка при удалении старой очереди:', deleteError);
        }
        
        // Сохраняем новую очередь (если есть треки)
        if (musicQueue.length > 0) {
            const queueToSave = musicQueue.map(track => ({
                title: track.title,
                artist: track.artist,
                donor: track.donor
            }));
            
            const { error: insertError } = await supabase
                .from('music_queue')
                .insert(queueToSave);
            
            if (insertError) throw insertError;
            console.log(`Сохранено ${musicQueue.length} треков в Supabase`);
        }
        
        // Сохраняем текущий трек
        const { error: upsertError } = await supabase
            .from('current_track')
            .upsert({
                id: 1,
                title: currentTrack.title,
                artist: currentTrack.artist,
                updated_at: new Date().toISOString()
            });
        
        if (upsertError) throw upsertError;
        
        // Также сохраняем в localStorage как backup
        localStorage.setItem('musicQueue', JSON.stringify(musicQueue));
        localStorage.setItem('currentTrack', JSON.stringify(currentTrack));
        
        console.log('Очередь успешно сохранена');
        return true;
    } catch (error) {
        console.error('Ошибка сохранения очереди в Supabase:', error);
        // Fallback на localStorage
        localStorage.setItem('musicQueue', JSON.stringify(musicQueue));
        localStorage.setItem('currentTrack', JSON.stringify(currentTrack));
        return false;
    }
}

// Глобальная функция сохранения
window.saveQueue = saveQueueToSupabase;
window.loadQueue = loadQueueFromSupabase;

// ========== Основные функции очереди ==========

// Добавление трека
async function addTrack(title, artist = 'Неизвестный исполнитель', donor = 'Админ') {
    const newTrack = {
        id: Date.now(),
        title: title,
        artist: artist,
        donor: donor,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
    
    musicQueue.push(newTrack);
    await saveQueueToSupabase();
    updateDisplay();
    
    showNotification(`🎵 ${donor} добавил: ${title}`);
    
    return newTrack;
}

// Удаление трека
async function removeTrack(trackId) {
    try {
        console.log('Удаление трека с ID:', trackId);
        
        // Удаляем из базы
        const { error } = await supabase
            .from('music_queue')
            .delete()
            .eq('id', trackId);
        
        if (error) throw error;
        
        // Удаляем из локального массива
        musicQueue = musicQueue.filter(track => track.id !== trackId);
        localStorage.setItem('musicQueue', JSON.stringify(musicQueue));
        updateDisplay();
        showNotification('Трек удалён');
    } catch (error) {
        console.error('Ошибка удаления трека из Supabase:', error);
        // Fallback
        musicQueue = musicQueue.filter(track => track.id !== trackId);
        localStorage.setItem('musicQueue', JSON.stringify(musicQueue));
        updateDisplay();
        showNotification('Трек удалён (локально)');
    }
}

// Следующий трек
async function playNext() {
    if (musicQueue.length > 0) {
        currentTrack = musicQueue.shift();
        await saveQueueToSupabase();
        updateDisplay();
        showNotification(`▶️ Сейчас играет: ${currentTrack.title}`);
        return currentTrack;
    } else {
        currentTrack = {title: "Нет трека", artist: "Добавьте первый трек!"};
        await saveQueueToSupabase();
        updateDisplay();
        showNotification('🎵 Очередь пуста');
        return null;
    }
}

// Очистка всей очереди
async function clearQueue() {
    if (confirm('Удалить всю очередь?')) {
        try {
            // Очищаем в Supabase
            const { error } = await supabase
                .from('music_queue')
                .delete()
                .neq('id', 0);
            
            if (error) throw error;
            
            musicQueue = [];
            currentTrack = {title: "Нет трека", artist: "Добавьте первый трек!"};
            localStorage.setItem('musicQueue', JSON.stringify(musicQueue));
            localStorage.setItem('currentTrack', JSON.stringify(currentTrack));
            updateDisplay();
            showNotification('Очередь очищена');
        } catch (error) {
            console.error('Ошибка очистки очереди в Supabase:', error);
            musicQueue = [];
            currentTrack = {title: "Нет трека", artist: "Добавьте первый трек!"};
            localStorage.setItem('musicQueue', JSON.stringify(musicQueue));
            localStorage.setItem('currentTrack', JSON.stringify(currentTrack));
            updateDisplay();
            showNotification('Очередь очищена (локально)');
        }
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
}

// ========== DonationAlerts через Supabase ==========

// Инициализация DonationAlerts
async function initDonationAlerts() {
    try {
        console.log('Получаем токен через Supabase Function...');
        
        const response = await fetch(DA_SUPABASE_FUNCTION, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'get-token'
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Ошибка получения токена:', response.status, errorText);
            showNotification('❌ Ошибка получения токена');
            return false;
        }
        
        const tokenData = await response.json();
        
        if (tokenData.access_token) {
            daAccessToken = tokenData.access_token;
            localStorage.setItem('da_access_token', daAccessToken);
            localStorage.setItem('da_token_expiry', Date.now() + (tokenData.expires_in * 1000));
            
            console.log('✅ DonationAlerts токен получен');
            showNotification('✅ DonationAlerts подключён');
            return true;
        } else if (tokenData.error) {
            console.error('Ошибка в ответе:', tokenData);
            showNotification('❌ Ошибка: ' + (tokenData.error_description || tokenData.error));
            return false;
        } else {
            console.error('Неизвестная ошибка:', tokenData);
            showNotification('❌ Неизвестная ошибка получения токена');
            return false;
        }
    } catch (error) {
        console.error('Ошибка инициализации DonationAlerts:', error);
        showNotification('❌ Ошибка подключения к DonationAlerts');
        return false;
    }
}

// Проверка донатов
async function checkDonationsViaSupabase() {
    const token = localStorage.getItem('da_access_token');
    if (!token) {
        console.log('Нет токена, пропускаем проверку');
        return;
    }
    
    try {
        console.log('Проверяем донаты...');
        
        const response = await fetch(DA_SUPABASE_FUNCTION, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                action: 'get-donations'
            })
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                console.log('Токен истёк, обновляем...');
                await initDonationAlerts();
            }
            return;
        }
        
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            const latestDonation = data.data[0];
            const lastDonationId = localStorage.getItem('lastDonationId');
            
            if (latestDonation.id.toString() !== lastDonationId) {
                localStorage.setItem('lastDonationId', latestDonation.id.toString());
                console.log('Новый донат:', latestDonation);
                await processDonation(latestDonation);
            }
        }
    } catch (error) {
        console.error('Ошибка проверки донатов:', error);
    }
}

// Обработка доната
async function processDonation(donation) {
    // Показываем уведомление
    showNotification(`💖 ${donation.username}: ${donation.amount} ${donation.currency}`);
    
    // Сохраняем в историю
    await saveDonationToHistory(donation);
    
    // Проверяем команду !музыка
    if (donation.message) {
        const message = donation.message.toLowerCase();
        
        if (message.includes('!музыка') || message.includes('!song')) {
            const trackQuery = donation.message
                .replace(/!(музыка|song)\s*/i, '')
                .trim();
            
            if (trackQuery) {
                let title, artist;
                if (trackQuery.includes('-')) {
                    const parts = trackQuery.split('-').map(p => p.trim());
                    title = parts[0];
                    artist = parts.length > 1 ? parts.slice(1).join(' - ') : 'Неизвестный исполнитель';
                } else {
                    title = trackQuery;
                    artist = 'Неизвестный исполнитель';
                }
                
                // Добавляем трек
                await addTrack(
                    title,
                    artist,
                    `${donation.username} (${donation.amount}${donation.currency})`
                );
                
                showNotification(`🎵 ${donation.username} заказал: ${title}`);
            }
        }
    }
}

// Сохранение доната в историю
async function saveDonationToHistory(donation) {
    try {
        const { error } = await supabase
            .from('donations_history')
            .insert({
                donation_id: donation.id,
                username: donation.username,
                amount: donation.amount,
                currency: donation.currency,
                message: donation.message || '',
                track_title: null,
                track_artist: null
            });
        
        if (error) {
            console.error('Ошибка сохранения доната в историю:', error);
            // Сохраняем в localStorage как fallback
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
            
            if (history.length > 50) history = history.slice(0, 50);
            localStorage.setItem('donation_history', JSON.stringify(history));
        }
    } catch (error) {
        console.error('Ошибка сохранения доната:', error);
    }
}

// Обновление отображения донатов
async function updateDonationDisplay() {
    try {
        // Пробуем загрузить из Supabase
        const { data: donationsData, error } = await supabase
            .from('donations_history')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
        
        const container = document.getElementById('donationsList');
        if (!container) return;
        
        let history = [];
        
        if (!error && donationsData && donationsData.length > 0) {
            history = donationsData;
        } else {
            // Fallback на localStorage
            history = JSON.parse(localStorage.getItem('donation_history') || '[]');
        }
        
        if (history.length === 0) {
            container.innerHTML = '<p>Донатов пока нет</p>';
            return;
        }
        
        let html = '';
        history.slice(0, 10).forEach(donation => {
            const time = donation.created_at 
                ? new Date(donation.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                : donation.time || '';
            
            const date = donation.created_at
                ? new Date(donation.created_at).toLocaleDateString()
                : donation.date || '';
            
            html += `
                <div class="donation-item">
                    <div class="donation-header">
                        <strong>${donation.username}</strong>
                        <span class="donation-amount">${donation.amount} ${donation.currency}</span>
                    </div>
                    ${donation.message ? `<div class="donation-message">${donation.message}</div>` : ''}
                    <div class="donation-time">${time} ${date}</div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Ошибка обновления донатов:', error);
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

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Инициализация приложения...');
    
    // Загружаем очередь из Supabase
    await loadQueueFromSupabase();
    
    // Обновляем отображение
    updateDisplay();
    updateDonationDisplay();
    
    // Инициализация DonationAlerts
    const savedToken = localStorage.getItem('da_access_token');
    const savedExpiry = localStorage.getItem('da_token_expiry');
    
    if (savedToken && savedExpiry && Date.now() < parseInt(savedExpiry)) {
        daAccessToken = savedToken;
        console.log('✅ Используем сохранённый токен DonationAlerts');
        showNotification('✅ DonationAlerts подключён');
        
        // Запускаем проверку донатов
        setInterval(checkDonationsViaSupabase, 10000);
    } else {
        console.log('🔄 Получаем новый токен DonationAlerts...');
        showNotification('🔄 Подключаемся к DonationAlerts...');
        const success = await initDonationAlerts();
        if (success) {
            setInterval(checkDonationsViaSupabase, 10000);
        }
    }
    
    // Периодическая проверка истечения токена
    setInterval(async () => {
        const expiry = localStorage.getItem('da_token_expiry');
        if (expiry && Date.now() > parseInt(expiry)) {
            console.log('Токен истёк, обновляем...');
            await initDonationAlerts();
        }
    }, 30000);
    
    // Периодическое обновление отображения
    setInterval(updateDisplay, 3000);
    setInterval(updateDonationDisplay, 5000);
    
    // Периодическая синхронизация с Supabase
    setInterval(async () => {
        await loadQueueFromSupabase();
        updateDisplay();
    }, 10000);
});

// ========== Глобальные функции для админки ==========

window.removeTrack = removeTrack;
window.playNext = playNext;
window.clearQueue = clearQueue;
window.addTrack = addTrack;

// Функция для обновления очереди в админке
window.updateAdminQueue = function() {
    const adminQueueList = document.getElementById('adminQueueList');
    const queueCountEl = document.getElementById('queueCount2');
    
    if (!adminQueueList) return;
    
    if (musicQueue.length === 0) {
        adminQueueList.innerHTML = '<p>Очередь пуста</p>';
    } else {
        let html = '';
        musicQueue.forEach((track, index) => {
            html += `
                <div class="queue-item">
                    <div style="background: #667eea; color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold; font-size: 14px;">
                        #${index + 1}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px;">${track.title}</div>
                        <div style="opacity: 0.8; font-size: 14px; margin-bottom: 6px;">${track.artist}</div>
                        <div style="display: flex; gap: 15px; font-size: 12px; opacity: 0.7;">
                            <span style="color: #ffeb3b;">👤 ${track.donor}</span>
                            <span style="color: #4caf50;">🕐 ${track.time}</span>
                        </div>
                    </div>
                    <button onclick="removeTrack(${track.id})" style="background: rgba(244, 67, 54, 0.2); color: white; border: none; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 20px; transition: background 0.3s; display: flex; align-items: center; justify-content: center; margin-left: 10px;">
                        ×
                    </button>
                </div>
            `;
        });
        adminQueueList.innerHTML = html;
    }
    
    // Обновляем счётчик
    if (queueCountEl) {
        queueCountEl.textContent = musicQueue.length;
    }
};
