# Invoicer Telegram Bot

Telegram бот для автозаполнения документов по реквизитам. Работает как Mini App внутри Telegram, а также как автономный бот для обработки файлов.

## Возможности

- **Mini App** — полный UI инвойсера внутри Telegram
- **Обработка файлов** — отправьте PDF/TXT/DOCX с реквизитами, получите готовый документ
- **Текстовые сообщения** — вставьте текст с реквизитами, бот распознает и создаст документ
- **LLM интеграция** — автоматический парсинг реквизитов через OpenAI-совместимый API

## Установка

### 1. Создайте бота в Telegram

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot` и следуйте инструкциям
3. Сохраните токен бота (BOT_TOKEN)

### 2. Настройте Mini App

1. В @BotFather отправьте `/mybots`
2. Выберите вашего бота → Bot Settings → Menu Button
3. Настройте URL вашего приложения (WEBAPP_URL)

### 3. Установите зависимости

```bash
cd bot
npm install
```

### 4. Настройте переменные окружения

```bash
cp .env.example .env
```

Отредактируйте `.env`:

```env
# Обязательно
BOT_TOKEN=your_bot_token_here
WEBAPP_URL=https://your-domain.com/bog/mol/invoicer/-/

# Опционально (для автоматического парсинга)
LLM_URL=http://localhost:11434/v1
LLM_KEY=
```

### 5. Запустите бота

```bash
npm start
```

Для разработки с автоперезагрузкой:

```bash
npm run dev
```

## Использование

### Mini App

1. Откройте бота в Telegram
2. Нажмите кнопку "Открыть приложение"
3. Используйте полный интерфейс инвойсера

### Обработка файлов (требует LLM)

1. Отправьте боту файл с реквизитами (PDF, TXT, DOCX)
2. Бот извлечёт текст, распознает реквизиты и отправит готовый документ

### Текстовые сообщения (требует LLM)

1. Вставьте текст с реквизитами в чат
2. Бот распознает реквизиты и отправит готовый документ

## Конфигурация LLM

Бот поддерживает любой OpenAI-совместимый API:

### Ollama (локально)

```env
LLM_URL=http://localhost:11434/v1
LLM_KEY=
```

### OpenAI

```env
LLM_URL=https://api.openai.com/v1
LLM_KEY=sk-...
```

### Другие провайдеры

Любой сервер с OpenAI-совместимым API `/v1/chat/completions`.

## Docker Compose

Для запуска вместе с основным приложением см. `../docker-compose.yml`.

Добавьте в docker-compose.yml:

```yaml
  bot:
    build: ./bot
    environment:
      - BOT_TOKEN=${BOT_TOKEN}
      - WEBAPP_URL=https://your-domain.com/bog/mol/invoicer/-/
      - LLM_URL=http://llm:11434/v1
    depends_on:
      - llm
    restart: unless-stopped
```

## Команды бота

- `/start` — приветствие и кнопка Mini App
- `/help` — справка по использованию

## Поддерживаемые форматы файлов

| Формат | MIME-тип | Расширение |
|--------|----------|------------|
| PDF | application/pdf | .pdf |
| Текст | text/plain | .txt |
| Word | application/vnd.openxmlformats-officedocument.wordprocessingml.document | .docx |

## Распознаваемые реквизиты

- Название компании
- ИНН, КПП, ОГРН
- Юридический адрес
- Банк, БИК, расчётный счёт, корр. счёт
- Руководитель
- Телефон, email
