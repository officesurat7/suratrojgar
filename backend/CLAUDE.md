# SuratRojgar: notes for contributors and AI assistants

Read README.md and docs/ARCHITECTURE.md first.

- Surat-only job portal. Next.js 16 frontend (`frontend/`), Laravel 13 API (`backend/`), MySQL 8, Redis.
- Next.js 16: `params`/`searchParams` are Promises; `proxy.ts` replaces middleware. Check `frontend/node_modules/next/dist/docs/` before using an API you're unsure of.
- Browser code calls the API only through `lib/api.ts` (BFF proxy, httpOnly cookie). Never put a token or secret in client code or `NEXT_PUBLIC_*`.
- Public job data must go through `JobCardResource` (whitelist). Never add `contact_*` or `office_address` to it.
- Every admin route needs `type:` plus a `perm:` middleware. Log sensitive actions with `Audit::log`.
- Store times in UTC; display in IST with `lib/format.ts`.
- `preventLazyLoading` is on outside production: eager-load relations.
- Tests: `cd backend && php artisan test` (MySQL `suratrojgar_test`); `cd frontend && npx tsc --noEmit`.
- Never commit `.env` files, credentials or database dumps.
