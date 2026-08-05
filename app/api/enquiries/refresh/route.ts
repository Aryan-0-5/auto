import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-handler";
import {
  listThreads,
  fetchMessageByThreadId,
  getHeaderValue,
  extractPlainTextBody,
} from "@/lib/composio";
import { parseEnquiryLineItems, deriveCompanyName } from "@/lib/parse-enquiry";

// Strictly unread — not "unread or recent," not keyword-matched, not the
// whole inbox. Enquiry detection itself isn't fully reliable (see the "See
// full mail body" check on each card), so keep the Gmail-side filter as
// narrow and unambiguous as possible.
const SEARCH_QUERY = "is:unread";

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
    const messages = detail?.messages ?? [];
    if (messages.length === 0) {
      skipped++;
      continue;
    }
    const latest = messages.reduce((a, b) =>
      Number(a.internalDate ?? 0) >= Number(b.internalDate ?? 0) ? a : b
    );

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

  return NextResponse.json({ created, skipped, scanned: candidates.length });
});
