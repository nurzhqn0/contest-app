# Student Contest

MVP of a web platform and Telegram bot for student contests

## Deployment guides

- VPS setup: [docs/vps-deploy.md](docs/vps-deploy.md)
- VPS operations: [docs/vps-operations.md](docs/vps-operations.md)
- Production mode binds the internal app proxy to `127.0.0.1:${APP_PROXY_BIND_PORT:-8081}` by default to avoid common VPS port conflicts.
- Domain and subdomain setup for a real VPS deploy is documented in [docs/vps-deploy.md](docs/vps-deploy.md#0-connect-your-domain).

## Implemented features

- `backend/`: FastAPI API with SQLite, JWT auth, rooms, tasks, participants, progress tracking, leaderboard, public page, bot endpoints, Alembic migrations, and `.xlsx` export.
- `frontend/`: React/Vite organizer dashboard and public room page.
- `telegram-bot/`: Telegram bot with registration via room code, selecting the current room, `/tasks`, `/result`, `/rank`, plus a background loop for reminders and daily summaries.
- `docker-compose.yml`: local run of `backend`, `frontend`, `telegram-bot`, `nginx`.

## Structure

```text
backend/
frontend/
telegram-bot/
deploy/nginx/
docker-compose.yml
```

## Local run without Docker

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API will be available at ‎`http://localhost:8000`.

Default organizer:

```text
username: admin
password: admin123
```

On startup the backend runs ‎`alembic upgrade head`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Panel will be available at `http://localhost:5173`.

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

## Start with Docker Compose

1. Copy `.env.example` в `.env`.
2. Define `TELEGRAM_BOT_TOKEN`.
3. Start:

```bash
docker compose up --build
```

Available:

- `http://localhost:8000` — FastAPI
- `http://localhost:5173` — фронтенд
- `http://localhost:8080` — reverse proxy / публичный доступ

## Main API groups:

- `/api/v1/auth/*`
- `/api/v1/dashboard/*`
- `/api/v1/rooms/*`
- `/api/v1/public/*`
- `/api/v1/bot/*`
- `/ws/rooms/{room_id}/leaderboard`
