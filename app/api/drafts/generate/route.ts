export const maxDuration = 60;

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-handler";
import { createEmailDraft, deleteDraft, describeError } from "@/lib/composio";
import { renderEmailBody } from "@/lib/render-email";
import { runWithConcurrency } from "@/lib/concurrency";
import { generateDraftsSchema } from "@/lib/validation";

// Composio's GMAIL_CREATE_EMAIL_DRAFT rejects a request with no subject
// outright ("Following fields are missing: {'subject'}") — Gmail doesn't
// infer it from the thread the way a human reply would.
function replySubject(subject: string): string {
  return /^re:/i.test(subject.trim()) ? subject : `Re: ${subject}`;
}

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
    const subject = replySubject(enquiry.subject);

    if (existingDraft) {
      // GMAIL_UPDATE_DRAFT is currently broken on Composio's side (see
      // lib/composio.ts) — create the replacement first, only delete the old
      // one after that succeeds, so a failure here never leaves an enquiry
      // with zero drafts. Ends up with a new gmailDraftId each regenerate
      // instead of true in-place update, but still exactly one live draft.
      const created = await createEmailDraft({
        recipient_email: enquiry.senderEmail,
        thread_id: enquiry.gmailThreadId,
        subject,
        body,
        is_html: template.isHtml,
      });
      await deleteDraft({ draft_id: existingDraft.gmailDraftId }).catch((err) => {
        console.error(
          `Regenerated draft for enquiry ${enquiry.id}, but failed to delete the superseded draft ${existingDraft.gmailDraftId} — left orphaned in Gmail:`,
          err
        );
      });
      await prisma.draft.update({
        where: { id: existingDraft.id },
        data: {
          gmailDraftId: created.id,
          gmailMessageId: created.message?.id,
          subject,
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
        subject,
        body,
        is_html: template.isHtml,
      });
      await prisma.draft.create({
        data: {
          enquiryId: enquiry.id,
          gmailDraftId: created.id,
          gmailMessageId: created.message?.id,
          toEmail: enquiry.senderEmail,
          subject,
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
  // runWithConcurrency swallows per-item errors so one bad Composio call
  // doesn't fail the whole batch — but that means this is the only place
  // that error detail exists at all. Previously this route discarded it
  // entirely (just counted failures), leaving no server-side trail and
  // nothing but a bare count on the client. Log + surface it here instead.
  const failures = results
    .map((r, i) => ({ r, enquiry: enquiries[i] }))
    .filter((x): x is { r: { ok: false; error: unknown }; enquiry: (typeof enquiries)[number] } => !x.r.ok)
    .map(({ r, enquiry }) => {
      const detail = describeError(r.error);
      console.error(
        `Draft generation failed for enquiry ${enquiry.id} (${enquiry.companyName ?? enquiry.senderEmail}):`,
        detail
      );
      return { enquiryId: enquiry.id, companyName: enquiry.companyName, senderEmail: enquiry.senderEmail, ...detail };
    });

  return NextResponse.json({ generated, failed: failures.length, failures });
});
