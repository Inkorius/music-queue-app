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
window.saveQueue = saveQueueToSupabase;

// DonationAlerts через Supabase Function
const DA_SUPABASE_FUNCTION = `${SUPABASE_URL}/functions/v1/donation-proxy`;
let lastDonationId = localStorage.getItem('lastDonationId') || null;

// ========== Функции для работы с Supabase ==========

async function loadQueueFromSupabase() {
    try {
        const { data: queueData } = await supabase
            .from('music_queue')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (queueData && queueData.length > 0) {
            musicQueue = queueData.map((item) => ({
                id: item.id,
                title: item.title,
                artist: item.artist || 'Неизвестный исполнитель',
                donor: item.donor || 'Админ',
                time: new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            }));
        }
        
        const { data: currentData } = await supabase
            .from('current_track')
            .select('*')
            .eq('id', 1)
            .single();
        
        if (currentData) {
            currentTrack = {
                title: currentData.title || "Нет трека",
                artist: currentData.artist || "Добавьте первый трек!"
            };
        }
        
        return true;
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        const savedQueue = localStorage.getItem('musicQueue');
        const savedCurrent = localStorage.getItem('currentTrack');
        
        if (savedQueue) musicQueue = JSON.parse(savedQueue);
        if (savedCurrent) currentTrack = JSON.parse(savedCurrent);
        
        return false;
    }
}

async function saveQueueToSupabase() {
    try {
        // Очищаем старую очередь
        await supabase.from('music_queue').delete().neq('id', 0);
        
        // Сохраняем новую очередь
        if (musicQueue.length > 0) {
            const queueToSave = musicQueue.map(track => ({
                title: track.title,
                artist: track.artist,
                donor: track.donor
            }));
            
            await supabase.from('music_queue').insert(queueToSave);
        }
        
        // Сохраняем текущий трек
        await supabase.from('current_track').upsert({
            id: 1,
            title: currentTrack.title,
            artist: currentTrack.artist,
            updated_at: new Date().toISOString()
        });
        
        // Backup в localStorage
        localStorage.setItem('musicQueue', JSON.stringify(musicQueue));
        localStorage.setItem('currentTrack', JSON.stringify(currentTrack));
        
        return true;
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        localStorage.setItem('musicQueue', JSON.stringify(musicQueue));
        localStorage.setItem('currentTrack', JSON.stringify(currentTrack));
        return false;
    }
}

// ========== Основные функции ==========

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

async function removeTrack(trackId) {
    try {
        await supabase.from('music_queue').delete().eq('id', trackId);
        musicQueue = musicQueue.filter(track => track.id !== trackId);
        localStorage.setItem('musicQueue', JSON.stringify(musicQueue));
        updateDisplay();
        showNotification('Трек удалён');
    } catch (error) {
        musicQueue = musicQueue.filter(track => track.id !== trackId);
        localStorage.setItem('musicQueue', JSON.stringify(musicQueue));
        updateDisplay();
    }
}

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

async function clearQueue() {
    if (confirm('Удалить всю очередь?')) {
        try {
            await supabase.from('music_queue').delete().neq('id', 0);
            musicQueue = [];
            currentTrack = {title: "Нет трека", artist: "Добавьте первый трек!"};
            localStorage.setItem('musicQueue', JSON.stringify(musicQueue));
            localStorage.setItem('currentTrack', JSON.stringify(currentTrack));
            updateDisplay();
            showNotification('Очередь очищена');
        } catch (error) {
            musicQueue = [];
            currentTrack = {title: "Нет трека", artist: "Добавьте первый трек!"};
            localStorage.setItem('musicQueue', JSON.stringify(musicQueue));
            localStorage.setItem('currentTrack', JSON.stringify(currentTrack));
            updateDisplay();
            showNotification('Очередь очищена (локально)');
        }
    }
}

// ========== Остальной код без изменений ==========

// [Функции updateDisplay, showNotification, updateDonationDisplay и остальной код 
//  остаются БЕЗ ИЗМЕНЕНИЙ из оригинального script.js]

// Просто добавьте в конец оригинального script.js этот код:

document.addEventListener('DOMContentLoaded', async function() {
    // Загружаем очередь из Supabase
    await loadQueueFromSupabase();
    
    // Обновляем отображение
    updateDisplay();
    updateDonationDisplay();
    
    // [Остальная инициализация без изменений]
    
    // Периодическая синхронизация с Supabase
    setInterval(async () => {
        await loadQueueFromSupabase();
        updateDisplay();
    }, 5000);
});

// Экспортируем функции
window.removeTrack = removeTrack;
window.playNext = playNext;
window.clearQueue = clearQueue;
window.addTrack = addTrack;
