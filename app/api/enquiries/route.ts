import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-handler";

export const GET = withAuth(async () => {
  const enquiries = await prisma.enquiry.findMany({
    where: { status: { in: ["NEW", "IN_PROGRESS"] } },
    include: { lineItems: { orderBy: { lineOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ enquiries });
});
