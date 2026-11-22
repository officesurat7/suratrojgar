# Environment settings

Secrets live only in env files on the server (`/var/www/suratrojgar/shared/*.env`, mode 640). They are never committed and never shown in the admin panel. Operational settings that admins may change (approval mode, OTP limits, retention, maintenance mode) are in **Super Admin → Site settings** instead.

## Backend (`backend.env`)
| Key | What it is | Production value |
|---|---|---|
| `APP_ENV` / `APP_DEBUG` | Environment / debug pages | `production` / `false` (debug on in production exposes internals) |
| `APP_KEY` | Encryption key | `php artisan key:generate`. Changing it logs everyone out and breaks signed links |
| `APP_URL` | Public API URL | `https://api.suratrojgar.in` |
| `FRONTEND_URL` | Website URL (links in emails, CORS) | `https://suratrojgar.in` |
| `APP_TIMEZONE` / `DISPLAY_TIMEZONE` | Storage / display time zone | `UTC` / `Asia/Kolkata` |
| `TRUSTED_PROXIES` | Who may set X-Forwarded-For | `127.0.0.1` |
| `INTERNAL_API_KEY` | Shared secret with the website server for server-side page renders | `openssl rand -hex 32`, same value in frontend |
| `DB_*` | MySQL connection | user with rights on the `suratrojgar` database only |
| `DB_READ_HOST` | Optional read replica | empty unless you add one |
| `REDIS_PASSWORD` | Redis `requirepass` | long random value |
| `CACHE_STORE` / `QUEUE_CONNECTION` / `SESSION_DRIVER` | | `redis` |
| `MAIL_*` | SMTP for OTPs and notifications | Hostinger mail: `smtp.hostinger.com`, port 465, the mailbox's address and password |
| `TOKEN_TTL_USER` / `TOKEN_TTL_ADMIN` | Login lifetime in minutes | `10080` (7 days) / `720` (12 hours) |
| `CLAMAV_SOCKET` | Virus scan for resumes | `/var/run/clamav/clamd.ctl` if ClamAV is installed |
| `BACKUP_PATH` / `BACKUP_RETENTION_DAYS` | Where backups go | `/var/backups/suratrojgar` / `14` |
| `LOG_LEVEL` | | `warning` |

## Frontend (`frontend.env`, linked as `.env.production`)
| Key | What it is | Production value |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical URL, sitemap, Open Graph | `https://suratrojgar.in` |
| `NEXT_PUBLIC_API_ORIGIN` | Public API origin (logos, slider images) | `https://api.suratrojgar.in` |
| `API_INTERNAL_URL` | How the website server reaches the API | `https://api.suratrojgar.in/api/v1`, with `127.0.0.1 api.suratrojgar.in` in `/etc/hosts` (INSTALL step 5) |
| `INTERNAL_API_KEY` | Same as backend | |
| `COOKIE_SECURE` | Login cookie only over HTTPS | `true` |
| `ALLOW_INDEXING` | Let search engines index the site (read at build time) | `true` on the live domain only |

`NEXT_PUBLIC_*` values are built into browser code, so never put a secret in one.
