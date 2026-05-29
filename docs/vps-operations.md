# VPS operations guide

This guide covers day-2 operations for the Student Contest deployment.

## Service status

Show container state:

```bash
cd ~/apps/student-contest
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

## Logs

Tail all logs:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
```

Tail a single service:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f telegram-bot
```

## Deploy an update

```bash
cd ~/apps/student-contest
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## Roll back quickly

If the app was deployed from Git and the previous commit is still available:

```bash
cd ~/apps/student-contest
git log --oneline -n 5
git checkout <PREVIOUS_COMMIT_OR_TAG>
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

If you use branches/tags in a stricter release process, prefer switching to the last known-good tag instead of a raw commit.

## Health checks

Backend:

```bash
docker compose exec backend python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/health').read().decode())"
```

Internal app proxy:

```bash
curl -I http://127.0.0.1:8081/
```

Public site:

```bash
curl -I https://your-domain.com/
curl -I https://your-domain.com/login
```

## Database backups

Manual backup:

```bash
cd ~/apps/student-contest
cp data/student_contest.db ~/backups/student-contest/student_contest_$(date +%F_%H-%M-%S).db
```

Restore from backup:

```bash
cd ~/apps/student-contest
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
cp ~/backups/student-contest/<BACKUP_FILE>.db data/student_contest.db
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## TLS renewal

Check Certbot timer:

```bash
systemctl status certbot.timer
```

Dry-run renewal:

```bash
sudo certbot renew --dry-run
```

## Telegram bot checks

Container logs:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f telegram-bot
```

Things to verify:

- bot token is present in `.env`
- `BACKEND_URL=http://backend:8000/api/v1`
- backend is healthy
- reminders appear in the bot logs as sent or failed

## File locations

Deployment root:

```text
~/apps/student-contest
```

Important paths:

- app env: `~/apps/student-contest/.env`
- SQLite db: `~/apps/student-contest/data/student_contest.db`
- host nginx site: `/etc/nginx/sites-available/student-contest`
- TLS certs: `/etc/letsencrypt/live/your-domain.com/`

## Recommended cron for backups

Open crontab:

```bash
crontab -e
```

Example daily backup at 03:15:

```cron
15 3 * * * cd /home/<USER>/apps/student-contest && cp data/student_contest.db /home/<USER>/backups/student-contest/student_contest_$(date +\%F_\%H-\%M-\%S).db
```

## Recommended next infrastructure step

This VPS guide is good for MVP production, but the next upgrade should be:

- move from SQLite to PostgreSQL
- keep Docker images in a registry
- deploy by tag
- ship logs centrally
- add external uptime monitoring
