import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-handler";
import { getDraft, getHeaderValue, extractPlainTextBody } from "@/lib/composio";

// Re-hydrates the draft straight from Gmail before display — the authoritative
// source of truth, in case anything changed the draft outside this app.
export const GET = withAuth(
  async (_user, _request: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    const draft = await prisma.draft.findUnique({
      where: { id },
      include: { enquiry: { select: { companyName: true, senderName: true, subject: true } } },
    });
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    const live = await getDraft({ draft_id: draft.gmailDraftId, format: "full" });
    const toEmail = getHeaderValue(live.message, "To") ?? draft.toEmail;
    const subject = getHeaderValue(live.message, "Subject") ?? draft.subject;
    const liveBodyText = extractPlainTextBody(live.message);

    return NextResponse.json({ draft: { ...draft, toEmail, subject, liveBodyText } });
  }
);
