import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ADMIN_LOGIN = "/dashboard/admin/login";

/**
 * Site dashboard: `bme_access` (clients / organizers).
 * Admin console under `/dashboard/admin`: `bme_admin_access` (path-scoped cookie).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminLogin = pathname === ADMIN_LOGIN;
  const isAdminArea =
    pathname === "/dashboard/admin" || pathname.startsWith("/dashboard/admin/");

  if (isAdminArea && !isAdminLogin) {
    const adminToken = request.cookies.get("bme_admin_access")?.value;
    if (!adminToken) {
      const url = request.nextUrl.clone();
      url.pathname = ADMIN_LOGIN;
      const returnTo = `${pathname}${request.nextUrl.search}`;
      url.searchParams.set("next", returnTo);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard")) {
    if (isAdminLogin) {
      return NextResponse.next();
    }
    const token = request.cookies.get("bme_access")?.value;
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      const returnTo = `${pathname}${request.nextUrl.search}`;
      url.searchParams.set("next", returnTo);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
