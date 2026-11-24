# Architecture

```
Browser ──HTTPS──> Nginx ──> Next.js server (:3200) ──┐
                     │        pages (SSR/ISR)          │ server-side reads: X-Internal-Key
                     │        /api/backend/* proxy ────┤ browser calls: Bearer token from httpOnly cookie
                     │        /api/auth/* login/logout │
                     └──> api.domain ──> PHP-FPM ──> Laravel API ──> MySQL 8
                                                        │            Redis (cache, queues, limits)
                                                        └─> queue workers (email, notifications)
                                                            scheduler (expiry, alerts, backups)
```

## Frontend (`frontend/src`)
- `app/(site)/` public pages with header and footer: home, jobs, search, SEO landing pages (`/jobs/in/[area]`, `/jobs/category/[slug]`, `/jobs/role/[slug]`, `/jobs/type/[type]`), job detail, company pages, auth pages, About, Contact, FAQ and policies.
- `app/(panel)/` dashboards (not indexed): `seeker/`, `employer/`, `admin/` (Admin and Admin Staff), `super-admin/`. `components/panel/Shell.tsx` draws the menu from the user's permissions and shows "no access" for sections they lack. The API enforces every rule again; the UI only hides what isn't allowed.
- `app/api/backend/[...path]` is a backend-for-frontend proxy. The login token lives in the `sr_session` httpOnly, SameSite=Lax cookie, so page JavaScript (and any injected script) can never read it. The proxy checks the request Origin (CSRF protection) and forwards the real client IP.
- `lib/api-server.ts` does cached server-side reads of public data for SEO pages (JobPosting schema, sitemap).
- Times are stored in UTC and shown in IST (`lib/format.ts`).

## Backend (`backend/app`)
- `Http/Controllers/Api/{Public,Auth,Seeker,Employer,Admin,Super}`: one folder per audience.
- Middleware: `EnsureUserType` (account type), `RequirePermission` (Admin Staff permissions), `CheckMaintenanceMode`, plus named rate limiters in `AppServiceProvider`.
- `Http/Resources/JobCardResource.php` is the only shape public job data leaves in. It is a whitelist, so new private columns can't leak by accident.
- Services: `JobSearch` (filters, FULLTEXT search, priority ordering, cache versioning), `FeaturedJobs` (priority 1–30), `ApplicationService` (10 statuses and history), `OtpService`, `ResumeStorage` (private disk, signed links), `Analytics`, `Audit`, `Settings`, `Housekeeping`.
- Roles and permissions: `roles`, `permissions`, `role_permissions` and per-user `user_permissions`. Permission names are listed in `Models/Permission.php`.

## Key flows
- **Registration:** form, then a 6-digit email code (hashed, expires, limited attempts and resends), then the account is activated and the user is signed in.
- **Admin login:** separate login pages per portal. Super Admin always gets a second factor (email code, or an authenticator app if enabled). Admins and staff get one when "Require two-step verification" is on.
- **Job posting:** employer saves a draft or submits. Approval follows the Super Admin setting (manual, automatic, or only for some business types). Jobs expire automatically, and the employer is reminded beforehand.
- **Featured jobs:** up to 30 jobs with unique numbers 1–30 are listed first, in that order, while they are active and inside their optional time window. Every change is audited.
- **Contact reveal:** `GET /jobs/{id}/contact` checks login, account type, verified email, the employer's visibility choice and a daily limit, then logs the view.

## Data model (main tables)
`users`, `user_roles`, `job_seeker_profiles`, `employer_profiles`, `admin_profiles`, `resumes`, `jobs`, `job_skills`, `job_questions`, `applications`, `application_status_history`, `saved_jobs`, `featured_jobs`, `employer_verifications`, `contact_access_logs`, `complaints`, `data_requests`, `audit_logs`, `login_history`, `email_otps`, `notifications`, `job_views`, `search_logs`, `visitor_analytics`, `analytics_daily`, `homepage_sliders`, `system_settings`, plus taxonomies (`localities`, `job_categories`, `job_roles`, `skills` (with `job_seeker_skills`), `education_levels`, `business_categories`).
