// Server-side only. Calls Composio's REST API directly (never through any MCP/tool-call layer).
// Endpoint path was verified against Composio's docs during planning as `v3` — re-confirm against
// the live dashboard code snippet for this account if calls start failing with 404s, since Composio
// has shifted this path before (v3 vs v3.1).
const COMPOSIO_BASE_URL = "https://backend.composio.dev/api/v3";

export class ComposioToolError extends Error {
  slug: string;
  raw: unknown;

  constructor(slug: string, raw: unknown) {
    super(`Composio tool ${slug} failed: ${JSON.stringify(raw)}`);
    this.name = "ComposioToolError";
    this.slug = slug;
    this.raw = raw;
  }
}

/** Shared shape for reporting a single failed item out of a batch (draft
 * generation, sending) — both to the client and to server logs, so a batch
 * failure is never a silent count with no trail. */
export type ErrorDetail = { slug: string | null; message: string; raw: unknown };

export function describeError(err: unknown): ErrorDetail {
  if (err instanceof ComposioToolError) {
    return { slug: err.slug, message: err.message, raw: err.raw };
  }
  return { slug: null, message: err instanceof Error ? err.message : String(err), raw: null };
}

async function executeTool<T>(slug: string, args: Record<string, unknown>): Promise<T> {
  const apiKey = process.env.COMPOSIO_API_KEY;
  const connectedAccountId = process.env.CONNECTED_ACCOUNT_ID;
  const entityId = process.env.COMPOSIO_ENTITY_ID;
  if (!apiKey) throw new Error("Missing required env var COMPOSIO_API_KEY");
  if (!connectedAccountId) throw new Error("Missing required env var CONNECTED_ACCOUNT_ID");
  if (!entityId) throw new Error("Missing required env var COMPOSIO_ENTITY_ID");

  const res = await fetch(`${COMPOSIO_BASE_URL}/tools/execute/${slug}`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      connected_account_id: connectedAccountId,
      // Required on every call — omitting it 400s with
      // ActionExecute_ConnectedAccountEntityIdRequired. Confirmed live against
      // the real API on 2026-08-05; not documented anywhere in Composio's
      // own docs at planning time.
      entity_id: entityId,
      arguments: args,
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.successful === false) {
    throw new ComposioToolError(slug, json);
  }
  return json.data as T;
}

// ---- Types (narrowed to the fields this app actually reads/sends) ----

export type GmailThreadSummary = {
  id: string;
  snippet?: string;
  historyId?: string;
};

export type GmailMessageHeader = { name: string; value: string };

export type GmailMessagePart = {
  mimeType?: string;
  body?: { data?: string; attachmentId?: string };
  parts?: GmailMessagePart[];
  headers?: GmailMessageHeader[];
  filename?: string;
};

export type GmailMessage = {
  id: string;
  threadId: string;
  internalDate?: string;
  labelIds?: string[];
  snippet?: string;
  payload?: GmailMessagePart & { headers?: GmailMessageHeader[] };
};

export type GmailThreadDetail = {
  messages: GmailMessage[];
};

export type GmailDraft = {
  id: string;
  message: GmailMessage;
};

// ---- Typed wrappers, one per confirmed Gmail tool slug ----

export function listThreads(args: {
  query?: string;
  user_id?: string;
  max_results?: number;
  page_token?: string;
  verbose?: boolean;
}) {
  return executeTool<{ threads?: GmailThreadSummary[]; nextPageToken?: string }>(
    "GMAIL_LIST_THREADS",
    args
  );
}

export function fetchMessageByThreadId(args: {
  thread_id: string;
  user_id?: string;
  page_token?: string;
}) {
  return executeTool<GmailThreadDetail>("GMAIL_FETCH_MESSAGE_BY_THREAD_ID", args);
}

export function fetchMessageByMessageId(args: {
  message_id: string;
  user_id?: string;
  format?: "minimal" | "metadata" | "full" | "raw";
}) {
  return executeTool<GmailMessage>("GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID", args);
}

export function fetchEmails(args: {
  query?: string;
  user_id?: string;
  label_ids?: string[];
  max_results?: number;
  page_token?: string;
  verbose?: boolean;
  ids_only?: boolean;
  include_payload?: boolean;
  include_spam_trash?: boolean;
}) {
  return executeTool<{ messages?: GmailMessage[]; nextPageToken?: string }>(
    "GMAIL_FETCH_EMAILS",
    args
  );
}

