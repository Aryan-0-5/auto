export const maxDuration = 60;

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-handler";
import {
  listThreads,
  fetchMessageByThreadId,
  getHeaderValue,
  extractPlainTextBody,
  type GmailMessage,
} from "@/lib/composio";
import { parseEnquiryLineItems, deriveCompanyName } from "@/lib/parse-enquiry";
import { runWithConcurrency } from "@/lib/concurrency";

// Two independent filters, both required: is:unread scopes which mailbox
// state we look at; this keyword list scopes which unread mail actually
// looks like a quotation enquiry (without it, every unread newsletter/ad/
// notification becomes a "card" — confirmed against real inbox noise before
// this was added). PO/"purchase order" deliberately excluded — that's a
// different pipeline stage downstream of an enquiry, not an enquiry itself.
const RELEVANCE_KEYWORDS = [
  "quote",
  "quotation",
  "RFQ",
  "enquiry",
  "enquire",
  "inquiry",
  "inquire",
  "price",
  "pricing",
  "rate",
  "rates",
  '"please quote"',
  '"kindly quote"',
  '"stock position"',
  '"best price"',
];
const SEARCH_QUERY = `is:unread (${RELEVANCE_KEYWORDS.join(" OR ")})`;

function isUnread(message: Pick<GmailMessage, "labelIds">): boolean {
  return !!message.labelIds?.includes("UNREAD");
}

function latestMessage(messages: GmailMessage[]): GmailMessage | null {
  if (messages.length === 0) return null;
  return messages.reduce((a, b) => (Number(a.internalDate ?? 0) >= Number(b.internalDate ?? 0) ? a : b));
}

export const POST = withAuth(async () => {
  const { threads } = await listThreads({ query: SEARCH_QUERY, max_results: 30 });
  const candidates = threads ?? [];

  let created = 0;
  let skipped = 0;

  for (const thread of candidates) {
    const existing = await prisma.enquiry.findUnique({ where: { gmailThreadId: thread.id } });
    if (existing) {
      // Never overwrite an enquiry staff may already be editing — refresh only
      // pulls in genuinely new threads (see build plan's staging-state design).
      skipped++;
      continue;
    }

    const detail = await fetchMessageByThreadId({ thread_id: thread.id }).catch(() => null);
    const latest = latestMessage(detail?.messages ?? []);
    if (!latest) {
      skipped++;
      continue;
    }

    const fromHeader = getHeaderValue(latest, "From") ?? "";
    const subject = getHeaderValue(latest, "Subject") ?? "(no subject)";
    const emailMatch = /<([^>]+)>/.exec(fromHeader);
    const senderEmail = emailMatch ? emailMatch[1] : fromHeader.trim();
    const senderName = fromHeader.replace(/<[^>]+>/, "").replace(/"/g, "").trim() || null;
    const companyName = deriveCompanyName(fromHeader);
    const body = extractPlainTextBody(latest);
    const lineItems = parseEnquiryLineItems(body);

    await prisma.enquiry.create({
      data: {
        gmailThreadId: thread.id,
        senderEmail,
        senderName,
        companyName,
        subject,
        rawBody: body,
        lineItems: {
          create: lineItems.map((item, index) => ({
            lineOrder: index,
            rawText: item.rawText,
            itemName: item.itemName,
            qty: item.qty,
          })),
        },
      },
    });
    created++;
  }

  // Reconcile: refresh shouldn't only ever add. Anything still sitting on the
  // board (NEW/IN_PROGRESS) whose Gmail thread has since been read comes off
  // — checked directly against live Gmail state, not just "did it reappear
  // in this search," so a still-unread thread that no longer matches the
  // keyword list (edge case) isn't dropped for the wrong reason.
  const onBoard = await prisma.enquiry.findMany({
    where: { status: { in: ["NEW", "IN_PROGRESS"] } },
    select: { id: true, gmailThreadId: true },
  });

  const reconcileResults = await runWithConcurrency(onBoard, 10, async (enquiry) => {
    const detail = await fetchMessageByThreadId({ thread_id: enquiry.gmailThreadId });
    const latest = latestMessage(detail.messages ?? []);
    if (!latest || isUnread(latest)) return false;
    await prisma.enquiry.update({ where: { id: enquiry.id }, data: { status: "DISMISSED" } });
    return true;
  });
  const archived = reconcileResults.filter((r) => r.ok && r.value).length;

  return NextResponse.json({ created, skipped, archived, scanned: candidates.length });
});
