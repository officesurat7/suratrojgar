# Visitor analytics (privacy-friendly)

SuratRojgar counts visits itself. There is no Google Analytics, no advertising pixels and no tracking cookies.

## What is collected
For each page view: the path, the page type, the referring website's domain, a UTM source if present, device type (mobile, tablet or desktop), browser family, the logged-in user's ID (if any), and a **visitor code**. The visitor code is a SHA-256 hash of (app secret + today's date + IP + browser string). It changes every day and can't be turned back into an IP address. Raw IP addresses are not stored for analytics. City is not collected (that would need a licensed GeoIP database).

Not counted: search engine bots, and browsers sending "Do Not Track" or "Global Privacy Control". The whole feature can be switched off in Super Admin → Site settings → Features.

## How it flows
1. The page sends a small beacon to `POST /api/v1/analytics/track` (rate limited).
2. Events are buffered in Redis and written to MySQL in batches every minute (`sr:analytics-flush`). If Redis is down they're written directly.
3. Each night `sr:analytics-rollup` summarises the day into `analytics_daily`. Raw events are deleted after the retention period (180 days by default, `sr:retention`).

## Reports
Admin → Visitor analytics (permission `reports.view`): visitors, page views, top pages, sources, devices and browsers, for any date range, with CSV export (permission `reports.export`). Job views, applications, searches and contact reveals are on the Dashboard and Reports pages.
