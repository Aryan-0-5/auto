import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { withPinVerified } from "@/lib/api-handler";
import { selectProfileSchema } from "@/lib/validation";

export const POST = withPinVerified(async (request: Request) => {
  const body = await request.json().catch(() => null);
  const parsed = selectProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!user) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const session = await getSession();
  session.activeUserId = user.id;
  await session.save();

  return NextResponse.json({ profile: { id: user.id, name: user.name } });
});
