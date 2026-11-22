# Load tests (k6)

These scripts measure how many visitors the server handles. **No capacity number is claimed until these have been run against the real Hostinger server and the results written into `docs/TESTING.md`.**

1. Install k6 on your own computer (not on the server): https://grafana.com/docs/k6/latest/set-up/install-k6/
2. Run against a **staging copy** first, never the live site during business hours.
3. Increase `TARGET` step by step (200, 500, 1000, 2000…) and stop when a threshold fails. Note the last passing level.

```bash
k6 run -e BASE=https://staging.suratrojgar.in -e API=https://api-staging.suratrojgar.in -e TARGET=500 browse.js
```

## What "200,000 users" means

200,000 *registered* users is mostly a database-size question and is fine for MySQL on one VPS. 200,000 people *online at the same moment* is a very different load (thousands of requests per second) and needs to be measured. A single VPS will hit a limit somewhere; `docs/SCALING.md` explains what to add when it does. Use these tests to find that limit on your actual plan.
