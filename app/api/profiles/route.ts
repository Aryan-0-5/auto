import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withPinVerified } from "@/lib/api-handler";
import { createProfileSchema } from "@/lib/validation";

export const GET = withPinVerified(async () => {
  const profiles = await prisma.user.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ profiles });
});

// Self-service profile creation — name only, no email/password, no approval
// step. New hires get added by whoever's using the board, not by redeploying.
export const POST = withPinVerified(async (request: Request) => {
  const body = await request.json().catch(() => null);
  const parsed = createProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A name is required" }, { status: 400 });
  }

  const profile = await prisma.user.create({ data: { name: parsed.data.name } });
  return NextResponse.json({ profile });
});
