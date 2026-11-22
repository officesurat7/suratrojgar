import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/config";
import { apiUrl, clearSession, forwardHeaders, sameOrigin, setSession } from "@/lib/bff";

/** Endpoints that issue or revoke the session token. The token is stored in an httpOnly cookie, never returned to JS. */
const MAP: Record<string, string> = {
  login: "auth/login",
  "verify-email": "auth/verify-email",
  "2fa": "auth/2fa/verify",
  logout: "auth/logout",
  "logout-all": "auth/logout-all",
};

export async function POST(req: NextRequest, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  const target = MAP[action];
  if (!target) return NextResponse.json({ message: "Not found." }, { status: 404 });
  if (!sameOrigin(req)) return NextResponse.json({ message: "Cross-site request blocked." }, { status: 403 });

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const headers = forwardHeaders(req, token);
  headers.set("Content-Type", "application/json");
  const body = action.startsWith("logout") ? "{}" : await req.text();

  let upstream: Response;
  try {
    upstream = await fetch(apiUrl(target), { method: "POST", headers, body, cache: "no-store" });
  } catch {
    return NextResponse.json({ message: "Service temporarily unavailable. Please try again." }, { status: 503 });
  }
  const data = await upstream.json().catch(() => ({}));

  if (action.startsWith("logout")) {
    const res = NextResponse.json({ message: data.message ?? "Logged out." });
    clearSession(res);
    return res;
  }
  if (upstream.ok && data.token) {
    const res = NextResponse.json({ user: data.user });
    setSession(res, data.token, data.expires_at ?? null, data.user?.user_type ?? "");
    return res;
  }
  return NextResponse.json(data, { status: upstream.status });
}
