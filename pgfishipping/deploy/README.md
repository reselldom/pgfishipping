# Deploy PGFI — DigitalOcean (API) + Vercel (websites)

Your stack:

| Where | What |
|--------|------|
| **Vercel** | Customer Next.js (`pgfishipping/frontend`) + Admin Next.js (`pgfishipping/admin`) |
| **DigitalOcean Droplet** | Node API (REST + **Socket.IO** chat), **Postgres**, **Redis**, **BullMQ worker** |

You need: a **domain**, **DigitalOcean** account, **Vercel** account, **GitHub** (repo already: `reselldom/pgfishipping`).

Replace `example.com` below with your real domain.

---

## Part A — DNS (at your domain registrar)

Create records:

| Type | Name | Value |
|------|------|--------|
| **A** | `api` | Your Droplet **public IPv4** |
| **CNAME** or **A** | `www` | Vercel will give you a target when you add the domain to the project |
| **CNAME** or **A** | `admin` | Same idea (second Vercel project) |

Exact steps: after you create Vercel projects, add custom domains **www.example.com** and **admin.example.com**; Vercel shows the record to paste (often **CNAME** to `cname.vercel-dns.com` or an **A** record).

**API** always points to the **Droplet IP** (not Vercel).

---

## Part B — Droplet (Ubuntu 22.04 LTS)

1. **Create** a Droplet (**2 GB RAM / 1 vCPU** minimum recommended), choose **SSH key**, region close to users.

2. **SSH in** as root:

   ```bash
   ssh root@YOUR_DROPLET_IP
   ```

3. **Basics:**

   ```bash
   apt update && apt upgrade -y
   apt install -y curl git nginx certbot python3-certbot-nginx postgresql postgresql-contrib redis-server
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt install -y nodejs
   npm install -g pm2
   ```

4. **Postgres** (weak password example — use a strong one):

   ```bash
   sudo -u postgres psql -c "CREATE USER pgfi_user WITH ENCRYPTED PASSWORD 'STRONG_DB_PASSWORD';"
   sudo -u postgres psql -c "CREATE DATABASE pgfishipping OWNER pgfi_user;"
   ```

5. **Clone repo** (creates `/var/www/pgfishipping` with nested `pgfishipping/` app folder):

   ```bash
   mkdir -p /var/www && cd /var/www
   git clone https://github.com/reselldom/pgfishipping.git
   cd pgfishipping/pgfishipping/backend
   ```

6. **`backend/.env`:** Copy from `deploy/backend.env.production.example` in this repo, fill real values:

   - `DATABASE_URL`, `JWT_SECRET` (32+ chars), `CORS_ORIGINS` (**both** `https://www.example.com` and `https://admin.example.com`), `API_URL`, `APP_URL`, `ADMIN_URL`, `SUPER_ADMIN_*`, optional `R2_*` / `RESEND_API_KEY`.

7. **Build & migrate:**

   ```bash
   npm ci
   npm run build
   npx prisma migrate deploy
   npm run seed
   ```

8. **PM2:** Copy `deploy/ecosystem.config.cjs.example` to e.g. `/var/www/pgfishipping/pgfishipping/deploy/ecosystem.config.cjs`, edit `backendDir` if your path differs, then:

   ```bash
   cd /var/www/pgfishipping/pgfishipping/deploy
   cp ecosystem.config.cjs.example ecosystem.config.cjs
   # edit ecosystem.config.cjs — set backendDir
   pm2 start ecosystem.config.cjs
   pm2 save
   pm2 startup
   # run the command it prints so PM2 restarts after reboot
   ```

9. **Nginx:** Copy `deploy/nginx-api.conf.example` to `/etc/nginx/sites-available/pgfi-api`, replace `api.example.com` with **api.yourdomain.com**, symlink:

   ```bash
   ln -s /etc/nginx/sites-available/pgfi-api /etc/nginx/sites-enabled/
   nginx -t && systemctl reload nginx
   ```

10. **TLS (after HTTP works):**

    ```bash
    certbot --nginx -d api.yourdomain.com
    ```

    Use **HTTPS** URLs in `backend/.env` (`API_URL`, and `NEXT_PUBLIC_API_URL` on Vercel).

11. **Firewall (UFW)** — optional but recommended:

    ```bash
    ufw allow OpenSSH
    ufw allow 'Nginx Full'
    ufw enable
    ```

12. **Test:**

    ```bash
    curl -sS https://api.yourdomain.com/
    curl -sS https://api.yourdomain.com/api/public/social-links
    ```

---

## Part C — Vercel (two projects)

### Project 1 — Customer site

1. **New Project** → import GitHub repo `reselldom/pgfishipping`.
2. **Root Directory:** `pgfishipping/frontend`  
   *(If your repo root already contains `frontend/` with no nested `pgfishipping/`, use `frontend` instead.)*
3. **Framework:** Next.js (auto)
4. **Environment variables:**

   | Name | Value |
   |------|--------|
   | `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com/api` |

5. **Deploy**. Add domain **www.yourdomain.com** (and optionally **apex** redirect to www in Vercel).

### Project 2 — Admin

1. **New Project** → same repo.
2. **Root Directory:** `pgfishipping/admin`  
   *(If your repo root already contains `admin/` with no nested `pgfishipping/`, use `admin` instead.)*
3. **Environment variables:**

   | Name | Value |
   |------|--------|
   | `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com/api` |

4. **Deploy**. Add domain **admin.yourdomain.com**.

5. After first deploy, set **`ADMIN_URL`** or any mail links — already covered if API `ADMIN_URL` env matches `https://admin.yourdomain.com`.

---

## Part D — CORS checklist

`backend/.env` must include **exact** origins the browser uses (scheme + host, no trailing slash):

```env
CORS_ORIGINS=https://www.yourdomain.com,https://admin.yourdomain.com
```

If you use Vercel **preview** URLs for testing, add those temporarily or cookies / API calls from preview may fail.

---

## Part E — After deploy

1. Open **https://www.yourdomain.com** — home & login.
2. Open **https://admin.yourdomain.com** — super admin login (from seed / `SUPER_ADMIN_*`).
3. Test **support chat** from customer + admin (Socket.IO uses **same** `api` host — Nginx config already proxies `/socket.io/`).
4. Change default **super admin password** immediately.

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| API CORS errors | `CORS_ORIGINS` matches Vercel URLs exactly. |
| Chat never connects | Nginx `/socket.io/` block; API HTTPS; `NEXT_PUBLIC_API_URL` base domain matches API (chat strips `/api` for socket host in code). |
| 502 from Nginx | `pm2 status`, `pm2 logs pgfi-api`, Postgres/Redis running. |
| Prisma errors | `npx prisma migrate deploy` on server. |

---

## Cost reminder

- **Droplet** + **Vercel** (Hobby vs Pro per their terms) + **domain**. No Railway/Render required.

If you cannot run these steps yourself, copy this file to a freelancer and give them **temporary** SSH + Vercel/GitHub access, then revoke when done.
