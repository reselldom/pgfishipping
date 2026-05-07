#!/usr/bin/env bash
# =============================================================================
# PGFI — one-shot Droplet provisioning (Ubuntu 22.04+, run as root)
#
# I cannot SSH into your server from Cursor; copy this file to the Droplet and
# run with env vars set (see below).
#
# Usage (on the Droplet, after: ssh root@YOUR_DROPLET_IP):
#
#   apt update && apt install -y curl git
#   curl -fsSL -o /tmp/droplet-bootstrap.sh \
#     https://raw.githubusercontent.com/reselldom/pgfishipping/main/pgfishipping/deploy/droplet-bootstrap.sh
#   chmod +x /tmp/droplet-bootstrap.sh
#
#   export PGFI_DOMAIN=pgfishipping.com
#   export PGFI_DB_PASSWORD='...'
#   export PGFI_JWT_SECRET='...'                    # openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 48
#   export PGFI_SUPER_ADMIN_EMAIL='admin@pgfishipping.com'
#   export PGFI_SUPER_ADMIN_PASSWORD='...'
#   export CERTBOT_EMAIL='you@example.com'
#   bash /tmp/droplet-bootstrap.sh
#
# Optional:
#   PGFI_REPO_URL=https://github.com/reselldom/pgfishipping.git
#   PGFI_CLONE_DIR=/var/www/pgfishipping
#   PGFI_ENABLE_UFW=1
# =============================================================================

set -euo pipefail

PGFI_DOMAIN="${PGFI_DOMAIN:-pgfishipping.com}"
PGFI_REPO_URL="${PGFI_REPO_URL:-https://github.com/reselldom/pgfishipping.git}"
PGFI_CLONE_DIR="${PGFI_CLONE_DIR:-/var/www/pgfishipping}"

API_HOST="api.${PGFI_DOMAIN}"
APP_URL="https://www.${PGFI_DOMAIN}"
ADMIN_URL="https://admin.${PGFI_DOMAIN}"
API_URL="https://${API_HOST}"

require_env() {
  local n="$1"
  if [ -z "${!n:-}" ]; then
    echo "error: set ${n}" >&2
    exit 1
  fi
}

require_env PGFI_DB_PASSWORD
require_env PGFI_JWT_SECRET
require_env PGFI_SUPER_ADMIN_EMAIL
require_env PGFI_SUPER_ADMIN_PASSWORD
require_env CERTBOT_EMAIL

if [ "${EUID:-0}" -ne 0 ]; then
  echo "error: run as root (sudo -i)" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> apt packages"
apt update && apt upgrade -y
apt install -y \
  curl git nginx certbot python3-certbot-nginx \
  postgresql postgresql-contrib redis-server

echo "==> Node.js 20 (LTS)"
if ! command -v node >/dev/null 2>&1 || ! node -v | grep -q '^v20\.'; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi
command -v npm >/dev/null

echo "==> pm2"
npm install -g pm2

echo "==> Postgres + Redis"
systemctl enable --now postgresql redis-server

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='pgfi_user'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE USER pgfi_user WITH ENCRYPTED PASSWORD '${PGFI_DB_PASSWORD}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='pgfishipping'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE pgfishipping OWNER pgfi_user;"

echo "==> clone repo"
mkdir -p "$(dirname "$PGFI_CLONE_DIR")"
if [ ! -d "${PGFI_CLONE_DIR}/.git" ]; then
  git clone "$PGFI_REPO_URL" "$PGFI_CLONE_DIR"
fi

REPO_ROOT="${PGFI_CLONE_DIR}/pgfishipping"
BACKEND_DIR="${REPO_ROOT}/backend"
DEPLOY_DIR="${REPO_ROOT}/deploy"

if [ ! -d "$BACKEND_DIR" ]; then
  echo "error: expected ${BACKEND_DIR} — check PGFI_CLONE_DIR / repo layout" >&2
  exit 1
fi

echo "==> backend/.env"
DATABASE_URL="postgresql://pgfi_user:${PGFI_DB_PASSWORD}@127.0.0.1:5432/pgfishipping?schema=public"
cat >"${BACKEND_DIR}/.env" <<EOF
NODE_ENV=production
PORT=4000

APP_URL=${APP_URL}
API_URL=${API_URL}
ADMIN_URL=${ADMIN_URL}

DATABASE_URL=${DATABASE_URL}
REDIS_URL=redis://127.0.0.1:6379

JWT_SECRET=${PGFI_JWT_SECRET}
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

CORS_ORIGINS=${APP_URL},${ADMIN_URL}

RESEND_API_KEY=
EMAIL_FROM=PGFI Shipping <noreply@${PGFI_DOMAIN}>
EMAIL_REPLY_TO=support@${PGFI_DOMAIN}

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

SUPER_ADMIN_EMAIL=${PGFI_SUPER_ADMIN_EMAIL}
SUPER_ADMIN_PASSWORD=${PGFI_SUPER_ADMIN_PASSWORD}

JOBS_ENABLED=true
EOF
chmod 600 "${BACKEND_DIR}/.env"

echo "==> npm build + prisma"
cd "$BACKEND_DIR"
# Install devDependencies too: `prisma` CLI + `tsx` (seed) are devDeps in package.json.
unset NODE_ENV
export NPM_CONFIG_PRODUCTION=false
npm ci
npx prisma generate
npm run build
npx prisma migrate deploy
npm run seed

echo "==> pm2 (api + worker)"
cd "$DEPLOY_DIR"
cp -n ecosystem.config.cjs.example ecosystem.config.cjs
pm2 delete pgfi-api 2>/dev/null || true
pm2 delete pgfi-worker 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

echo "==> pm2 startup (systemd)"
# `pm2 startup` prints a line starting with `sudo env PATH=... pm2 ...` — run it.
STARTUP_CMD="$(pm2 startup 2>/dev/null | grep -E '^sudo ' | head -1 || true)"
if [ -n "${STARTUP_CMD}" ]; then
  eval "${STARTUP_CMD}"
else
  echo "warning: could not auto-run pm2 startup — run \`pm2 startup\` manually and paste the sudo line" >&2
fi

echo "==> nginx (HTTP)"
sed "s/api.example.com/${API_HOST}/g" "${DEPLOY_DIR}/nginx-api.conf.example" \
  >/etc/nginx/sites-available/pgfi-api
ln -sf /etc/nginx/sites-available/pgfi-api /etc/nginx/sites-enabled/pgfi-api
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> certbot (HTTPS)"
certbot --nginx -d "${API_HOST}" --non-interactive --agree-tos \
  -m "${CERTBOT_EMAIL}" --redirect

if [ "${PGFI_ENABLE_UFW:-0}" = "1" ]; then
  echo "==> ufw"
  ufw allow OpenSSH
  ufw allow 'Nginx Full'
  ufw --force enable
fi

echo "==> smoke test"
curl -sS -o /dev/null -w "https://${API_HOST}/api/public/social-links -> HTTP %{http_code}\n" \
  "https://${API_HOST}/api/public/social-links" || true

echo "done. Change SUPER_ADMIN_PASSWORD in production UI after first login."
