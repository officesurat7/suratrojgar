# Security

No website can be made impossible to hack. These measures reduce the risk and limit the damage if something goes wrong. Before launch, get an independent penetration test and fix what it finds.

## Accounts and login
- Passwords are hashed with bcrypt (12 rounds). Rules: 8–72 characters with letters and numbers (Admins: set stronger ones; the Super Admin CLI requires 12+ with symbols and mixed case).
- Email ownership is proven with a 6-digit one-time code. Codes are stored hashed, expire (10 minutes by default), allow 5 wrong tries, then are burned. Resends are limited per minute and per hour.
- Login failures lock the email and IP for 15 minutes after 5 attempts. "Wrong email" and "wrong password" give the same message, and the timing is kept similar, so attackers can't find out which emails are registered. Registration with an existing email shows the same result as a new one.
- Separate login pages for users, staff, admins and the Super Admin. An account can only log in through its own portal.
- The Super Admin always needs a second factor (an email code, or an authenticator app). Admins and staff need one when "Require two-step verification" is on in Site settings. Admin logins last 12 hours, user logins 7 days. "Log out of all devices" revokes every token.
- Suspending or blocking an account signs it out immediately.

## Sessions, browser and CSRF
- The API token is kept in an `httpOnly`, `Secure`, `SameSite=Lax` cookie by the Next.js server. Page JavaScript cannot read it, so a script injection can't steal logins.
- Every state-changing call through the website proxy must come from the site's own origin (CSRF check).
- Security headers: Content-Security-Policy, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy and Permissions-Policy.
- Job descriptions and other text are shown as plain text (React escapes it). No user HTML is rendered.

## Access control
- The API checks account type and permission on every route (see API.md). The UI hiding a button is never the only protection.
- Employers can only see and change their own jobs and the applications to them. Other employers' records return 404.
- Admin Staff get only the permissions ticked for them. Admins can't grant what they don't have, and nobody can change their own permissions.

## Private data
- Employer phone, email and street address are excluded from every public response by a whitelist (`JobCardResource`). They're revealed only through one endpoint, to logged-in verified job seekers (or admins), subject to the employer's visibility choice and a daily limit. Each reveal is logged in `contact_access_logs`, and Super Admin → Security logs shows the heaviest viewers.
- Resumes are stored on a private disk (not web-accessible), checked by real file type (PDF/DOCX only), optionally virus-scanned with ClamAV, and opened only through short-lived signed links. Each access is logged.
- CSV exports need the `reports.export` permission, are audited, and neutralise spreadsheet formulas (`=`, `+`, `-`, `@`).

## Abuse limits
Nginx limits connection and request rates per IP. Laravel adds named limits per IP or user: public reads 120/min, login 10/min, registration 5/min, OTP 10/min, applications 10/min, contact reveals 10/min plus a daily cap, forms 3/min, uploads. Server-side page renders authenticate with `INTERNAL_API_KEY` so they don't share one visitor's limit. The contact form has a hidden honeypot field.

## Server
- Only ports 22, 80 and 443 are open (ufw). MySQL and Redis listen on localhost; Redis has a password.
- PHP runs as its own user. Dotfiles and stray `.php` files are never served. `APP_DEBUG=false` in production.
- Secrets live only in env files on the server (mode 640), never in the repository or admin screens. The admin "Server configuration" panel shows masked values only.
- Keep Ubuntu updated (`unattended-upgrades`), use SSH keys and disable password SSH login, and keep fail2ban on.

## Audit trail
`audit_logs` records admin actions (approvals, status changes, permission changes, exports, settings, featured job changes, data requests) with before and after values, the user, the IP and the time. `login_history` records every login attempt.

## Reporting a vulnerability
Email the support address in Site settings. Do not test the live site without written permission.
