# 🎵 Приложение для заказ музыки на стрим

Приложение для управления музыкальной очередью на стримах VK Video Live.

## 🌐 Демо
https://inkorius.github.io/music-queue-app/

## 🏗️ Архитектура
- **Фронтенд**: GitHub Pages (статический)
- **Бэкенд**: Supabase (бесплатный хостинг)
- **Хранилище**: Supabase PostgreSQL
- **Функции**: Supabase Edge Functions

## ✨ Функции
- Заказ музыки через DonationAlerts команда !музыка
- Интеграция с DonationAlerts через Supabase Functions
- Управление очередью треков в реальном времени
- Отображение текущего трека
- История донатов
- Панель управления для стримера

## 🚀 Быстрый старт

### 1. Настройка Supabase
1. Создайте проект на [supabase.com](https://supabase.com)
2. Запустите SQL из раздела "Настройка базы данных"
3. Получите URL и Anon Key в Settings > API
4. Настройте Edge Function для DonationAlerts

### 2. Настройка базы данных

Запустите этот SQL в SQL Editor Supabase:

```sql
-- Таблица для очереди треков
CREATE TABLE IF NOT EXISTS music_queue (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT DEFAULT 'Неизвестный исполнитель',
    donor TEXT DEFAULT 'Админ',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица для текущего трека (всегда одна запись)
CREATE TABLE IF NOT EXISTS current_track (
    id INTEGER PRIMARY KEY DEFAULT 1,
    title TEXT DEFAULT 'Нет трека',
    artist TEXT DEFAULT 'Добавьте первый трек!',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица истории донатов
CREATE TABLE IF NOT EXISTS donations_history (
    id BIGSERIAL PRIMARY KEY,
    donation_id BIGINT UNIQUE,
    username TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'RUB',
    message TEXT,
    track_title TEXT,
    track_artist TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Вставляем начальную запись текущего трека
INSERT INTO current_track (id, title, artist) 
VALUES (1, 'Нет трека', 'Добавьте первый трек!')
ON CONFLICT (id) DO NOTHING;

-- Включаем RLS (Row Level Security)
ALTER TABLE music_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE current_track ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations_history ENABLE ROW LEVEL SECURITY;

-- Политики доступа (разрешаем всем читать и писать)
CREATE POLICY "Allow all operations on music_queue" 
ON music_queue FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on current_track" 
ON current_track FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on donations_history" 
ON donations_history FOR ALL USING (true) WITH CHECK (true);
