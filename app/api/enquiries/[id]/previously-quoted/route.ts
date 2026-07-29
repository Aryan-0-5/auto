import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-handler";
import { fetchEmails, extractPlainTextBody } from "@/lib/composio";

const PRICE_NEAR_ITEM = (itemName: string) =>
  new RegExp(`${itemName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^\\n]{0,80}?Rs\\.?\\s*([\\d,]+(?:\\.\\d+)?)`, "i");

const PRICE_ANYWHERE = /Rs\.?\s*([\d,]+(?:\.\d+)?)/i;

export const GET = withAuth(
  async (_user, request: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    const itemName = new URL(request.url).searchParams.get("itemName");
    if (!itemName) {
      return NextResponse.json({ error: "itemName query param is required" }, { status: 400 });
    }

    const enquiry = await prisma.enquiry.findUnique({ where: { id } });
    if (!enquiry) {
      return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    }

    const query = `in:sent to:${enquiry.senderEmail} "${itemName}"`;
    const { messages } = await fetchEmails({ query, max_results: 5, verbose: true, include_payload: true });

    if (!messages || messages.length === 0) {
      return NextResponse.json({ found: false });
    }

    const sorted = [...messages].sort(
      (a, b) => Number(b.internalDate ?? 0) - Number(a.internalDate ?? 0)
    );

    for (const message of sorted) {
      const body = extractPlainTextBody(message);
      const nearMatch = PRICE_NEAR_ITEM(itemName).exec(body) ?? PRICE_ANYWHERE.exec(body);
      if (nearMatch) {
        return NextResponse.json({
          found: true,
          price: Number(nearMatch[1].replace(/,/g, "")),
          sentAt: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : null,
        });
      }
    }

    // Messages matched the sender/item search but no price could be confidently
    // extracted — surface "no record found" rather than guessing (per build plan).
    return NextResponse.json({ found: false });
  }
);
