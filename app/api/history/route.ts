import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-handler";

export const GET = withAuth(async (_user, request: Request) => {
  const url = new URL(request.url);
  const customer = url.searchParams.get("customer");
  const date = url.searchParams.get("date");
  const item = url.searchParams.get("item");

  const where: Prisma.SentHistoryWhereInput = {};
  if (customer) {
    where.OR = [
      { senderEmail: { contains: customer, mode: "insensitive" } },
      { companyName: { contains: customer, mode: "insensitive" } },
    ];
  }
  if (date) {
    where.sentAt = {
      gte: new Date(`${date}T00:00:00.000Z`),
      lte: new Date(`${date}T23:59:59.999Z`),
    };
  }
  if (item) {
    where.items = { some: { itemName: { contains: item, mode: "insensitive" } } };
  }

  const history = await prisma.sentHistory.findMany({
    where,
    include: { items: true, sentByUser: { select: { name: true } } },
    orderBy: { sentAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ history });
});
