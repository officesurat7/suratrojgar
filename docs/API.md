# API reference

Base URL: `https://api.suratrojgar.in/api/v1` (local: `http://127.0.0.1:8000/api/v1`). All responses are JSON. Generated from `php artisan route:list` on 22 Nov 2026: 132 endpoints.

**Authentication.** Logged-in calls send `Authorization: Bearer <token>`. In the website the token never reaches browser JavaScript: the Next.js server keeps it in an httpOnly cookie and forwards calls through `/api/backend/*` (see ARCHITECTURE.md).

**Errors.** `401` not logged in, `403` wrong account type or missing permission (some include a `code` such as `email_unverified`), `404` not found or not yours, `422` validation (`errors` object per field), `429` rate limited, `503` maintenance mode.

**Columns.** *Login*: token required. *Account type*: which user types may call it. *Permission*: Admin Staff permission needed (Admins hold all admin permissions; Super Admin holds everything). *Rate limit*: named limiter in `AppServiceProvider`.

**Private data.** Public job endpoints use `JobCardResource`, a whitelist that never includes `contact_*` or `office_address`. Those fields are returned only by `GET /jobs/{id}/contact` (logged, rate limited, verified job seekers only) and to the owning employer and admins.

## Public and shared

| Method | Path | Login | Account type | Permission | Rate limit |
|---|---|---|---|---|---|
| POST | `/api/v1/account/data-requests` | Yes | job_seeker, employer | – | user |
| GET | `/api/v1/account/data-requests` | Yes | job_seeker, employer | – | user |
| POST | `/api/v1/account/deactivate` | Yes | job_seeker, employer | – | user |
| POST | `/api/v1/analytics/track` | No | – | – | beacon |
| GET | `/api/v1/companies/{slug}` | No | – | – | public |
| POST | `/api/v1/complaints` | Optional | – | – | forms |
| GET | `/api/v1/files/resumes/{resume}` | Signed, expiring link only | – | – | public |
| GET | `/api/v1/jobs` | No | – | – | public |
| GET | `/api/v1/jobs/{id}` | No | – | – | public |
| GET | `/api/v1/jobs/{id}/contact` | Yes | job seeker (verified) or admin | – | user, contact |
| GET | `/api/v1/jobs/{id}/similar` | No | – | – | public |
| POST | `/api/v1/jobs/{id}/view` | No | – | – | beacon |
| GET | `/api/v1/meta` | No | – | – | public |
| GET | `/api/v1/notifications` | Yes | – | – | user |
| POST | `/api/v1/notifications/read-all` | Yes | – | – | user |
| GET | `/api/v1/notifications/unread-count` | Yes | – | – | user |
| POST | `/api/v1/notifications/{id}/read` | Yes | – | – | user |
| GET | `/api/v1/seo/sitemap` | No | – | – | public |
| GET | `/api/v1/sliders` | No | – | – | public |

## Auth

| Method | Path | Login | Account type | Permission | Rate limit |
|---|---|---|---|---|---|
| POST | `/api/v1/auth/2fa/disable` | Yes | admin_staff, admin, super_admin | – | otp |
| POST | `/api/v1/auth/2fa/enable` | Yes | admin_staff, admin, super_admin | – | otp |
| POST | `/api/v1/auth/2fa/setup` | Yes | admin_staff, admin, super_admin | – | – |
| POST | `/api/v1/auth/2fa/verify` | No | – | – | otp |
| POST | `/api/v1/auth/change-password` | Yes | – | – | otp |
| POST | `/api/v1/auth/forgot-password` | No | – | – | otp |
| POST | `/api/v1/auth/login` | No | – | – | login |
| POST | `/api/v1/auth/logout` | Yes | – | – | – |
| POST | `/api/v1/auth/logout-all` | Yes | – | – | – |
| GET | `/api/v1/auth/me` | Yes | – | – | – |
| PUT | `/api/v1/auth/notification-preferences` | Yes | – | – | – |
| POST | `/api/v1/auth/register/employer` | No | – | – | register |
| POST | `/api/v1/auth/register/job-seeker` | No | – | – | register |
| POST | `/api/v1/auth/resend-otp` | No | – | – | otp |
| POST | `/api/v1/auth/reset-password` | No | – | – | otp |
| POST | `/api/v1/auth/verify-email` | No | – | – | otp |

