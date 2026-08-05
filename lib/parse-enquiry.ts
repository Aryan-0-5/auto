// Heuristic parsing of quotation-enquiry email bodies into item/qty rows.
// This is explicitly the fuzziest part of v1 (see build plan) — real-world
// formatting variance (tables, forwarded chains, PDF-only item lists) will
// misfire here. Every extracted row keeps its original `rawText` so a misparse
// is a one-glance fix in the UI, not a hunt through the raw email. Patterns are
// centralized in this one module so future tuning stays localized.

export type ParsedLineItem = {
  rawText: string;
  itemName: string;
  qty: string | null;
};

const QUOTE_MARKERS = [
  /^\s*On .+ wrote:\s*$/im,
  /^\s*-{2,}\s*Original Message\s*-{2,}\s*$/im,
  /^\s*From:\s*.+$/im, // forwarded-message header block
];

const QUOTED_LINE_PREFIX = /^\s*>/;

const NUMBERED_LINE = /^\s*\d+[.)]\s*(.+)$/;
const BULLETED_LINE = /^\s*[-*•]\s*(.+)$/;

// Quantity token patterns, tried in order; first match wins.
const QTY_PATTERNS: RegExp[] = [
  /(\d[\d,]*(?:\.\d+)?)\s*(pcs?|nos?|units?|kgs?|ltrs?|liters?|litres?|boxe?s?|sets?)\b/i,
  /\bx\s*(\d[\d,]*)\b/i,
  /-\s*(\d[\d,]*)\s*$/,
];

/** Strips quoted history (previous messages in the thread) from a raw body,
 * keeping only the freshest content the sender actually wrote. */
export function stripQuotedHistory(body: string): string {
  let cutIndex = body.length;
  for (const marker of QUOTE_MARKERS) {
    const match = marker.exec(body);
    if (match && match.index < cutIndex) cutIndex = match.index;
  }
  const fresh = body.slice(0, cutIndex);

  return fresh
    .split("\n")
    .filter((line) => !QUOTED_LINE_PREFIX.test(line))
    .join("\n")
    .trim();
}

function extractQty(line: string): { itemName: string; qty: string | null } {
  for (let i = 0; i < QTY_PATTERNS.length; i++) {
    const match = QTY_PATTERNS[i].exec(line);
    if (match) {
      const itemName = (line.slice(0, match.index) + line.slice(match.index + match[0].length))
        .replace(/[-–—,]\s*$/, "")
        .trim();
      // Pattern 0 has a meaningful unit ("50 pcs") — keep the whole match.
      // Patterns 1/2 (`x 20`, trailing `- 100`) matched an operator that's just
      // noise around the number — keep only the captured digits.
      const qty = i === 0 ? match[0].trim() : match[1].trim();
      return { itemName: itemName || line.trim(), qty };
    }
  }
  return { itemName: line.trim(), qty: null };
}

function structuredPass(lines: string[]): ParsedLineItem[] {
  const items: ParsedLineItem[] = [];
  for (const line of lines) {
    const numbered = NUMBERED_LINE.exec(line);
    const bulleted = !numbered ? BULLETED_LINE.exec(line) : null;
    const content = numbered?.[1] ?? bulleted?.[1];
    if (!content) continue;
    const { itemName, qty } = extractQty(content);
    items.push({ rawText: line.trim(), itemName, qty });
  }
  return items;
}

// Fallback for bodies with no list markers at all: scan sentence-like chunks for
// "<qty><unit> ... of <item>" or "<item> ... <qty><unit>" in either order.
const UNSTRUCTURED_PATTERN =
  /(?:(\d[\d,]*)\s*(pcs?|nos?|units?|kgs?|ltrs?|liters?|litres?|boxe?s?|sets?)\s*(?:of\s+)?([a-zA-Z][\w\s-]{1,60}))|(?:([a-zA-Z][\w\s-]{1,60}?)\s*[-x]\s*(\d[\d,]*)\s*(pcs?|nos?|units?|kgs?|ltrs?|liters?|litres?|boxe?s?|sets?)?)/gi;

function unstructuredPass(text: string): ParsedLineItem[] {
  const items: ParsedLineItem[] = [];
  const chunks = text
    .split(/[\n.;]+/)
    .flatMap((c) => c.split(/\s+and\s+/i))
    .map((c) => c.trim())
    .filter(Boolean);
  for (const chunk of chunks) {
    UNSTRUCTURED_PATTERN.lastIndex = 0;
    const match = UNSTRUCTURED_PATTERN.exec(chunk);
    if (!match) continue;
    if (match[1]) {
      // "<qty><unit> of <item>"
      items.push({
        rawText: chunk,
        itemName: match[3].trim(),
        qty: `${match[1]} ${match[2]}`.trim(),
      });
    } else if (match[4]) {
      // "<item> - <qty><unit>"
      items.push({
        rawText: chunk,
        itemName: match[4].trim(),
        qty: match[6] ? `${match[5]} ${match[6]}`.trim() : match[5].trim(),
      });
    }
  }
  return items;
}

export function parseEnquiryLineItems(rawBody: string): ParsedLineItem[] {
  const fresh = stripQuotedHistory(rawBody);
  const lines = fresh.split("\n").map((l) => l.trim()).filter(Boolean);

  const structured = structuredPass(lines);
  if (structured.length > 0) return structured;

  const unstructured = unstructuredPass(fresh);
  if (unstructured.length > 0) return unstructured;

  // Never drop an enquiry: surface it for fully-manual entry rather than
  // silently disappearing from the Enquiries tab.
  return [
    {
      rawText: fresh.slice(0, 500),
      itemName: "(see email body)",
      qty: null,
    },
  ];
}

/** Derives a display company name from the sender's From header: prefers the
 * display name, falls back to a title-cased domain. Heuristic — will misfire
 * for personal (non-company-domain) sender addresses. */
export function deriveCompanyName(fromHeader: string): string {
  const displayNameMatch = /^"?([^"<]+?)"?\s*<[^>]+>$/.exec(fromHeader.trim());
  if (displayNameMatch) {
    return displayNameMatch[1].trim();
  }
  const emailMatch = /([\w.-]+)@([\w.-]+)/.exec(fromHeader);
  if (emailMatch) {
    const domain = emailMatch[2].split(".")[0];
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  }
  return fromHeader.trim();
}
