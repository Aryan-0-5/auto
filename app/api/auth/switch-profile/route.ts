import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { withPinVerified } from "@/lib/api-handler";

// Clears the active profile but keeps pinVerified — the picker only asks
// "who's using it", never re-asks for the PIN.
export const POST = withPinVerified(async () => {
  const session = await getSession();
  session.activeUserId = undefined;
  await session.save();
  return NextResponse.json({ ok: true });
});
