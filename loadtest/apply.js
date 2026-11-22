// k6 load test: logged-in job seekers applying. Writes data, so run ONLY against a staging copy with test accounts.
// Prepare: create seekers loadseeker1..N@example.test with password from SEEKER_PASSWORD (see docs/TESTING.md).
//   k6 run -e API=https://api-staging.suratrojgar.in -e SEEKERS=200 -e SEEKER_PASSWORD=... apply.js
import http from "k6/http";
import { check, sleep } from "k6";

const API = (__ENV.API || "http://127.0.0.1:8000") + "/api/v1";
const SEEKERS = Number(__ENV.SEEKERS || 50);
const PASSWORD = __ENV.SEEKER_PASSWORD;
if (!PASSWORD) throw new Error("Set SEEKER_PASSWORD for the test accounts");

export const options = {
  scenarios: { apply: { executor: "per-vu-iterations", vus: SEEKERS, iterations: 5, maxDuration: "15m" } },
  thresholds: { "http_req_duration{name:apply}": ["p(95)<800"], checks: ["rate>0.98"] },
};

const json = { headers: { "Content-Type": "application/json", Accept: "application/json" } };

export function setup() {
  const r = http.get(`${API}/jobs?per_page=50`);
  return { jobs: (r.json("data") || []).map((j) => j.id) };
}

export default function (data) {
  const email = `loadseeker${__VU}@example.test`;
  const login = http.post(`${API}/auth/login`, JSON.stringify({ email, password: PASSWORD, portal: "user" }), json);
  if (!check(login, { "login ok": (r) => r.status === 200 })) { sleep(5); return; }
  const auth = { headers: { ...json.headers, Authorization: `Bearer ${login.json("token")}` } };
  const jobId = data.jobs[(__VU * 7 + __ITER) % data.jobs.length];
  const r = http.post(`${API}/seeker/jobs/${jobId}/apply`, JSON.stringify({ cover_letter: "Load test application" }), { ...auth, tags: { name: "apply" } });
  check(r, { "applied or already applied": (x) => x.status === 201 || x.status === 422 });
  sleep(2 + Math.random() * 3);
  http.post(`${API}/auth/logout`, null, auth);
}
