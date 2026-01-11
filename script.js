// Данные очереди (в реальности будут храниться на сервере)
let musicQueue = [
    {id: 1, title: "Трек 1", artist: "Исполнитель 1", donor: "Зритель 1"},
    {id: 2, title: "Трек 2", artist: "Исполнитель 2", donor: "Зритель 2"}
];

let currentTrack = {title: "Нет трека", artist: "Добавьте первый трек!"};
let donations = [];

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
                <div class="queue-item">
                    <span class="queue-number">#${index + 1}</span>
                    <strong>${track.title}</strong> - ${track.artist}
                    <br>
                    <small>Заказал: ${track.donor}</small>
                </div>
            `;
        });
        queueList.innerHTML = html;
    }
    
    // Донаты
    const donationsList = document.getElementById('donationsList');
    if (donations.length === 0) {
        donationsList.innerHTML = '<p>Пока нет донатов</p>';
    } else {
        let html = '';
        donations.slice(0, 5).forEach(donation => {
            html += `
                <div class="donation-item">
                    <span class="donation-amount">${donation.amount}₽</span>
                    от ${donation.name}: ${donation.message}
                </div>
            `;
        });
        donationsList.innerHTML = html;
    }
}

// Имитация получения данных от DonationAlerts
function simulateDonation() {
    const donors = ['Алексей', 'Мария', 'Дмитрий', 'Анна', 'Сергей'];
    const messages = [
        '!музыка любимый трек',
        '!song песня',
        'Отличный стрим!',
        'Заказываю музыку'
    ];
    
    const randomDonation = {
        name: donors[Math.floor(Math.random() * donors.length)],
        amount: Math.floor(Math.random() * 500) + 50,
        message: messages[Math.floor(Math.random() * messages.length)]
    };
    
    donations.unshift(randomDonation);
    if (donations.length > 10) donations.pop();
    
    // Если в сообщении есть команда !музыка или !song
    if (randomDonation.message.includes('!музыка') || randomDonation.message.includes('!song')) {
        const query = randomDonation.message.replace(/!(музыка|song)\s*/i, '').trim();
        if (query) {
            addToQueue(query, randomDonation.name);
        }
    }
    
    updateDisplay();
}

// Добавление трека в очередь
function addToQueue(trackName, donorName) {
    const newTrack = {
        id: Date.now(),
        title: trackName,
        artist: 'Неизвестный исполнитель',
        donor: donorName
    };
    
    musicQueue.push(newTrack);
    updateDisplay();
    
    // Здесь в реальном приложении будет запрос к API Яндекс.Музыки
    console.log(`Поиск трека: ${trackName} для ${donorName}`);
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    updateDisplay();
    
    // Имитация периодических донатов (для демо)
    setInterval(simulateDonation, 15000);
    
    // Обновление данных каждые 10 секунд
    setInterval(updateDisplay, 10000);
});
