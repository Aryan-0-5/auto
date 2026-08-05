import { NextResponse } from "next/server";
import { requireActiveUser, UnauthorizedError } from "./auth";
import { ComposioToolError } from "./composio";

type AuthedUser = { userId: string; userName: string };

function mapError(err: unknown): Response {
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

/** Wraps a route handler with requireActiveUser() + consistent error mapping. */
export function withAuth<Args extends unknown[]>(
  handler: (user: AuthedUser, ...args: Args) => Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    try {
      const user = await requireActiveUser();
      return await handler(user, ...args);
    } catch (err) {
      return mapError(err);
    }
  };
}
