import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-handler";
import { updateEnquirySchema } from "@/lib/validation";

export const PATCH = withAuth(
  async (_user, request: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const parsed = updateEnquirySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const enquiry = await prisma.enquiry.findUnique({ where: { id } });
    if (!enquiry) {
      return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    }

    const { generalRemarks, lineItems } = parsed.data;

    await prisma.$transaction([
      prisma.enquiry.update({
        where: { id },
        data: {
          ...(generalRemarks !== undefined ? { generalRemarks } : {}),
          status: enquiry.status === "NEW" ? "IN_PROGRESS" : enquiry.status,
        },
      }),
      ...(lineItems ?? []).map((item) =>
        prisma.enquiryLineItem.update({
          where: { id: item.id },
          data: {
            itemName: item.itemName,
            qty: item.qty,
            price: item.price,
            stockRemarks: item.stockRemarks,
          },
        })
      ),
    ]);

    const updated = await prisma.enquiry.findUnique({
      where: { id },
      include: { lineItems: { orderBy: { lineOrder: "asc" } } },
    });
    return NextResponse.json({ enquiry: updated });
  }
);
