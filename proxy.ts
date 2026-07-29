import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  const isAuthed = !!session.userId;
  const isLoginPath = request.nextUrl.pathname.startsWith("/login");

  if (!isAuthed && !isLoginPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isAuthed && isLoginPath) {
    return NextResponse.redirect(new URL("/incoming", request.url));
  }
  return response;
}

// Only guards page navigation with a redirect. API routes are excluded — a
// redirect response makes no sense for a fetch() call; every API route handler
// calls requireUser() itself (see lib/auth.ts) for its own 401, per Next.js's
// guidance to never rely on Proxy alone for auth.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
