# SuratRojgar website (Next.js 16)

See the [project README](../README.md) and [install guide](../docs/INSTALL.md).

```bash
npm ci && cp .env.example .env.local   # point API_INTERNAL_URL at the running API
npm run dev                            # http://localhost:3000
npx tsc --noEmit                       # type check
node scripts/smoke.mjs                 # browser smoke test (needs playwright)
```
