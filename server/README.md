# D5 WebTool server (PHP + MySQL)

Small API used for sign-in, sync, team accounts and client review links. Runs on any PHP 8.1+ host with MySQL/MariaDB (built for Hostinger Business). Deployment and setup: [docs/HOSTINGER.md](../docs/HOSTINGER.md).

```
api/
  index.php           front controller (all /api/* requests, via .htaccess)
  setup.php           one-time installer: tables, config.php, owner account (locks itself)
  schema.sql          database schema (reference; setup.php runs it)
  config.example.php  shape of config.php (config.php itself is never committed or deployed)
  src/core.php        DB, HTTP helpers, auth tokens, rate limiting
  src/routes.php      endpoints: auth, users, sync, reviews (owner + public by token)
```

Security: bcrypt passwords; HttpOnly + Secure + SameSite=Lax cookie holding a random token (only its SHA-256 is stored); `X-Requested-With: d5wt` header required on writes (CSRF); rate limits on sign-in, PINs and public review posts; prepared statements; `.htaccess` blocks config, schema and `src/`.

Sync: items (`project`, `palette`, `session`, `settings`) carry the client's `updatedAt`; the server keeps the newest per item and hands out changes by a monotonic sequence number, so device clocks never need to agree.

## Local development

```bash
server/dev/start.sh                 # MariaDB + php -S serving dist/ and api/ on http://127.0.0.1:8080
# first time: open http://127.0.0.1:8080/api/setup.php (DB d5wt / user d5wt / password d5wt-local)
npm run dev                          # Vite on :5173, proxies /api to :8080
node server/dev/api-test.mjs         # API integration tests (needs a fresh, empty database)
```
