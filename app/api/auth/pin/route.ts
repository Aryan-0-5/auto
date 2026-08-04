import { NextResponse } from "next/server";
import { getSession, verifyPin } from "@/lib/auth";
import { pinSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = pinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "PIN is required" }, { status: 400 });
  }

  const valid = await verifyPin(parsed.data.pin);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
  }

  const session = await getSession();
  session.pinVerified = true;
  await session.save();

  return NextResponse.json({ ok: true });
}
