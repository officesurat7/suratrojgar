#!/usr/bin/env bash
# Zero-downtime deploy. Run as the suratrojgar user on the server:
#   /var/www/suratrojgar/current/deploy/scripts/deploy.sh [git-ref]      (first time: run from a checkout)
# Each release goes into releases/<timestamp>; "current" is switched only after everything succeeds.
set -euo pipefail
APP=/var/www/suratrojgar
REPO="${REPO_URL:-git@github.com:YOUR-ACCOUNT/SuratRojgar.git}"
REF="${1:-main}"
STAMP=$(date +%Y%m%d%H%M%S)
REL="$APP/releases/$STAMP"

echo "==> Fetching $REF into $REL"
git clone --depth 1 --branch "$REF" "$REPO" "$REL"

echo "==> Backend"
cd "$REL/backend"
ln -sfn "$APP/shared/backend.env" .env
rm -rf storage && ln -sfn "$APP/shared/storage" storage
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
php artisan storage:link --force >/dev/null
php artisan down --retry=15 --refresh=15 || true     # only if a previous release is running
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan event:cache

echo "==> Frontend"
cd "$REL/frontend"
ln -sfn "$APP/shared/frontend.env" .env.production
npm ci --no-audit --no-fund
npm run build

echo "==> Switching release"
ln -sfn "$REL" "$APP/current.new" && mv -Tf "$APP/current.new" "$APP/current"
sudo /usr/bin/systemctl reload php8.3-fpm
sudo /usr/bin/supervisorctl restart suratrojgar-web
cd "$APP/current/backend"
php artisan queue:restart
php artisan up

echo "==> Keeping the last 5 releases"
ls -1dt "$APP"/releases/* | tail -n +6 | xargs -r rm -rf

echo "==> Health check"
sleep 3
curl -fsS -o /dev/null -w "API %{http_code}\n" http://127.0.0.1/api/v1/meta -H "Host: api.${DOMAIN:-suratrojgar.in}" || echo "WARNING: API health check failed"
curl -fsS -o /dev/null -w "Web %{http_code}\n" http://127.0.0.1:3000/ || echo "WARNING: website health check failed"
echo "Deployed $REF ($STAMP)"
