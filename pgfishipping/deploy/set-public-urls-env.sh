#!/usr/bin/env bash
#
# PGFI — set public URLs and CORS allow-list in backend/.env, then reload PM2.
#
# Defaults to the production hostnames; override with env vars if yours differ.
#
# Usage (interactive — uses defaults):
#   ./deploy/set-public-urls-env.sh
#
# Override defaults:
#   APP_URL=https://www.example.com \
#   API_URL=https://api.example.com \
#   ADMIN_URL=https://admin.example.com \
#   ./deploy/set-public-urls-env.sh
#
# After running, PM2 reload happens automatically and a CORS preflight is
# verified for both the storefront and admin origins.

set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/var/www/pgfishipping/pgfishipping}"
ENV_FILE="${ENV_FILE:-$REPO_ROOT/backend/.env}"
DEPLOY_DIR="$REPO_ROOT/deploy"

APP_URL="${APP_URL:-https://www.pgfishipping.com}"
API_URL="${API_URL:-https://api.pgfishipping.com}"
ADMIN_URL="${ADMIN_URL:-https://admin.pgfishipping.com}"
PUBLIC_WEB_DEFAULT_LOCALE="${PUBLIC_WEB_DEFAULT_LOCALE:-ht}"
CORS_ORIGINS="${CORS_ORIGINS:-${APP_URL},${ADMIN_URL}}"

die() { printf 'Error: %s\n' "$1" >&2; exit 1; }

[[ -f "$ENV_FILE" ]] || die "Missing $ENV_FILE — copy from deploy/backend.env.production.example first."
command -v pm2 >/dev/null || die "'pm2' not found"

set_or_update() {
  local key="$1" value="$2" file="$ENV_FILE"
  if grep -q "^${key}=" "$file"; then
    awk -v k="$key" -v v="$value" '
      BEGIN { done = 0 }
      {
        if (!done && index($0, k "=") == 1) {
          print k "=" v
          done = 1
        } else {
          print
        }
      }
    ' "$file" > "$file.tmp"
    mv "$file.tmp" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >> "$file"
  fi
}

stamp="$(date +%Y%m%d%H%M%S)"
cp "$ENV_FILE" "$ENV_FILE.bak-$stamp"

set_or_update "APP_URL"                   "$APP_URL"
set_or_update "API_URL"                   "$API_URL"
set_or_update "ADMIN_URL"                 "$ADMIN_URL"
set_or_update "PUBLIC_WEB_DEFAULT_LOCALE" "$PUBLIC_WEB_DEFAULT_LOCALE"
set_or_update "CORS_ORIGINS"              "$CORS_ORIGINS"

chmod 600 "$ENV_FILE" || true

echo "==> Updated $ENV_FILE (backup: $ENV_FILE.bak-$stamp)"
grep -E '^(APP_URL|API_URL|ADMIN_URL|PUBLIC_WEB_DEFAULT_LOCALE|CORS_ORIGINS)=' "$ENV_FILE"

echo ""
echo "==> PM2 reload (so the API picks up the new CORS_ORIGINS)"
if [[ -f "$DEPLOY_DIR/ecosystem.config.cjs" ]]; then
  pm2 reload "$DEPLOY_DIR/ecosystem.config.cjs" --update-env
else
  pm2 restart pgfi-api pgfi-worker --update-env
fi
pm2 save

echo ""
echo "==> CORS preflight: $APP_URL"
curl -sS -i -X OPTIONS "$API_URL/api/auth/register" \
  -H "Origin: $APP_URL" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  | grep -iE 'HTTP/|access-control' || true

echo ""
echo "==> CORS preflight: $ADMIN_URL"
curl -sS -i -X OPTIONS "$API_URL/api/auth/login" \
  -H "Origin: $ADMIN_URL" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  | grep -iE 'HTTP/|access-control' || true

echo ""
echo "Done. If you see 'access-control-allow-origin: <your origin>' on each,"
echo "the browser will now reach the API. Reload your site/admin and retry."
