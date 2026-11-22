import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/config";
import { apiUrl, clearSession, forwardHeaders, sameOrigin } from "@/lib/bff";

/**
 * Backend-for-frontend proxy: browser → Next.js (httpOnly session cookie) → Laravel API (Bearer token).
 * Token-issuing endpoints are excluded here and handled by /api/auth/[action] which sets the cookie.
 */
const BLOCKED = new Set(["auth/login", "auth/verify-email", "auth/2fa/verify", "auth/logout", "auth/logout-all"]);

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const joined = path.join("/");
  if (!joined || joined.includes("..") || BLOCKED.has(joined) || !/^[\w\-/.]+$/.test(joined)) {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }
  if (!sameOrigin(req)) {
    return NextResponse.json({ message: "Cross-site request blocked." }, { status: 403 });
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const headers = forwardHeaders(req, token);
  const ct = req.headers.get("content-type");
  if (ct) headers.set("Content-Type", ct);

  const init: RequestInit & { duplex?: "half" } = { method: req.method, headers, cache: "no-store", redirect: "manual" };
  if (!["GET", "HEAD"].includes(req.method)) {
    init.body = req.body;
    init.duplex = "half"; // stream multipart uploads (resumes, logos) straight through
  }

  let upstream: Response;
  try {
    upstream = await fetch(apiUrl(joined, req.nextUrl.search), init);
  } catch {
    return NextResponse.json({ message: "Service temporarily unavailable. Please try again." }, { status: 503 });
  }

  const out = new Headers();
  for (const k of ["content-type", "content-disposition", "retry-after", "x-ratelimit-remaining"]) {
    const v = upstream.headers.get(k);
    if (v) out.set(k, v);
  }
  out.set("Cache-Control", "private, no-store");
  const res = new NextResponse(upstream.body, { status: upstream.status, headers: out });
  if (upstream.status === 401 && token) clearSession(res);
  return res;
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
