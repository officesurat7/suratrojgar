// Browser smoke test: opens the main public pages on desktop and phone sizes and fails on
// server errors, page crashes or horizontal scrolling.
// Usage: BASE_URL=http://127.0.0.1:3000 node scripts/smoke.mjs   (needs: npm i -D playwright && npx playwright install chromium)
import { chromium } from "playwright";

const BASE = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const PAGES = ["/", "/jobs", "/jobs/search", "/jobs/type/fresher", "/apply", "/login", "/register/job-seeker", "/register/employer",
  "/about-us", "/contact-us", "/faq", "/privacy-policy", "/terms", "/grievance", "/robots.txt", "/sitemap.xml"];
const SIZES = [{ width: 1366, height: 900 }, { width: 390, height: 844 }];

let failed = 0;
const browser = await chromium.launch();
for (const viewport of SIZES) {
  const page = await (await browser.newContext({ viewport })).newPage();
  page.setDefaultNavigationTimeout(90000);  // first hit on a dev server compiles the page
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of PAGES) {
    errors.length = 0;
    const res = await page.goto(BASE + path, { waitUntil: "networkidle" });
    const status = res?.status() ?? 0;
    const hscroll = path.endsWith(".xml") || path.endsWith(".txt") ? false : await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    const ok = status < 400 && !errors.length && !hscroll;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"} ${viewport.width}px ${path} ${status}${hscroll ? " horizontal-scroll" : ""}${errors.length ? " " + errors.join("; ") : ""}`);
  }
  // A job detail page, found from the listing
  await page.goto(BASE + "/jobs", { waitUntil: "networkidle" });
  const href = await page.locator('a[href^="/jobs/"][href*="-"]').first().getAttribute("href").catch(() => null);
  if (href) {
    const r = await page.goto(BASE + href, { waitUntil: "networkidle" });
    const html = await page.content();
    const leaked = /contact_mobile|office_address/.test(html);
    if ((r?.status() ?? 0) >= 400 || leaked) failed++;
    console.log(`${(r?.status() ?? 0) < 400 && !leaked ? "PASS" : "FAIL"} ${viewport.width}px job detail ${href}${leaked ? " PRIVATE FIELD IN HTML" : ""}`);
  }
}
await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
