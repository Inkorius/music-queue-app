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
        } else {
            musicQueue = [];
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
        }
        
        console.log('Очередь загружена из Supabase:', musicQueue.length, 'треков');
        return true;
    } catch (error) {
        console.error('Ошибка загрузки очереди:', error);
        // Fallback на localStorage
        const savedQueue = localStorage.getItem('musicQueue');
        const savedCurrent = localStorage.getItem('currentTrack');
        
        if (savedQueue) musicQueue = JSON.parse(savedQueue);
        if (savedCurrent) currentTrack = JSON.parse(savedCurrent);
        
        return false;
    }
}

// Сохранение очереди в Supabase
async function saveQueueToSupabase() {
    try {
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
        
        console.log('Очередь сохранена в Supabase');
        return true;
    } catch (error) {
        console.error('Ошибка сохранения очереди:', error);
        // Fallback на localStorage
        localStorage.setItem('musicQueue', JSON.stringify(musicQueue));
        localStorage.setItem('currentTrack', JSON.stringify(currentTrack));
        return false;
    }
}

// Глобальная функция сохранения
window.saveQueue = saveQueueToSupabase;

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
        console.error('Ошибка удаления трека:', error);
        // Fallback
        musicQueue = musicQueue.filter(track => track.id !== trackId);
        localStorage.setItem('musicQueue', JSON.stringify(musicQueue));
        updateDisplay();
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

// ========== Остальные функции остаются без изменений ==========

// [Остальной код из оригинального script.js остается без изменений]
// ... (функции updateDisplay, updateDonationDisplay, showNotification и т.д.)
