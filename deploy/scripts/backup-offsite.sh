#!/usr/bin/env bash
# Copy backups to storage outside this server (a backup on the same VPS does not survive losing the VPS).
# Uses rclone. One-time: `rclone config` as the suratrojgar user and create a remote named "offsite"
# (for example Backblaze B2, Google Drive or an S3 bucket). Keep that remote's credentials only on the server.
set -euo pipefail
SRC=/var/backups/suratrojgar
DEST="${OFFSITE_REMOTE:-offsite:suratrojgar-backups}"
rclone copy "$SRC" "$DEST" --include "*.sql.gz" --max-age 48h
rclone delete "$DEST" --min-age 30d --include "*.sql.gz"
echo "$(date -Is) offsite copy done"
