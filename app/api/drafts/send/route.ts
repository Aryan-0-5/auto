export const maxDuration = 60;

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-handler";
import { sendDraft } from "@/lib/composio";
import { runWithConcurrency } from "@/lib/concurrency";
import { sendDraftsSchema } from "@/lib/validation";

export const POST = withAuth(async (user, request: Request) => {
  const body = await request.json().catch(() => null);
  const parsed = sendDraftsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "draftIds is required" }, { status: 400 });
  }

  const drafts = await prisma.draft.findMany({
    where: { id: { in: parsed.data.draftIds }, status: "PENDING" },
    include: { enquiry: { include: { lineItems: { orderBy: { lineOrder: "asc" } } } } },
  });

  const results = await runWithConcurrency(drafts, 10, async (draft) => {
    const sent = await sendDraft({ draft_id: draft.gmailDraftId });

    await prisma.$transaction([
      prisma.sentHistory.create({
        data: {
          draftId: draft.id,
          gmailMessageId: sent.id,
          gmailThreadId: sent.threadId ?? draft.enquiry.gmailThreadId,
          senderEmail: draft.enquiry.senderEmail,
          companyName: draft.enquiry.companyName,
          subject: draft.subject,
          bodyHtml: draft.bodyHtml,
          bodyText: draft.bodyText,
          generalRemarks: draft.enquiry.generalRemarks,
          sentByUserId: user.userId,
          items: {
            create: draft.enquiry.lineItems.map((item) => ({
              itemName: item.itemName,
              qty: item.qty,
              price: item.price,
              stockRemarks: item.stockRemarks,
            })),
          },
        },
      }),
      prisma.draft.update({ where: { id: draft.id }, data: { status: "SENT" } }),
      prisma.enquiry.update({ where: { id: draft.enquiryId }, data: { status: "SENT" } }),
    ]);
  });

  const sentCount = results.filter((r) => r.ok).length;
  const failed = results.length - sentCount;
  return NextResponse.json({ sent: sentCount, failed });
});
