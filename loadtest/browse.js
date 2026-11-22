// k6 load test: anonymous visitors browsing jobs (the most common traffic).
// Run from a machine OUTSIDE the server, against a staging copy first:
//   k6 run -e BASE=https://staging.suratrojgar.in -e API=https://api-staging.suratrojgar.in browse.js
// Profile: ramps to TARGET virtual users (default 500). Each VU behaves like a person: opens a page, reads, moves on.
import http from "k6/http";
import { check, group, sleep } from "k6";
import { Trend } from "k6/metrics";

const BASE = __ENV.BASE || "http://127.0.0.1:3000";
const API = __ENV.API || "http://127.0.0.1:8000";
const TARGET = Number(__ENV.TARGET || 500);
const apiLatency = new Trend("api_latency", true);

export const options = {
  scenarios: {
    visitors: {
      executor: "ramping-vus",
      stages: [
        { duration: "2m", target: Math.round(TARGET * 0.2) },
        { duration: "5m", target: TARGET },
        { duration: "10m", target: TARGET },
        { duration: "2m", target: 0 },
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],              // fewer than 1% errors
    "http_req_duration{kind:page}": ["p(95)<1500"],
    "http_req_duration{kind:api}": ["p(95)<500"],
  },
};

const AREAS = ["adajan", "vesu", "varachha", "katargam", "udhna", "pal", "piplod", "athwa"];
const KEYWORDS = ["textile", "diamond", "accountant", "driver", "sales", "telecaller", "helper", "operator"];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export default function () {
  group("home", () => {
    const r = http.get(`${BASE}/`, { tags: { kind: "page" } });
    check(r, { "home 200": (x) => x.status === 200 });
  });
  sleep(2 + Math.random() * 3);

  let jobs = [];
  group("search", () => {
    const r = http.get(`${API}/api/v1/jobs?q=${pick(KEYWORDS)}&per_page=20`, { tags: { kind: "api" } });
    apiLatency.add(r.timings.duration);
    check(r, { "search 200": (x) => x.status === 200 });
    try { jobs = r.json("data") || []; } catch { jobs = []; }
  });
  sleep(1 + Math.random() * 2);

  group("area page", () => {
    const r = http.get(`${BASE}/jobs/in/${pick(AREAS)}`, { tags: { kind: "page" } });
    check(r, { "area 200/404": (x) => x.status === 200 || x.status === 404 });
  });
  sleep(2 + Math.random() * 3);

  if (jobs.length) {
    group("job detail", () => {
      const j = pick(jobs);
      const r = http.get(`${BASE}${j.url}`, { tags: { kind: "page" } });
      check(r, { "detail 200": (x) => x.status === 200, "no private data": (x) => !String(x.body).includes("office_address") });
    });
    sleep(3 + Math.random() * 5);
  }
}
