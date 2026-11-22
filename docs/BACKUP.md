# Backups and restore

## Automatic
`php artisan sr:backup` runs every day at the time set in Site settings (default 02:30 IST). It writes a compressed MySQL dump to `BACKUP_PATH` (`/var/backups/suratrojgar/suratrojgar-YYYYMMDD-HHMMSS.sql.gz`, readable only by the app user) and deletes dumps older than the retention period (14 days by default). Database credentials go through a temporary option file, never the command line.

Super Admin → Backups lists the files, shows when the last one ran, warns if there's been none for 26 hours, and has a **Back up now** button.

## Off-server copies (do this)
A backup on the same VPS is lost if the VPS is lost. Set up `deploy/scripts/backup-offsite.sh`:
1. As the `suratrojgar` user, run `rclone config` and create a remote called `offsite` (Backblaze B2, Google Drive, an S3 bucket and so on).
2. Uncomment the off-site line in `/etc/cron.d/suratrojgar`.
3. Check the next day that the file arrived.

Also enable Hostinger's weekly VPS snapshots in hPanel as an extra layer.

## Uploaded files
Logos and slider images (`storage/app/public`) and resumes (`storage/app/private`) are in `/var/www/suratrojgar/shared/storage`. Add that folder to the rclone copy (`rclone sync /var/www/suratrojgar/shared/storage offsite:suratrojgar-files`).

## Restore
```bash
sudo -u suratrojgar /var/www/suratrojgar/current/deploy/scripts/restore.sh /var/backups/suratrojgar/suratrojgar-20261122-023000.sql.gz
```
It asks you to type RESTORE, puts the site in maintenance mode, takes a safety backup of the current database, loads the file, clears the cache and brings the site back. Practise this on a test server once before you need it.
