// Pure, side-effect-free rendering shared between the live UI preview and the
// actual draft/send call to Composio — this is what guarantees what the user
// reviews on screen is byte-identical to what goes out.

export type LineItemInput = {
  itemName: string;
  qty?: string | null;
  price?: number | string | null;
  stockRemarks?: string | null;
};

export type TemplateInput = {
  openingLineHtml: string;
  termsBlockHtml: string;
  closingSignatureHtml: string;
  isHtml: boolean;
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}

function toPriceNumber(price: number | string | null | undefined): number | null {
  if (price === null || price === undefined || price === "") return null;
  const num = typeof price === "string" ? Number(price) : price;
  return Number.isFinite(num) ? num : null;
}

/** Renders a single quotation line, in both plain-text and HTML-escaped form.
 * Priced items render normally; unpriced items ask the customer to confirm,
 * using stockRemarks as the reason (with a generic fallback if it's empty) —
 * never inventing a price. */
export function renderLineItem(
  item: LineItemInput,
  index: number
): { text: string; html: string } {
  const qtyPart = item.qty ? ` - ${item.qty}` : "";
  const priceNum = toPriceNumber(item.price);
  const remarks = item.stockRemarks?.trim();

  if (priceNum !== null) {
    const pricePart = `@ Rs. ${priceNum.toFixed(2)} each`;
    const suffix = remarks ? ` — ${remarks}` : "";
    return {
      text: `${index + 1}. ${item.itemName}${qtyPart} ${pricePart}${suffix}`,
      html: `${index + 1}. ${escapeHtml(item.itemName)}${escapeHtml(qtyPart)} ${escapeHtml(pricePart)}${
        suffix ? ` — ${escapeHtml(remarks!)}` : ""
      }`,
    };
  }

  const reason = remarks || "kindly confirm details for this item";
  return {
    text: `${index + 1}. ${item.itemName}${qtyPart} — kindly confirm: ${reason}`,
    html: `${index + 1}. ${escapeHtml(item.itemName)}${escapeHtml(
      qtyPart
    )} — kindly confirm: ${escapeHtml(reason)}`,
  };
}

/** Builds the full email body: opening line -> numbered item lines -> general
 * remarks (a single block for the whole enquiry, only rendered if non-empty,
 * never merged with any per-item remarks) -> terms block -> closing/signature.
 * Always returns both html and text; the caller picks the real send body via
 * template.isHtml. */
export function renderEmailBody(params: {
  template: TemplateInput;
  lineItems: LineItemInput[];
  generalRemarks?: string | null;
}): { html: string; text: string } {
  const { template, lineItems, generalRemarks } = params;

  const rendered = lineItems.map((item, i) => renderLineItem(item, i));
  const itemsHtml = rendered.map((l) => `<p>${l.html}</p>`).join("\n");
  const itemsText = rendered.map((l) => l.text).join("\n");

  const remarksTrimmed = generalRemarks?.trim();
  const remarksHtml = remarksTrimmed ? `<p>${escapeHtml(remarksTrimmed)}</p>` : "";

  const html = [template.openingLineHtml, itemsHtml, remarksHtml, template.termsBlockHtml, template.closingSignatureHtml]
    .filter(Boolean)
    .join("\n");

  const text = [
    htmlToText(template.openingLineHtml),
    itemsText,
    remarksTrimmed ?? "",
    htmlToText(template.termsBlockHtml),
    htmlToText(template.closingSignatureHtml),
  ]
    .filter(Boolean)
    .join("\n\n");

  return { html, text };
}

// ---- isHtml derivation (Template-save time) ----

type TiptapNode = {
  type: string;
  content?: TiptapNode[];
  marks?: { type: string }[];
};

const PLAIN_NODE_TYPES = new Set(["doc", "paragraph", "text", "hardBreak"]);

/** Walks a Tiptap/ProseMirror JSON doc for any mark or node type outside a
 * plain whitelist (paragraph/text/hardBreak, no marks). Only Templates carry
 * rich formatting — per-item and general remarks are always plain text — so
 * this is computed once per template save and reused for every draft it
 * generates, rather than re-derived per send. */
export function deriveIsHtmlFromTiptapDoc(doc: TiptapNode): boolean {
  function hasFormatting(node: TiptapNode): boolean {
    if (!PLAIN_NODE_TYPES.has(node.type)) return true;
    if (node.marks && node.marks.length > 0) return true;
    return (node.content ?? []).some(hasFormatting);
  }
  return hasFormatting(doc);
}
