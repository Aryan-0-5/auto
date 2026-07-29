import { NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "./auth";
import { ComposioToolError } from "./composio";

type AuthedUser = { userId: string; userName: string };

/** Wraps a route handler with requireUser() + consistent error mapping, so every
 * API route doesn't repeat the same try/catch for 401/502/500. */
export function withAuth<Args extends unknown[]>(
  handler: (user: AuthedUser, ...args: Args) => Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    try {
      const user = await requireUser();
      return await handler(user, ...args);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (err instanceof ComposioToolError) {
        return NextResponse.json(
          { error: `Gmail action failed (${err.slug})`, details: err.raw },
          { status: 502 }
        );
      }
      console.error(err);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  };
}
