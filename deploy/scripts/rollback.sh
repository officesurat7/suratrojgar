#!/usr/bin/env bash
# Switch "current" back to the previous release. Database migrations are NOT reversed automatically:
# if the bad release changed the database, restore a backup (restore.sh) or run migrate:rollback deliberately.
set -euo pipefail
APP=/var/www/suratrojgar
CUR=$(readlink -f "$APP/current")
PREV=$(ls -1dt "$APP"/releases/* | grep -v "^$CUR$" | head -1)
[ -n "$PREV" ] || { echo "No previous release found"; exit 1; }
ln -sfn "$PREV" "$APP/current.new" && mv -Tf "$APP/current.new" "$APP/current"
sudo /usr/bin/systemctl reload php8.3-fpm
sudo /usr/bin/systemctl restart suratrojgar-web
cd "$APP/current/backend" && php artisan config:cache && php artisan route:cache && php artisan queue:restart
echo "Rolled back to $PREV"
