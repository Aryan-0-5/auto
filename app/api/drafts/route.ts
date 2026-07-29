import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-handler";

export const GET = withAuth(async () => {
  const drafts = await prisma.draft.findMany({
    where: { status: "PENDING" },
    include: {
      generatedByUser: { select: { name: true } },
      enquiry: { select: { companyName: true, senderName: true, subject: true } },
    },
    orderBy: { generatedAt: "desc" },
  });
  return NextResponse.json({ drafts });
});
