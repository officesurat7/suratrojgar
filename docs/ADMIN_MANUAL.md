# Admin manual

Log in at `/admin/login` (Admin), `/staff/login` (Admin Staff) or `/super-admin/login` (Super Admin). The left menu shows only the sections your account may use.

## Daily routine
1. **Dashboard:** the alert chips show jobs waiting for approval, employers waiting for verification, open complaints and pending data requests. Click a chip to go straight to the list.
2. **Jobs → Pending approval:** open each job, check the title, salary, description and contact details, then **Approve** or **Reject** with a reason (the employer is emailed the reason). Watch for jobs asking candidates to pay, unrealistic salaries and missing company details.
3. **Employers → Pending:** check the business (GSTIN, website, phone call if needed). **Approve** sets the public name; **Reject** emails your notes.
4. **Complaints:** open each ticket, **Assign to me**, investigate, then mark it Resolved or Dismissed with a resolution. Tick "Email this resolution" to reply. Treat fraud reports (asking for money) first: pause the job and suspend the employer if confirmed.
5. **Data requests:** see "Privacy requests" below.

## Priority jobs (1–30)
Admin → **Priority jobs**. Add active jobs from the search box, then drag them or type a number to set the order. Number 1 shows first on the homepage and in listings. Each number can be used once, up to 30 jobs. You can set an optional start and end time. Expired, paused or closed jobs drop out automatically and can't be added. **Save** records the change in the history and the audit log.

## Candidates (area-wise database)
Filter by where people live or want to work, category, education, job type, experience, expected salary, skills, PIN code and more. **Export CSV** downloads the current filtered list (needs the export permission; every export is logged). Use exported data only for SuratRojgar's own recruitment purposes, and don't share it outside.

## Accounts
On an employer or candidate page, **Change account status**: Suspended (temporary) or Blocked (permanent), always with a reason. The person is signed out and emailed. Reactivate the same way.

## Homepage slider, categories and areas
- **Homepage slider:** add slides with a title, button and link (like `/jobs/type/fresher`), a colour theme or image, and optional show-from/until dates. Use the arrows and **Save order**.
- **Categories & areas:** add or rename job categories, roles, Surat areas (with PIN code), skills, education levels and business types. Deactivate instead of deleting anything in use. Renaming changes the page address, so do it rarely for areas and categories.

## Staff
Admin → **Staff & admins** → **Add account**. Tick only what the person needs. They get an email code to set their own password; you never see or send a password. **Reset password & 2FA** signs them out everywhere and sends a new code. **Suspend** when someone leaves.

## Privacy requests (DPDP Act)
Admin → **Data requests**. For a **correction**, fix the data (or ask the person to), then **Mark completed** with a reply. For a **deletion**, **Erase & complete** permanently anonymises the account. This can't be undone, so check you have the right person. **Reject** only with a clear legal reason, explained in the reply. Respond within the time your Privacy Policy promises.

## Super Admin only
- **Site settings:** job approval mode, job duration, OTP and login limits, two-step verification for admins, contact-view limit, retention periods, backups, features, maintenance mode, test email.
- **System & security logs:** login attempts (failed ones by IP), heaviest employer-contact viewers, and the application error log.
- **Backups:** status and **Back up now**. See BACKUP.md.
- **Admins:** only the Super Admin can create or remove Admin accounts.
- If the Super Admin loses access: on the server, `cd /var/www/suratrojgar/current/backend && php artisan sr:create-super-admin --email=…` resets it.
