#!/usr/bin/env bash
#
# PGFI — reset the local Postgres role password and sync DATABASE_URL in
# backend/.env. Designed to fix Prisma "P1000: Authentication failed" when
# the password in backend/.env no longer matches the role on disk.
#
# Defaults match deploy/README.md (Postgres on 127.0.0.1):
#   DB_USER = pgfi_user
#   DB_NAME = pgfishipping
#   DB_HOST = 127.0.0.1
#   DB_PORT = 5432
#
# Interactive (recommended):
#   ./deploy/set-database-env.sh
#   # prompts for a new password (input hidden, twice for confirmation)
#
# Non-interactive:
#   DB_PASSWORD="some-strong-password" ./deploy/set-database-env.sh
#
# Override role / db / host:
#   DB_USER=pgfi_user DB_NAME=pgfishipping DB_HOST=127.0.0.1 DB_PORT=5432 \
#   ./deploy/set-database-env.sh
#
# After running:
#   ./deploy/droplet-update.sh   # rebuild + migrate + reload PM2

set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/var/www/pgfishipping/pgfishipping}"
ENV_FILE="${ENV_FILE:-$REPO_ROOT/backend/.env}"
DB_USER="${DB_USER:-pgfi_user}"
DB_NAME="${DB_NAME:-pgfishipping}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"

die() { printf 'Error: %s\n' "$1" >&2; exit 1; }

[[ -f "$ENV_FILE" ]] || die "Missing $ENV_FILE — copy from deploy/backend.env.production.example first."

command -v psql      >/dev/null || die "'psql' not found. Install postgresql-client (apt install postgresql-client)."
command -v sudo      >/dev/null || die "'sudo' not found."
command -v python3   >/dev/null || die "'python3' not found (needed to URL-encode the password)."

# Make sure we can reach the postgres superuser.
if ! sudo -n -u postgres psql -tA -c 'SELECT 1' >/dev/null 2>&1; then
  die "Cannot run 'sudo -u postgres psql'. Run this script as root or fix sudoers."
fi

# Make sure the role exists.
exists="$(sudo -u postgres psql -tA -c "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'")" || true
if [[ "$exists" != "1" ]]; then
  die "Postgres role '$DB_USER' does not exist. Create it first: \
sudo -u postgres psql -c \"CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '...';\" && \
sudo -u postgres psql -c \"CREATE DATABASE $DB_NAME OWNER $DB_USER;\""
fi

# Make sure the database exists.
db_exists="$(sudo -u postgres psql -tA -c "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'")" || true
if [[ "$db_exists" != "1" ]]; then
  die "Postgres database '$DB_NAME' does not exist. Create it: \
sudo -u postgres psql -c \"CREATE DATABASE $DB_NAME OWNER $DB_USER;\""
fi

# Prompt for password if not provided. Confirm to avoid typos.
if [[ -z "${DB_PASSWORD:-}" ]]; then
  while :; do
    printf 'Enter NEW password for Postgres role "%s" (input hidden): ' "$DB_USER"
    IFS= read -rs DB_PASSWORD; echo
    [[ -n "$DB_PASSWORD" ]] || { echo "  empty — try again"; continue; }
    printf 'Confirm: '
    IFS= read -rs DB_PASSWORD2; echo
    if [[ "$DB_PASSWORD" != "$DB_PASSWORD2" ]]; then
      echo "  passwords do not match — try again"
      continue
    fi
    break
  done
fi

# Reset the role password. Use psql's -v to bind the password as a properly
# escaped SQL string literal (':'new_pw' below) so special characters in the
# password cannot break the SQL.
sudo -u postgres psql -v ON_ERROR_STOP=1 -v "new_pw=$DB_PASSWORD" -q -c \
  "ALTER ROLE \"${DB_USER}\" WITH ENCRYPTED PASSWORD :'new_pw';" >/dev/null

echo "==> Postgres role $DB_USER password updated."

# URL-encode for DATABASE_URL (python3 handles every safe character correctly).
ENC_PW="$(python3 - <<'PY' "$DB_PASSWORD"
import sys, urllib.parse
print(urllib.parse.quote(sys.argv[1], safe=""))
PY
)"

DATABASE_URL="postgresql://${DB_USER}:${ENC_PW}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"

stamp="$(date +%Y%m%d%H%M%S)"
cp "$ENV_FILE" "$ENV_FILE.bak-$stamp"

# Set or update DATABASE_URL in backend/.env without printing the value.
if grep -q '^DATABASE_URL=' "$ENV_FILE"; then
  awk -v v="$DATABASE_URL" '
    BEGIN { done = 0 }
    {
      if (!done && index($0, "DATABASE_URL=") == 1) {
        print "DATABASE_URL=" v
        done = 1
      } else {
        print
      }
    }
  ' "$ENV_FILE" > "$ENV_FILE.tmp"
  mv "$ENV_FILE.tmp" "$ENV_FILE"
else
  printf 'DATABASE_URL=%s\n' "$DATABASE_URL" >> "$ENV_FILE"
fi

chmod 600 "$ENV_FILE" || true

echo "==> Updated $ENV_FILE (backup: $ENV_FILE.bak-$stamp)"
echo "    DATABASE_URL set to: postgresql://${DB_USER}:***hidden***@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"

# Smoke test: connect as the role using the new password.
echo "==> Smoke test (psql connect as $DB_USER)"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc 'SELECT 1' \
  && echo "    OK — connection works." \
  || die "Connection still fails. Double-check pg_hba.conf allows local md5/scram for $DB_USER."

echo ""
echo "Next: from $REPO_ROOT run  ./deploy/droplet-update.sh"
