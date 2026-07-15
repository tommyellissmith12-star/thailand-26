import { NextRequest, NextResponse } from "next/server";

const COOKIE = "tt26_pass";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/enter") ||
    pathname.startsWith("/api/verify-pin") ||
    pathname.startsWith("/_next") ||
    pathname === "/manifest.json" ||
    pathname === "/map-style.json" ||
    /\.(png|svg|ico|webp|jpg)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const pin = process.env.FAMILY_PIN;
  // No PIN configured (local dev before env setup): let everything through.
  if (!pin) return NextResponse.next();

  if (req.cookies.get(COOKIE)?.value === pin) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "locked" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/enter";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!favicon.ico).*)"],
};