## Job seeker

| Method | Path | Login | Account type | Permission | Rate limit |
|---|---|---|---|---|---|
| GET | `/api/v1/seeker/applications` | Yes | job_seeker | – | user |
| GET | `/api/v1/seeker/applications/{id}` | Yes | job_seeker | – | user |
| POST | `/api/v1/seeker/applications/{id}/withdraw` | Yes | job_seeker | – | user |
| GET | `/api/v1/seeker/dashboard` | Yes | job_seeker | – | user |
| POST | `/api/v1/seeker/job-states` | Yes | job_seeker | – | user |
| POST | `/api/v1/seeker/jobs/{jobId}/apply` | Yes | job_seeker | – | user |
| GET | `/api/v1/seeker/profile` | Yes | job_seeker | – | user |
| PUT | `/api/v1/seeker/profile` | Yes | job_seeker | – | user |
| GET | `/api/v1/seeker/recently-viewed` | Yes | job_seeker | – | user |
| GET | `/api/v1/seeker/resumes` | Yes | job_seeker | – | user |
| POST | `/api/v1/seeker/resumes` | Yes | job_seeker | – | user |
| DELETE | `/api/v1/seeker/resumes/{id}` | Yes | job_seeker | – | user |
| POST | `/api/v1/seeker/resumes/{id}/default` | Yes | job_seeker | – | user |
| GET | `/api/v1/seeker/resumes/{id}/download` | Yes | job_seeker | – | user |
| GET | `/api/v1/seeker/saved-jobs` | Yes | job_seeker | – | user |
| POST | `/api/v1/seeker/saved-jobs/{jobId}` | Yes | job_seeker | – | user |
| DELETE | `/api/v1/seeker/saved-jobs/{jobId}` | Yes | job_seeker | – | user |

## Employer

| Method | Path | Login | Account type | Permission | Rate limit |
|---|---|---|---|---|---|
| GET | `/api/v1/employer/applications` | Yes | employer | – | user |
| POST | `/api/v1/employer/applications/bulk` | Yes | employer | – | user |
| GET | `/api/v1/employer/applications/export` | Yes | employer | – | user |
| GET | `/api/v1/employer/applications/{id}` | Yes | employer | – | user |
| PUT | `/api/v1/employer/applications/{id}/notes` | Yes | employer | – | user |
| GET | `/api/v1/employer/applications/{id}/resume` | Yes | employer | – | user |
| PUT | `/api/v1/employer/applications/{id}/status` | Yes | employer | – | user |
| GET | `/api/v1/employer/dashboard` | Yes | employer | – | user |
| GET | `/api/v1/employer/jobs` | Yes | employer | – | user |
| POST | `/api/v1/employer/jobs` | Yes | employer | – | user |
| GET | `/api/v1/employer/jobs/{id}` | Yes | employer | – | user |
| PUT | `/api/v1/employer/jobs/{id}` | Yes | employer | – | user |
| DELETE | `/api/v1/employer/jobs/{id}` | Yes | employer | – | user |
| POST | `/api/v1/employer/jobs/{id}/extend` | Yes | employer | – | user |
| GET | `/api/v1/employer/jobs/{id}/performance` | Yes | employer | – | user |
| POST | `/api/v1/employer/jobs/{id}/{action}` | Yes | employer | – | user |
| GET | `/api/v1/employer/profile` | Yes | employer | – | user |
| POST | `/api/v1/employer/profile` | Yes | employer | – | user |

## Admin

