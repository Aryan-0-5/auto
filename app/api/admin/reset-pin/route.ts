import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { setPin } from "@/lib/auth";
import { resetPinSchema } from "@/lib/validation";

// Deliberately NOT wrapped in withAuth/requireActiveUser — this is the
// break-glass path for when nobody can log in at all. Its entire security
// boundary is PIN_RESET_TOKEN, not the session.
function tokenMatches(candidate: string, expected: string): boolean {
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const expectedToken = process.env.PIN_RESET_TOKEN;
  if (!expectedToken) {
    console.error("PIN_RESET_TOKEN is not set — /admin/reset-pin cannot function");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = resetPinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "token and newPin are required" }, { status: 400 });
  }

  if (!tokenMatches(parsed.data.token, expectedToken)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  await setPin(parsed.data.newPin);
  return NextResponse.json({ ok: true });
}
