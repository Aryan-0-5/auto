import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  const pathname = request.nextUrl.pathname;
  const pinVerified = !!session.pinVerified;
  const hasActiveProfile = pinVerified && !!session.activeUserId;

  const isLoginPath = pathname === "/login";
  const isProfilesPath = pathname === "/profiles";

  if (!pinVerified) {
    return isLoginPath ? response : NextResponse.redirect(new URL("/login", request.url));
  }

  // Past the PIN: /login is done, and /profiles is always reachable (it
  // doubles as "switch profile" even once a profile is already active).
  if (isLoginPath) {
    return NextResponse.redirect(new URL(hasActiveProfile ? "/incoming" : "/profiles", request.url));
  }
  if (isProfilesPath) {
    return response;
  }

  if (!hasActiveProfile) {
    return NextResponse.redirect(new URL("/profiles", request.url));
  }
  return response;
}

// Only guards page navigation with a redirect. API routes are excluded — a
// redirect response makes no sense for a fetch() call; every API route handler
// calls requirePinVerified()/requireActiveUser() itself (see lib/auth.ts) for
// its own 401, per Next.js's guidance to never rely on Proxy alone for auth.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
