# Testing report

Last run: 22 November 2026, on the development copy (Laravel 13.43, PHP 8.3, MySQL 8, Next.js 16.4).

## Automated backend tests: 29 passed
`cd backend && php artisan test` (uses a separate `suratrojgar_test` MySQL database; CI runs the same on every push).

| Area | What is checked |
|---|---|
| Private employer contact | Public list, detail, similar jobs and sitemap never contain the phone, email or address. Guests are refused. Employers can't reveal other employers' contacts. Unverified seekers are refused. Verified seekers succeed and the view is logged, with `no-store` caching. "Hidden" and "applicants only" are respected. The daily limit is enforced. |
| Registration and login | Email OTP required before login. Wrong code fails. The OTP is burned after 5 wrong tries. Passwords are hashed. Weak passwords and missing consent are rejected. Lockout after 5 failures. Same message for unknown email and wrong password. Portals are separate. Super Admin needs a second factor. Suspended accounts can't log in. |
| Applications | Apply, duplicate blocked, other employers get 404, status history recorded, interview needs a date, seeker sees the status but not employer notes, withdraw. Expired or paused jobs can't be applied to. Employers can't view, edit or delete other employers' jobs. Seekers can't call employer, admin or super APIs. |
| Admin permissions | Staff reach only the sections they're granted. Export and resume access need their own permissions. Staff can't grant permissions they lack or create Admins. Resume views by others are audited. |
| Priority jobs | Duplicate numbers rejected, more than 30 rejected, expired jobs rejected. Order 1, 2 shows first publicly. Changes audited. A job that becomes inactive drops out. |
| Rate limits | Public API limited per IP (120/min). Server renders with the internal key are not. The key is ignored from non-local addresses. |
| CSV | Formula injection neutralised. |

Bugs these tests found and fixed: the contact endpoint didn't itself check email verification; every job save lazy-loaded its area; resume views weren't audited.

## Browser checks: 34 passed
`frontend/scripts/smoke.mjs` against a **production build** (`next build && next start`): 16 public pages at 1366 px and 390 px (no errors, no horizontal scroll), plus a job detail page at each width with a check that no private field names appear in the HTML. During development, every dashboard page (job seeker, employer, admin, staff and super admin) was also opened with Playwright at desktop and phone widths, and the key flows were clicked through: register, OTP, apply, shortlist, post a job, approve, slider and area changes, staff creation and the staff permission limits.

Type check (`tsc --noEmit`) passes. ESLint reports React-compiler advisories in some older components; they don't affect behaviour and are listed for cleanup.

## Not yet tested (needs the real server)
- **Load / concurrency:** k6 scripts are in `loadtest/` but haven't been run. No capacity figure is claimed. Run them on the Hostinger VPS (see SCALING.md) and record the results here.
- Real email delivery (SMTP) and spam-folder placement.
- HTTPS, Nginx and Supervisor config on the actual VPS.
- An independent security test (penetration test).
- Older and low-end phones and browsers beyond Chromium.