// GMAIL_CREATE_EMAIL_DRAFT's actual payload comes back nested one level
// deeper than every other Gmail tool — {response_data: {id, message}} instead
// of {id, message} directly. Confirmed live 2026-08-06: reading `.id` off the
// unwrapped response silently returns undefined (no type error, since the
// generic executeTool<T> just casts), which is exactly how a `gmailDraftId`
// missing DB write failure happened with zero indication why. Unwrapped here
// so every caller gets the same flat GmailDraft shape as the other tools.
export async function createEmailDraft(args: {
  recipient_email?: string;
  extra_recipients?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  body?: string;
  is_html?: boolean;
  thread_id?: string;
  user_id?: string;
}): Promise<GmailDraft> {
  const result = await executeTool<{ response_data: GmailDraft }>("GMAIL_CREATE_EMAIL_DRAFT", args);
  return result.response_data;
}

export function listDrafts(args: {
  user_id?: string;
  page_token?: string;
  max_results?: number;
  verbose?: boolean;
}) {
  return executeTool<{ drafts?: GmailDraft[]; nextPageToken?: string }>(
    "GMAIL_LIST_DRAFTS",
    args
  );
}

// BROKEN as of 2026-08-06: consistently 404s "Tool_ToolNotFound" via the
// direct /tools/execute/GMAIL_GET_DRAFT endpoint, despite GMAIL_GET_DRAFT
// being a valid, currently-registered tool slug per Composio's own search/
// schema API (confirmed — this isn't a stale/renamed slug on our end).
// Re-verify against the live API before using; until then, callers needing a
// draft's current content should use fetchMessageByMessageId against the
// draft's stored gmailMessageId instead (same underlying message, and that
// tool works). See docs/composio-integration.md.
export function getDraft(args: {
  draft_id: string;
  user_id?: string;
  format?: "minimal" | "metadata" | "full" | "raw";
}) {
  return executeTool<GmailDraft>("GMAIL_GET_DRAFT", args);
}

// BROKEN as of 2026-08-06: same "Tool_ToolNotFound" 404 as GMAIL_GET_DRAFT
// above, also confirmed live, also a valid registered slug per Composio's
// schema API. Re-verify before using. Until then, "regenerate a draft"
// callers should create a new draft and delete the old one (in that order —
// create first, so a failure never leaves zero drafts) instead of updating
// in place. See docs/composio-integration.md.
//
// Replace-style if it does start working again: omitted fields can clear
// recipients/body, so callers must always resend the full intended
// recipients/subject/body, never a partial patch.
export function updateDraft(args: {
  draft_id: string;
  recipient_email?: string;
  extra_recipients?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  body?: string;
  is_html?: boolean;
  thread_id?: string;
  user_id?: string;
}) {
  return executeTool<GmailDraft>("GMAIL_UPDATE_DRAFT", args);
}

export function sendDraft(args: { draft_id: string; user_id?: string }) {
  return executeTool<{ id: string; threadId?: string }>("GMAIL_SEND_DRAFT", args);
}

export function deleteDraft(args: { draft_id: string; user_id?: string }) {
  return executeTool<Record<string, never>>("GMAIL_DELETE_DRAFT", args);
}

export function listLabels(args: { user_id?: string; include_details?: boolean }) {
  return executeTool<{ labels?: { id: string; name: string }[] }>("GMAIL_LIST_LABELS", args);
}

// ---- MIME helpers for hydrated Gmail messages ----

export function getHeaderValue(message: GmailMessage, name: string): string | undefined {
  return message.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
}

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf-8");
}

/** Walks the MIME tree for the first text/plain part; falls back to text/html
 * (tags stripped) if no plain-text part exists. */
export function extractPlainTextBody(message: GmailMessage): string {
  const plainParts: string[] = [];
  const htmlParts: string[] = [];

  function walk(part?: GmailMessagePart) {
    if (!part) return;
    if (part.mimeType === "text/plain" && part.body?.data) {
      plainParts.push(decodeBase64Url(part.body.data));
    } else if (part.mimeType === "text/html" && part.body?.data) {
      htmlParts.push(decodeBase64Url(part.body.data));
    }
    for (const child of part.parts ?? []) walk(child);
  }

  walk(message.payload);

  if (plainParts.length > 0) return plainParts.join("\n");
  if (htmlParts.length > 0) {
    return htmlParts.join("\n").replace(/<[^>]+>/g, " ");
  }
  return message.snippet ?? "";
}
