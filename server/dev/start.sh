#!/usr/bin/env bash
# Local full-stack run: MariaDB + PHP built-in server serving the built app and the API.
# Usage: server/dev/start.sh   (then open http://127.0.0.1:8080 and visit /api/setup.php once)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SITE="${SITE:-/tmp/d5wt-site}"
service mariadb start >/dev/null 2>&1 || (mysqld_safe >/dev/null 2>&1 &)
for i in $(seq 1 30); do mysqladmin ping >/dev/null 2>&1 && break; sleep 1; done
mysql -e "CREATE DATABASE IF NOT EXISTS d5wt CHARACTER SET utf8mb4; CREATE USER IF NOT EXISTS 'd5wt'@'localhost' IDENTIFIED BY 'd5wt-local'; GRANT ALL ON d5wt.* TO 'd5wt'@'localhost'; FLUSH PRIVILEGES;"
(cd "$ROOT" && npm run build >/dev/null)
mkdir -p "$SITE"
cp -r "$ROOT/dist/." "$SITE/"
mkdir -p "$SITE/api" && cp -r "$ROOT/server/api/." "$SITE/api/"
echo "Serving $SITE on http://127.0.0.1:8080  (DB d5wt / user d5wt / password d5wt-local)"
exec php -S 127.0.0.1:8080 -t "$SITE" "$ROOT/server/dev/router.php"
