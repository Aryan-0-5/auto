import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/auth";

// Must work even when nobody can log in at all — never gated behind pinVerified.
const RESET_PIN_PATH = "/admin/reset-pin";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;

  if (pathname === RESET_PIN_PATH) {
    return response;
  }

  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  const pinVerified = !!session.pinVerified;
  const isLoginPath = pathname === "/login";

  if (!pinVerified) {
    return isLoginPath ? response : NextResponse.redirect(new URL("/login", request.url));
  }
  if (isLoginPath) {
    return NextResponse.redirect(new URL("/enquiries", request.url));
  }
  return response;
}

// Only guards page navigation with a redirect. API routes are excluded — a
// redirect response makes no sense for a fetch() call; every API route handler
// calls requireActiveUser() itself (see lib/auth.ts) for its own 401, per
// Next.js's guidance to never rely on Proxy alone for auth.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
