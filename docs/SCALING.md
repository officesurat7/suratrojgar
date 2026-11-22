# Scaling plan

**Nothing here is a measured capacity.** Measure your own server with `loadtest/browse.js` and update this page.

## Two different "200,000"
- **200,000 registered users:** a few GB of MySQL data. The schema has indexes for every listing and filter, so a single VPS handles this comfortably.
- **200,000 people online at the same moment:** a very large load (likely thousands of requests per second at peak). That is beyond any single VPS. The design lets you grow in steps when measurements show it's needed.

## What already helps
- Public pages are server-rendered with caching (ISR): the homepage, listings and job pages are rebuilt at most every 30–300 seconds, not per visitor.
- API search results are cached in Redis with a version key that changes when jobs change.
- Analytics are buffered in Redis and written in batches. Emails go through queues.
- Static assets are cached for a year. OPcache and JIT are on.

## How to measure
1. Make a staging copy of the server (Hostinger lets you snapshot and restore to another VPS).
2. From your own computer: `k6 run -e BASE=… -e API=… -e TARGET=200 browse.js`, then 500, 1000, 2000…
3. The highest TARGET that passes the thresholds (under 1% errors, page p95 under 1.5 s, API p95 under 0.5 s) is your current capacity. Watch `htop` and `mysqladmin processlist` to see what runs out first.

## Steps when you need more
1. **Bigger VPS** (KVM 4 → KVM 8). Raise `pm.max_children`, `innodb_buffer_pool_size` and Redis memory to match.
2. **CDN in front** (for example Cloudflare, free plan): caches pages and assets close to users and absorbs bot and DDoS traffic.
3. **Split the database** onto its own VPS, then add a read replica (`DB_READ_HOST` is already supported).
4. **Multiple web servers** behind a load balancer. The app is stateless: logins are tokens, cache and queues are in Redis, and uploads go to a shared or S3-compatible disk. Run the scheduler on only one server (it already uses `onOneServer`).
5. **Search:** if MySQL FULLTEXT becomes the bottleneck, move job search to Meilisearch or OpenSearch.
