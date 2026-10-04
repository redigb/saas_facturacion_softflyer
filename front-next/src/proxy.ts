import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { PLATFORM_COOKIE, SESSION_COOKIE } from "@/lib/session";

// Chequeo optimista: la validez real del token la decide Laravel en cada página.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/plataforma")) {
    if (pathname !== "/plataforma/login" && !request.cookies.has(PLATFORM_COOKIE)) {
      return NextResponse.redirect(new URL("/plataforma/login", request.url));
    }

    return NextResponse.next();
  }

  if (!request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/panel/:path*", "/plataforma/:path*"],
};
