import os


class Settings:
    telegram_bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    backend_url = os.getenv("BACKEND_URL", "http://backend:8000/api/v1")
    notification_poll_seconds = int(os.getenv("NOTIFICATION_POLL_SECONDS", "30"))
    superuser_username = os.getenv("SUPERUSER_USERNAME", "nurzhqn0")



settings = Settings()
