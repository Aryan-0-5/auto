export const maxDuration = 60;

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-handler";
import { createEmailDraft, updateDraft } from "@/lib/composio";
import { renderEmailBody } from "@/lib/render-email";
import { runWithConcurrency } from "@/lib/concurrency";
import { generateDraftsSchema } from "@/lib/validation";

export const POST = withAuth(async (user, request: Request) => {
  const body = await request.json().catch(() => null);
  const parsed = generateDraftsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "enquiryIds is required" }, { status: 400 });
  }

  const template = await prisma.template.findFirst({ where: { name: "default" } });
  if (!template) {
    return NextResponse.json({ error: "Default template not found — has the app been seeded?" }, { status: 404 });
  }

  // Select-to-promote: only ever acts on cards the user explicitly checked,
  // never the whole Enquiries list — still scoped to NEW/IN_PROGRESS as
  // defense-in-depth against acting on an already-drafted/sent enquiry.
  const enquiries = await prisma.enquiry.findMany({
    where: { id: { in: parsed.data.enquiryIds }, status: { in: ["NEW", "IN_PROGRESS"] } },
    include: {
      lineItems: { orderBy: { lineOrder: "asc" } },
      drafts: { where: { status: "PENDING" } },
    },
  });

  const results = await runWithConcurrency(enquiries, 10, async (enquiry) => {
    const rendered = renderEmailBody({
      template: {
        openingLineHtml: template.openingLineHtml,
        termsBlockHtml: template.termsBlockHtml,
        closingSignatureHtml: template.closingSignatureHtml,
        isHtml: template.isHtml,
      },
      lineItems: enquiry.lineItems.map((i) => ({
        itemName: i.itemName,
        qty: i.qty,
        price: i.price?.toString() ?? null,
        stockRemarks: i.stockRemarks,
      })),
      generalRemarks: enquiry.generalRemarks,
    });
    const body = template.isHtml ? rendered.html : rendered.text;

    const existingDraft = enquiry.drafts[0];

    if (existingDraft) {
      // Regenerate in place — same Gmail draft id, no stale duplicate left behind.
      await updateDraft({
        draft_id: existingDraft.gmailDraftId,
        recipient_email: enquiry.senderEmail,
        thread_id: enquiry.gmailThreadId,
        body,
        is_html: template.isHtml,
      });
      await prisma.draft.update({
        where: { id: existingDraft.id },
        data: {
          bodyHtml: rendered.html,
          bodyText: rendered.text,
          isHtml: template.isHtml,
          generatedAt: new Date(),
          generatedByUserId: user.userId,
        },
      });
    } else {
      const created = await createEmailDraft({
        recipient_email: enquiry.senderEmail,
        thread_id: enquiry.gmailThreadId,
        body,
        is_html: template.isHtml,
      });
      await prisma.draft.create({
        data: {
          enquiryId: enquiry.id,
          gmailDraftId: created.id,
          gmailMessageId: created.message?.id,
          toEmail: enquiry.senderEmail,
          subject: enquiry.subject,
          bodyHtml: rendered.html,
          bodyText: rendered.text,
          isHtml: template.isHtml,
          generatedByUserId: user.userId,
        },
      });
    }

    await prisma.enquiry.update({ where: { id: enquiry.id }, data: { status: "DRAFTED" } });
  });

  const generated = results.filter((r) => r.ok).length;
  const failed = results.length - generated;
  return NextResponse.json({ generated, failed });
});
