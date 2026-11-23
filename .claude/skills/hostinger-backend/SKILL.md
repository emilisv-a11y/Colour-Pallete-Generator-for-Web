---
name: hostinger-backend
description: D5 WebTool's PHP/MySQL server on Hostinger: how it is deployed, the one-time setup, running the full stack locally (MariaDB + php -S), signing in from tests, and troubleshooting the live domain (404s, setup page, cache, DNS). Use when changing server/, the sign-in/sync/review code, or when the owner reports a problem with the live site.
---

# Hostinger backend

Live at **https://webtools.emilisvastakas.co.uk** (files in hPanel at `emilisvastakas.co.uk/public_html/webtools`). The whole app is behind a sign-in there; client review links (`#/review/<token>`) stay public.

## Deploy

- `.github/workflows/deploy-hostinger.yml` builds, tests and FTP-uploads `dist/` + `server/api` on every push to `main`. Secrets: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_DIR` (optional `FTP_PROTOCOL`). `api/config.php` is never uploaded or deleted.
- The sandbox **cannot open the owner's domain** (proxy 403) and Claude cannot log in to Hostinger. Confirm deploys with the run status and its job log (`mcp__github__get_job_logs`): look for `uploading "api/setup.php"`-style lines and "Sync complete".
- Owner-facing guide: `docs/HOSTINGER.md` (steps 1–7 + troubleshooting table).

## Local full stack

A fresh cloud container has PHP (with `pdo_mysql` once `php-mysql` is installed) but **no MariaDB**. Install it first (takes about a minute; the `policy-rc.d denied` message is harmless, `start.sh` starts the server itself):

```bash
apt-get install -y mariadb-server php-mysql   # or apt-get update first if it can't find them
```

```bash
mysql -e "DROP DATABASE IF EXISTS d5wt; CREATE DATABASE d5wt CHARACTER SET utf8mb4;"   # fresh DB
rm -rf /tmp/d5wt-site && (server/dev/start.sh > /tmp/d5wt.log 2>&1 &)                # builds, serves :8080
until curl -s 127.0.0.1:8080/api/health >/dev/null; do :; done   # use a deadline loop; plain sleep is blocked
curl -s -X POST 127.0.0.1:8080/api/setup.php --data-urlencode db_host=localhost --data-urlencode db_name=d5wt \
  --data-urlencode db_user=d5wt --data-urlencode db_pass=d5wt-local --data-urlencode email=owner@example.com \
  --data-urlencode name=Owner --data-urlencode password=owner-pass-123
curl -s 127.0.0.1:8080/api/health    # {"ok":true,"app":"d5-webtool","ready":true,...}
```

- A fresh `/tmp/d5wt-site` has no `config.php`, so drop the DB first or setup refuses (an owner already exists).
- In Playwright: open `http://127.0.0.1:8080/#/<route>`, fill `input[type=email]` / `input[type=password]`, click `button[type=submit]`, wait for `.app-header`.
- `node server/dev/api-test.mjs` (45 tests) needs an empty DB, i.e. run it before setup.
- Stop with `pkill -f "php -S 127.0.0.1:8080"`.
- `start.sh` copies `dist/` into `/tmp/d5wt-site` **once**. After changing frontend code, `npm run build && cp -r dist/. /tmp/d5wt-site/` (or restart), or the browser still shows the old build.
- Sync tests with two browsers: create the second `browser.newContext()`, sign in, then reload it to pull. To test "sync when the tab closes", close only the **page** (`page.close({ runBeforeUnload: true })`); closing the whole context also cancels the keepalive request and gives a false failure.

## How the frontend decides

`apiHealth()` → `null` (no server: no gate, cloud features hidden), `{ready:false}` (installed, not set up: gate shows a setup link), `{ready:true}` (gate until signed in). `SyncContext` exposes `available`, `ready`, `checked`, `user`; the last user is cached in `d5wt:syncUserCache` so a signed-in browser still opens offline. A 401 during sync drops back to the sign-in screen.

## Troubleshooting the live domain (learned going live)

| Symptom | Cause / fix |
|---|---|
| `/api/setup.php` gives **404** but the file is in the folder | The address isn't reaching that folder: check hPanel → Domains → Subdomains points to `public_html/<sub>`, DNS A record for the subdomain if DNS is managed elsewhere, SSL issued, and purge CDN / Cache Manager. Test `https://<main-domain>/<sub>/api/setup.php` to separate file problems from address problems. |
| 500 | PHP below 8.1 (strict types, `never`) or `.htaccess` not allowed. |
| Setup says "Could not connect" | DB host must be `localhost`; check DB name/user (Hostinger prefixes them, e.g. `u123_`). |
| Setup returns 403 | Already set up (an owner exists): it locks itself. |
| Old version after a deploy | Hard refresh, then purge Hostinger CDN/cache. |

## Rules

- Never commit `config.php`, passwords, FTP details or the owner's data. The repo is public.
- Any write endpoint needs the `X-Requested-With: d5wt` header check and, for public review routes, rate limits.
