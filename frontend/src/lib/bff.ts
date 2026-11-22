import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { API_INTERNAL_URL, ROLE_COOKIE, SESSION_COOKIE } from "./config";

const secure = process.env.COOKIE_SECURE === "true";

/** Headers forwarded to Laravel so it sees the real client (rate limits, audit logs). */
export function forwardHeaders(req: NextRequest, token?: string | null): Headers {
  const h = new Headers();
  h.set("Accept", "application/json");
  const ua = req.headers.get("user-agent");
  if (ua) h.set("User-Agent", ua.slice(0, 400));
  const xff = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
  if (xff) h.set("X-Forwarded-For", xff);
  for (const k of ["dnt", "sec-gpc", "accept-language"]) {
    const v = req.headers.get(k);
    if (v) h.set(k, v);
  }
  if (token) h.set("Authorization", `Bearer ${token}`);
  return h;
}

/** CSRF defence for cookie-authenticated mutations: the request must come from our own origin. */
export function sameOrigin(req: NextRequest): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return true;
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const origin = req.headers.get("origin");
  if (!origin) return site === "same-origin";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function setSession(res: NextResponse, token: string, expiresAt: string | null, userType: string) {
  const expires = expiresAt ? new Date(expiresAt) : undefined;
  // httpOnly: the API token is never readable by JavaScript (XSS cannot steal it)
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure, sameSite: "lax", path: "/", expires });
  res.cookies.set(ROLE_COOKIE, userType, { httpOnly: false, secure, sameSite: "lax", path: "/", expires });
}

export function clearSession(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 0 });
  res.cookies.set(ROLE_COOKIE, "", { httpOnly: false, secure, sameSite: "lax", path: "/", maxAge: 0 });
}

export function apiUrl(path: string, search = ""): string {
  return `${API_INTERNAL_URL}/${path.replace(/^\/+/, "")}${search}`;
}
