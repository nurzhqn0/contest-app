# Student Contest

MVP веб-платформы и Telegram-бота для студенческих конкурсов по ТЗ от 28 мая 2026.

## Deployment guides

- VPS setup: [docs/vps-deploy.md](docs/vps-deploy.md)
- VPS operations: [docs/vps-operations.md](docs/vps-operations.md)
- Production mode binds the internal app proxy to `127.0.0.1:${APP_PROXY_BIND_PORT:-8081}` by default to avoid common VPS port conflicts.
- Domain and subdomain setup for a real VPS deploy is documented in [docs/vps-deploy.md](docs/vps-deploy.md#0-connect-your-domain).

## Что реализовано

- `backend/`: FastAPI API с SQLite, JWT-авторизацией, комнатами, заданиями, участниками, прогрессом, лидербордом, публичной страницей, bot-endpoints, Alembic-миграциями и экспортом `.xlsx`.
- `frontend/`: React/Vite панель организатора и публичная страница комнаты.
- `telegram-bot/`: Telegram-бот с регистрацией по коду комнаты, выбором текущей комнаты, `/tasks`, `/result`, `/rank`, а также фоновым циклом для напоминаний и итогов дня.
- `docker-compose.yml`: локальный запуск `backend`, `frontend`, `telegram-bot`, `nginx`.

## Структура

```text
backend/
frontend/
telegram-bot/
deploy/nginx/
docker-compose.yml
```

## Локальный запуск без Docker

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API будет доступен на `http://localhost:8000`.

Организатор по умолчанию:

```text
username: admin
password: admin123
```

При старте backend выполняет `alembic upgrade head`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Панель будет доступна на `http://localhost:5173`.

### Telegram Bot

```bash
cd telegram-bot
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export TELEGRAM_BOT_TOKEN=...
export BACKEND_URL=http://localhost:8000/api/v1
export NOTIFICATION_POLL_SECONDS=30
python -m app.main
```

## Запуск через Docker Compose

1. Скопируйте `.env.example` в `.env`.
2. Укажите `TELEGRAM_BOT_TOKEN`.
3. Запустите:

```bash
docker compose up --build
```

Доступ:

- `http://localhost:8000` — FastAPI
- `http://localhost:5173` — фронтенд
- `http://localhost:8080` — reverse proxy / публичный доступ

## Основные API-группы

- `/api/v1/auth/*`
- `/api/v1/dashboard/*`
- `/api/v1/rooms/*`
- `/api/v1/public/*`
- `/api/v1/bot/*`
- `/ws/rooms/{room_id}/leaderboard`

## Ограничения текущего MVP

- Нет отдельной сущности нескольких организаторов и сложной RBAC.
- Планировщик отправляет reminders и daily summary циклическим опросом backend, без внешней очереди и distributed-lock.
- Для уже существующих legacy SQLite-баз без `alembic_version` используется режим adopt-and-stamp.
