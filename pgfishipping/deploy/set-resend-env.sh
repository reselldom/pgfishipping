#!/usr/bin/env bash
#
# PGFI — set RESEND_API_KEY and related email vars in backend/.env safely.
#
# - Adds the var if it does not exist.
# - Updates the value if the var is already there (does not duplicate it).
# - Preserves every other line in backend/.env.
# - Backs up the previous file as backend/.env.bak-YYYYMMDDHHMMSS.
# - Never prints the key to stdout.
#
# Usage (interactive — recommended for first run):
#   ./deploy/set-resend-env.sh
#   # script will prompt for RESEND_API_KEY (input is hidden)
#
# Usage (non-interactive):
#   RESEND_API_KEY="re_xxx" \
#   EMAIL_FROM="PGFI Shipping <noreply@pgfishipping.com>" \
#   EMAIL_REPLY_TO="support@pgfishipping.com" \
#   APP_URL="https://www.pgfishipping.com" \
#   PUBLIC_WEB_DEFAULT_LOCALE="ht" \
#   ./deploy/set-resend-env.sh
#
# After running:
#   ./deploy/droplet-update.sh   # restart PM2 so the new key takes effect

set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/var/www/pgfishipping/pgfishipping}"
ENV_FILE="${ENV_FILE:-$REPO_ROOT/backend/.env}"

die() { printf 'Error: %s\n' "$1" >&2; exit 1; }

[[ -f "$ENV_FILE" ]] || die "Missing $ENV_FILE — copy from deploy/backend.env.production.example first."

# Defaults (only used if the var is empty / not provided)
: "${EMAIL_FROM:=PGFI Shipping <noreply@pgfishipping.com>}"
: "${EMAIL_REPLY_TO:=support@pgfishipping.com}"
: "${APP_URL:=https://www.pgfishipping.com}"
: "${PUBLIC_WEB_DEFAULT_LOCALE:=ht}"

# Prompt for the Resend key if not provided in env (input hidden).
if [[ -z "${RESEND_API_KEY:-}" ]]; then
  printf 'Paste your RESEND_API_KEY (input hidden, starts with re_): '
  IFS= read -rs RESEND_API_KEY
  echo
fi

[[ -n "${RESEND_API_KEY:-}" ]] || die "RESEND_API_KEY is empty"
[[ "$RESEND_API_KEY" == re_* ]] || printf 'Warning: key does not start with "re_" — continuing anyway.\n' >&2

stamp="$(date +%Y%m%d%H%M%S)"
cp "$ENV_FILE" "$ENV_FILE.bak-$stamp"

# Set or replace KEY=VALUE in $ENV_FILE without printing the value.
set_or_update() {
  local key="$1" value="$2" file="$ENV_FILE"
  if grep -q "^${key}=" "$file"; then
    # Use a temp file + awk so special characters in $value are safe.
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

set_or_update "RESEND_API_KEY"            "$RESEND_API_KEY"
set_or_update "EMAIL_FROM"                "$EMAIL_FROM"
set_or_update "EMAIL_REPLY_TO"            "$EMAIL_REPLY_TO"
set_or_update "APP_URL"                   "$APP_URL"
set_or_update "PUBLIC_WEB_DEFAULT_LOCALE" "$PUBLIC_WEB_DEFAULT_LOCALE"

chmod 600 "$ENV_FILE" || true

echo "==> Updated $ENV_FILE (backup: $ENV_FILE.bak-$stamp)"
echo "    keys present:"
grep -E '^(RESEND_API_KEY|EMAIL_FROM|EMAIL_REPLY_TO|APP_URL|PUBLIC_WEB_DEFAULT_LOCALE)=' "$ENV_FILE" \
  | sed -E 's/(RESEND_API_KEY)=.+/\1=***SET***/'

echo ""
echo "Next: from $REPO_ROOT run  ./deploy/droplet-update.sh  to restart PM2."