| Method | Path | Login | Account type | Permission | Rate limit |
|---|---|---|---|---|---|
| GET | `/api/v1/admin/applications` | Yes | admin_staff, admin, super_admin | applications.view | admin |
| GET | `/api/v1/admin/applications/{id}` | Yes | admin_staff, admin, super_admin | applications.view | admin |
| PUT | `/api/v1/admin/applications/{id}/status` | Yes | admin_staff, admin, super_admin | applications.manage | admin |
| GET | `/api/v1/admin/audit-logs` | Yes | admin_staff, admin, super_admin | audit.view | admin |
| GET | `/api/v1/admin/candidates` | Yes | admin_staff, admin, super_admin | job_seekers.view | admin |
| GET | `/api/v1/admin/candidates/export` | Yes | admin_staff, admin, super_admin | job_seekers.view | admin |
| GET | `/api/v1/admin/candidates/{id}` | Yes | admin_staff, admin, super_admin | job_seekers.view | admin |
| GET | `/api/v1/admin/candidates/{id}/resumes/{resumeId}` | Yes | admin_staff, admin, super_admin | job_seekers.view | admin |
| PUT | `/api/v1/admin/candidates/{id}/status` | Yes | admin_staff, admin, super_admin | job_seekers.view | admin |
| GET | `/api/v1/admin/complaints` | Yes | admin_staff, admin, super_admin | complaints.manage | admin |
| PUT | `/api/v1/admin/complaints/{id}` | Yes | admin_staff, admin, super_admin | complaints.manage | admin |
| GET | `/api/v1/admin/dashboard/charts` | Yes | admin_staff, admin, super_admin | stats.view or reports.view | admin |
| GET | `/api/v1/admin/dashboard/stats` | Yes | admin_staff, admin, super_admin | stats.view | admin |
| GET | `/api/v1/admin/data-requests` | Yes | admin_staff, admin, super_admin | data_requests.manage | admin |
| POST | `/api/v1/admin/data-requests/{id}` | Yes | admin_staff, admin, super_admin | data_requests.manage | admin |
| GET | `/api/v1/admin/employers` | Yes | admin_staff, admin, super_admin | employers.view | admin |
| GET | `/api/v1/admin/employers/{id}` | Yes | admin_staff, admin, super_admin | employers.view | admin |
| PUT | `/api/v1/admin/employers/{id}/status` | Yes | admin_staff, admin, super_admin | employers.view | admin |
| POST | `/api/v1/admin/employers/{id}/verify` | Yes | admin_staff, admin, super_admin | employers.view | admin |
| GET | `/api/v1/admin/featured` | Yes | admin_staff, admin, super_admin | jobs.feature | admin |
| PUT | `/api/v1/admin/featured` | Yes | admin_staff, admin, super_admin | jobs.feature | admin |
| GET | `/api/v1/admin/featured/candidates` | Yes | admin_staff, admin, super_admin | jobs.feature | admin |
| GET | `/api/v1/admin/featured/history` | Yes | admin_staff, admin, super_admin | jobs.feature | admin |
| DELETE | `/api/v1/admin/featured/{jobId}` | Yes | admin_staff, admin, super_admin | jobs.feature | admin |
| GET | `/api/v1/admin/jobs` | Yes | admin_staff, admin, super_admin | jobs.view or jobs.approve or jobs.manage | admin |
| POST | `/api/v1/admin/jobs` | Yes | admin_staff, admin, super_admin | jobs.manage | admin |
| GET | `/api/v1/admin/jobs/{id}` | Yes | admin_staff, admin, super_admin | jobs.view or jobs.approve or jobs.manage | admin |
| PUT | `/api/v1/admin/jobs/{id}` | Yes | admin_staff, admin, super_admin | jobs.manage | admin |
| DELETE | `/api/v1/admin/jobs/{id}` | Yes | admin_staff, admin, super_admin | jobs.manage | admin |
| POST | `/api/v1/admin/jobs/{id}/allow-reapply` | Yes | admin_staff, admin, super_admin | jobs.manage | admin |
| POST | `/api/v1/admin/jobs/{id}/approve` | Yes | admin_staff, admin, super_admin | jobs.approve | admin |
| POST | `/api/v1/admin/jobs/{id}/employer` | Yes | admin_staff, admin, super_admin | jobs.manage | admin |
| POST | `/api/v1/admin/jobs/{id}/expiry` | Yes | admin_staff, admin, super_admin | jobs.manage | admin |
| POST | `/api/v1/admin/jobs/{id}/reject` | Yes | admin_staff, admin, super_admin | jobs.approve | admin |
| POST | `/api/v1/admin/jobs/{id}/restore` | Yes | admin_staff, admin, super_admin | jobs.manage | admin |
| POST | `/api/v1/admin/jobs/{id}/{action}` | Yes | admin_staff, admin, super_admin | jobs.manage | admin |
| GET | `/api/v1/admin/reports/applications` | Yes | admin_staff, admin, super_admin | reports.view | admin |
| GET | `/api/v1/admin/reports/export` | Yes | admin_staff, admin, super_admin | reports.export | admin |
| GET | `/api/v1/admin/reports/visitors` | Yes | admin_staff, admin, super_admin | reports.view | admin |
| GET | `/api/v1/admin/sliders` | Yes | admin_staff, admin, super_admin | sliders.manage | admin |
| POST | `/api/v1/admin/sliders` | Yes | admin_staff, admin, super_admin | sliders.manage | admin |
| POST | `/api/v1/admin/sliders/reorder` | Yes | admin_staff, admin, super_admin | sliders.manage | admin |
| POST | `/api/v1/admin/sliders/{id}` | Yes | admin_staff, admin, super_admin | sliders.manage | admin |
| DELETE | `/api/v1/admin/sliders/{id}` | Yes | admin_staff, admin, super_admin | sliders.manage | admin |
| GET | `/api/v1/admin/staff` | Yes | admin_staff, admin, super_admin | staff.manage or admins.manage | admin |
| POST | `/api/v1/admin/staff` | Yes | admin_staff, admin, super_admin | staff.manage or admins.manage | admin |
| GET | `/api/v1/admin/staff/permissions` | Yes | admin_staff, admin, super_admin | staff.manage or admins.manage | admin |
| PUT | `/api/v1/admin/staff/{id}` | Yes | admin_staff, admin, super_admin | staff.manage or admins.manage | admin |
| POST | `/api/v1/admin/staff/{id}/reset` | Yes | admin_staff, admin, super_admin | staff.manage or admins.manage | admin |
| PUT | `/api/v1/admin/staff/{id}/status` | Yes | admin_staff, admin, super_admin | staff.manage or admins.manage | admin |
| GET | `/api/v1/admin/taxonomy/{type}` | Yes | admin_staff, admin, super_admin | categories.manage | admin |
| POST | `/api/v1/admin/taxonomy/{type}` | Yes | admin_staff, admin, super_admin | categories.manage | admin |
| PUT | `/api/v1/admin/taxonomy/{type}/{id}` | Yes | admin_staff, admin, super_admin | categories.manage | admin |
| DELETE | `/api/v1/admin/taxonomy/{type}/{id}` | Yes | admin_staff, admin, super_admin | categories.manage | admin |

## Super Admin

| Method | Path | Login | Account type | Permission | Rate limit |
|---|---|---|---|---|---|
| GET | `/api/v1/super/backups` | Yes | super_admin | – | admin |
| POST | `/api/v1/super/backups` | Yes | super_admin | – | admin |
| GET | `/api/v1/super/logs/security` | Yes | super_admin | – | admin |
| GET | `/api/v1/super/logs/system` | Yes | super_admin | – | admin |
| POST | `/api/v1/super/maintenance` | Yes | super_admin | – | admin |
| GET | `/api/v1/super/settings` | Yes | super_admin | – | admin |
| PUT | `/api/v1/super/settings` | Yes | super_admin | – | admin |
| POST | `/api/v1/super/test-email` | Yes | super_admin | – | admin |
