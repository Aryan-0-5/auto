import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-handler";
import { fetchMessageByMessageId, getHeaderValue, extractPlainTextBody } from "@/lib/composio";

// Re-hydrates the draft straight from Gmail before display — the authoritative
// source of truth, in case anything changed the draft outside this app.
// Uses the draft's underlying message rather than GMAIL_GET_DRAFT, which is
// currently broken on Composio's side (404s Tool_ToolNotFound despite being a
// valid registered slug — see lib/composio.ts). A draft's message carries the
// identical To/Subject/body content, and that fetch tool works.
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

    if (!draft.gmailMessageId) {
      // Nothing to re-hydrate against — fall back to what's stored rather than fail.
      return NextResponse.json({ draft: { ...draft, liveBodyText: draft.bodyText } });
    }

    const live = await fetchMessageByMessageId({ message_id: draft.gmailMessageId, format: "full" });
    const toEmail = getHeaderValue(live, "To") ?? draft.toEmail;
    const subject = getHeaderValue(live, "Subject") ?? draft.subject;
    const liveBodyText = extractPlainTextBody(live);

    return NextResponse.json({ draft: { ...draft, toEmail, subject, liveBodyText } });
  }
);
