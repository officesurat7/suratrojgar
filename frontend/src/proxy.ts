import { NextRequest, NextResponse } from "next/server";

/**
 * Route protection (UX only): sends signed-out visitors to the right login page.
 * Real authorisation is enforced by the Laravel API on every request.
 */
const AREAS: { prefix: string; login: string; types: string[] }[] = [
  { prefix: "/seeker", login: "/login", types: ["job_seeker"] },
  { prefix: "/employer", login: "/login?as=employer", types: ["employer"] },
  { prefix: "/super-admin", login: "/super-admin/login", types: ["super_admin"] },
  { prefix: "/admin", login: "/admin/login", types: ["admin", "admin_staff", "super_admin"] },
];
const PUBLIC = ["/admin/login", "/staff/login", "/super-admin/login"];

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.includes(pathname)) return NextResponse.next();
  const area = AREAS.find((a) => pathname === a.prefix || pathname.startsWith(a.prefix + "/"));
  if (!area) return NextResponse.next();

  const hasSession = Boolean(req.cookies.get("sr_session")?.value);
  const role = req.cookies.get("sr_role")?.value ?? "";
  if (!hasSession) {
    const url = new URL(area.login, req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (role && !area.types.includes(role)) {
    // Signed in, but wrong area: send them to their own dashboard
    const home = role === "job_seeker" ? "/seeker" : role === "employer" ? "/employer" : role === "super_admin" ? "/super-admin" : "/admin";
    return NextResponse.redirect(new URL(home, req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/seeker/:path*", "/employer/:path*", "/admin/:path*", "/super-admin/:path*"],
};
