#!/usr/bin/env bash
# Restore a database backup made by `php artisan sr:backup`.
#   restore.sh /var/backups/suratrojgar/suratrojgar-20261122-023000.sql.gz
# The site is put in maintenance mode, a safety backup of the CURRENT database is taken first, then the file is loaded.
set -euo pipefail
FILE="${1:?usage: restore.sh <backup.sql.gz>}"
[ -f "$FILE" ] || { echo "File not found: $FILE"; exit 1; }
cd /var/www/suratrojgar/current/backend
read -r -p "This REPLACES the live database with $FILE. Type RESTORE to continue: " ok
[ "$ok" = "RESTORE" ] || { echo "Cancelled."; exit 1; }

php artisan down --retry=60
echo "==> Safety backup of the current database"
php artisan sr:backup

DB=$(php -r 'require "vendor/autoload.php"; $a=require "bootstrap/app.php"; $a->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap(); $c=config("database.connections.mysql"); echo json_encode($c);')
CNF=$(mktemp); chmod 600 "$CNF"
php -r '$c=json_decode($argv[1],true); printf("[client]\nuser=\"%s\"\npassword=\"%s\"\nhost=\"%s\"\nport=\"%s\"\n",$c["username"],$c["password"],$c["host"],$c["port"]);' "$DB" > "$CNF"
NAME=$(php -r 'echo json_decode($argv[1],true)["database"];' "$DB")

echo "==> Restoring into $NAME"
gunzip -c "$FILE" | mysql --defaults-extra-file="$CNF" "$NAME"
rm -f "$CNF"
php artisan cache:clear
php artisan up
echo "Restore complete. Check the site, then the admin dashboard."
