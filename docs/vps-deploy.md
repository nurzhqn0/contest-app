# VPS deployment guide

This guide deploys the full Student Contest stack on a Linux VPS:

- `backend` (FastAPI + SQLite)
- `frontend` (Vite build served by Nginx)
- `telegram-bot`
- internal `nginx` container for app routing
- host-level Nginx for TLS termination with Let's Encrypt

The instructions assume:

- Ubuntu 24.04 LTS
- a fresh VPS
- a domain name already pointed to the server
- SSH access as a sudo-enabled user

## 0. Connect your domain

If you already have your own domain, decide first whether this app should live on:

- the root domain, for example `example.com`
- a subdomain, for example `contest.example.com`

Recommended if you already host another site on the same VPS:

- keep the existing site on the root domain
- deploy this app on a dedicated subdomain such as `contest.example.com`

Create DNS records at your domain provider:

```text
Type   Name      Value                TTL
A      @         <YOUR_VPS_IPV4>      Auto
A      www       <YOUR_VPS_IPV4>      Auto
A      contest   <YOUR_VPS_IPV4>      Auto
```

Use only the records you actually need:

- if you deploy on `example.com`, use `@` and optionally `www`
- if you deploy on `contest.example.com`, use only `contest`

Wait until DNS resolves correctly:

```bash
dig +short example.com
dig +short www.example.com
dig +short contest.example.com
```

All active hostnames should return your VPS IP before you continue.

## 1. Architecture

Production layout:

```text
Internet
  -> host nginx :443
  -> docker nginx :8081 (bound to 127.0.0.1 only)
  -> backend / frontend containers on internal Docker network
  -> telegram-bot container on internal Docker network
```

Why this layout:

- only host Nginx is exposed publicly
- Docker services stay private
- TLS is handled once, at the host edge
- WebSocket upgrades are preserved

## 2. Prepare the VPS

Update the server:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg git ufw nginx certbot python3-certbot-nginx
```

Enable firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Install Docker Engine and Docker Compose plugin:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

Log out and back in once so the `docker` group is active.

## 3. Create an app directory

```bash
mkdir -p ~/apps
cd ~/apps
git clone <YOUR_REPOSITORY_URL> student-contest
cd student-contest
mkdir -p data
```

## 4. Create the production environment file

Copy the example:

```bash
cp .env.example .env
```

Edit `.env`:

```bash
nano .env
```

Recommended production values:

```env
SECRET_KEY=replace-with-a-long-random-secret
ACCESS_TOKEN_EXPIRE_MINUTES=1440
APP_PROXY_BIND_PORT=8081

AUTH_COOKIE_NAME=student_contest_session
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAMESITE=lax

CSRF_COOKIE_NAME=student_contest_csrf
CSRF_HEADER_NAME=X-CSRF-Token

ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace-this-password

DATABASE_URL=sqlite:///./data/student_contest.db

CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
PUBLIC_BASE_URL=https://your-domain.com
LOCAL_TIMEZONE=Asia/Almaty
NOTIFICATION_POLL_SECONDS=30

TELEGRAM_BOT_TOKEN=replace-with-your-real-bot-token
BACKEND_URL=http://backend:8000/api/v1
```

Notes:

- `AUTH_COOKIE_SECURE=true` is required for HTTPS production.
- `CORS_ORIGINS` must use your real HTTPS domain.
- SQLite is stored in `./data/student_contest.db` on the VPS.
- If you deploy on a subdomain such as `contest.example.com`, use that exact domain in both `CORS_ORIGINS` and `PUBLIC_BASE_URL`.

Examples:

```env
# Root domain
CORS_ORIGINS=https://example.com,https://www.example.com
PUBLIC_BASE_URL=https://example.com
```

```env
# Dedicated subdomain
CORS_ORIGINS=https://contest.example.com
PUBLIC_BASE_URL=https://contest.example.com
```

## 5. Start the app in production mode

Use the base Compose file plus the production override:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Validate container status:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

Validate the backend internally:

```bash
docker compose exec backend python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/health').read().decode())"
```

Expected result:

```text
{"status":"ok"}
```

At this point, the internal app proxy should be reachable only from the server:

```bash
curl -I http://127.0.0.1:8081/
```

## 6. Configure host Nginx

Copy the example host config:

```bash
sudo cp deploy/nginx/vps-site.conf.example /etc/nginx/sites-available/student-contest
```

Edit the file and replace:

- `your-domain.com`
- `www.your-domain.com`
- `127.0.0.1:8081` if you choose another internal app port

Examples:

- root-domain deploy:
  - `your-domain.com` -> `example.com`
  - `www.your-domain.com` -> `www.example.com`
- subdomain deploy:
  - replace both `your-domain.com` and `www.your-domain.com` with `contest.example.com`
  - update the certificate paths to `contest.example.com`

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/student-contest /etc/nginx/sites-enabled/student-contest
sudo nginx -t
sudo systemctl reload nginx
```

If your VPS already has another host config, make sure each site has its own `server_name` and does not reuse the same domain.

## 7. Issue the TLS certificate

Run Certbot:

```bash
§
```

Subdomain example:

```bash
sudo certbot --nginx -d contest.example.com
```

Certbot will:

- request the certificate
- update the Nginx server block
- install automatic renewal

Verify renewal timer:

```bash
systemctl status certbot.timer
```

## 8. Final verification checklist

Check these URLs:

- `https://your-domain.com/`
- `https://your-domain.com/login`
- `https://your-domain.com/api/v1/auth/me` should return `401` in a fresh browser session
- `https://your-domain.com/docs`

If you deployed on a subdomain, replace all checks with that subdomain:

- `https://contest.example.com/`
- `https://contest.example.com/login`
- `https://contest.example.com/api/v1/auth/me`
- `https://contest.example.com/docs`

Test login:

- sign in with the configured admin user
- confirm redirect to `/app`
- confirm refresh still keeps the session
- confirm logout returns to `/login`

Test Telegram bot:

- open the bot in Telegram
- use `/start`
- register into a room
- submit `/tasks`

## 9. Common maintenance commands

Rebuild after a code update:

```bash
cd ~/apps/student-contest
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Check logs:

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f telegram-bot
docker compose logs -f nginx
```

Restart a single service:

```bash
docker compose restart backend
docker compose restart telegram-bot
```

## 10. SQLite backup

Create a backup directory:

```bash
mkdir -p ~/backups/student-contest
```

Create a timestamped backup:

```bash
cp data/student_contest.db ~/backups/student-contest/student_contest_$(date +%F_%H-%M-%S).db
```

Recommended:

- back up before every deployment
- back up daily with cron
- copy backups off the VPS as well

## 11. Security notes

- Replace the default admin password before exposing the app.
- Never commit the real `TELEGRAM_BOT_TOKEN` to source control.
- Keep `AUTH_COOKIE_SECURE=true` in production.
- Limit SSH access and consider fail2ban.
- Keep the server updated.
- SQLite is acceptable for MVP deployment, but PostgreSQL is the better next step for reliability and concurrent writes.

## 12. Production file summary

Files added for VPS deployment:

- `docker-compose.prod.yml`
- `deploy/nginx/vps-site.conf.example`
- `docs/vps-deploy.md`
- `docs/vps-operations.md`

Use these together with:

- `docker-compose.yml`
- `.env`
- `deploy/nginx/nginx.conf`
