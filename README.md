# SuratRojgar

A job portal for **Surat city only**: job seekers find local jobs by area, employers post jobs, and admins run the site.

| Part | Technology | Folder |
|---|---|---|
| Website | Next.js 16, React 19, TypeScript, Tailwind CSS 4 (server-rendered for SEO) | `frontend/` |
| API | Laravel 13 on PHP 8.3, Sanctum tokens | `backend/` |
| Data | MySQL 8 (main data), Redis 7 (cache, queues, rate limits) | |
| Server | Hostinger VPS (Ubuntu 24.04), Nginx, PHP-FPM, Supervisor | `deploy/` |

## User types
Job Seeker · Employer · Admin Staff (only the permissions they're given) · Admin · Super Admin (always uses a second login factor).

## Start here
- **Run it on your computer:** [docs/INSTALL.md](docs/INSTALL.md#local-development)
- **Put it on Hostinger:** [docs/INSTALL.md](docs/INSTALL.md#production-on-a-hostinger-vps)
- **Settings and secrets:** [docs/ENV.md](docs/ENV.md)
- **How it fits together:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/API.md](docs/API.md)
- **Running the site day to day:** [docs/ADMIN_MANUAL.md](docs/ADMIN_MANUAL.md)
- **Security, privacy and analytics:** [docs/SECURITY.md](docs/SECURITY.md) · [docs/ANALYTICS.md](docs/ANALYTICS.md)
- **Backups:** [docs/BACKUP.md](docs/BACKUP.md)
- **Tests and load testing:** [docs/TESTING.md](docs/TESTING.md) · [docs/SCALING.md](docs/SCALING.md)

## Before going live (not done by the code)
1. Have a lawyer review the Privacy Policy, Terms, Refund, Cookie and Grievance pages (they are marked as drafts on the site).
2. Run the k6 load tests against your actual VPS and record the results. No capacity figure is claimed until then.
3. Configure real SMTP, set the Grievance Officer's name and email in Super Admin → Site settings, and set up off-server backups.
4. Get an independent security test (penetration test). No website can be guaranteed unhackable; the measures in SECURITY.md reduce risk.

Never commit `.env` files, passwords, private keys or database dumps. `.gitignore` excludes them.
