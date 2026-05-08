#!/usr/bin/env bash
#
# PGFI Droplet — pull latest code, rebuild API + worker Prisma bundle, migrate DB,
# reload PM2. Edit backend/.env on the server beforehand (secrets never in git).
#
# Typical layout (adjust REPO_ROOT if yours differs):
#   /var/www/pgfishipping/pgfishipping/backend/.env
#   /var/www/pgfishipping/pgfishipping/deploy/ecosystem.config.cjs
#
# Usage (SSH then):
#   cd /var/www/pgfishipping/pgfishipping
#   chmod +x deploy/droplet-update.sh
#   ./deploy/droplet-update.sh
#
# Override clone path or branch:
#   REPO_ROOT=/srv/pgfi GIT_BRANCH=main ./deploy/droplet-update.sh
#
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/var/www/pgfishipping/pgfishipping}"
GIT_BRANCH="${GIT_BRANCH:-main}"
BACKEND_DIR="${BACKEND_DIR:-$REPO_ROOT/backend}"
DEPLOY_DIR="$REPO_ROOT/deploy"

die() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

command -v git >/dev/null || die "'git' not found"
command -v npm >/dev/null || die "'npm' not found"
command -v pm2 >/dev/null || die "'pm2' not found (npm i -g pm2)"

[[ -d "$BACKEND_DIR" ]] || die "Backend dir missing: $BACKEND_DIR"
[[ -d "$DEPLOY_DIR" ]] || die "Deploy dir missing: $DEPLOY_DIR"
[[ -f "$BACKEND_DIR/.env" ]] || die "Missing $BACKEND_DIR/.env — copy from deploy/backend.env.production.example and fill secrets"

# Auto-detect the actual git work tree. Handles nested layouts where the
# git toplevel is one level above the app folder (e.g. the repo is named
# 'pgfishipping' and clones to /var/www/pgfishipping/ with the app code
# at /var/www/pgfishipping/pgfishipping/).
if [[ -d "$REPO_ROOT/.git" ]]; then
  GIT_ROOT="$REPO_ROOT"
else
  GIT_ROOT="$(git -C "$REPO_ROOT" rev-parse --show-toplevel 2>/dev/null || true)"
  [[ -n "$GIT_ROOT" ]] || die "Not a git repo at or above $REPO_ROOT (set REPO_ROOT)"
  echo "==> Detected git toplevel: $GIT_ROOT (REPO_ROOT app folder: $REPO_ROOT)"
fi

echo "==> Repo: $GIT_ROOT  (branch: $GIT_BRANCH)"
cd "$GIT_ROOT"

echo "==> Pull origin/$GIT_BRANCH"
git fetch origin "$GIT_BRANCH"
git pull --ff-only origin "$GIT_BRANCH"

cd "$BACKEND_DIR"
echo "==> npm ci + build backend"
npm ci
npm run build

echo "==> Prisma migrate"
npx prisma migrate deploy

cd "$DEPLOY_DIR"
if [[ -f ecosystem.config.cjs ]]; then
  echo "==> PM2 reload (ecosystem.config.cjs)"
  pm2 reload ecosystem.config.cjs --update-env
else
  echo "==> PM2 restart by name (no ecosystem.config.cjs in deploy/)"
  pm2 restart pgfi-api pgfi-worker --update-env
fi

pm2 save

echo "==> Smoke test (adjust port if PORT in .env is not 4000)"
curl -sS "http://127.0.0.1:4000/api/health" 2>/dev/null | head -c 220 || echo "(curl failed — check NODE is listening on PORT from .env)"

echo ""
