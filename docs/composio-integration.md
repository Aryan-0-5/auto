# Composio integration — implementation notes

This documents how the Composio Gmail integration actually works, corrected
against the real API after production calls failed on 2026-08-05. The
original build plan got several of these details wrong or omitted them
entirely — this doc is the source of truth going forward, not the plan.

## Endpoint

```
POST https://backend.composio.dev/api/v3/tools/execute/{tool_slug}
```

Confirmed `v3`, not `v3.1` — the plan flagged this as unconfirmed and it's
now settled. See `lib/composio.ts`.

## Required request body fields

Every call needs **both** of these, or it fails:

```json
{
  "connected_account_id": "ca_xxxxxxxx",
  "entity_id": "some-user-id",
  "arguments": { }
}
```

- **`connected_account_id`** — the connected account's `id` field from `GET
  /api/v3/connected_accounts`. Not the human-readable `word_id` alias (e.g.
  `gmail_doris-argali`) — that field exists on the same object but is not a
  valid value here.
- **`entity_id`** — the connected account's `user_id` field from that same
  response. **Missing from the original plan entirely.** Omitting it fails
  with `ActionExecute_ConnectedAccountEntityIdRequired` (400). This was the
  root cause of every Gmail action failing in production on 2026-08-05 —
  `lib/composio.ts`'s `executeTool()` sent `connected_account_id` but never
  `entity_id`. Fixed by sourcing it from a new required env var,
  `COMPOSIO_ENTITY_ID`.

Both env vars (`CONNECTED_ACCOUNT_ID`, `COMPOSIO_ENTITY_ID`) must be sourced
from a live `GET /api/v3/connected_accounts` call, not assumed or copied from
an earlier planning conversation. The value `gmail_scudi-sadden`, used during
original planning as the presumed connected account ID, does not correspond
to any real connected account — it was never valid.

## API key scope: `tool_execution` must be write

A scoped API key that doesn't have `tool_execution` set to write fails every
`tools/execute/*` call with `APIKey_InsufficientPermissions` (403), even with
otherwise-correct `connected_account_id`/`entity_id`. Default/narrow key
scopes do not include this by default.

**Permissions cannot be edited on an existing key** — if a key is missing a
scope, the only fix is generating a new key with the right scope and
replacing it everywhere it's used (env vars, deployment config). There is no
in-place upgrade.

## Draft tools: inconsistent response shapes and two broken slugs

Found 2026-08-06 while diagnosing "Generate Drafts" silently failing with
zero server-side trail (see the logging-gap section below — that gap is
exactly why this took a live reproduction to find instead of a log line).

- **`GMAIL_CREATE_EMAIL_DRAFT`'s payload is wrapped one level deeper than
  every other Gmail tool.** Where `GMAIL_LIST_DRAFTS` returns `{id, message}`
  directly, `GMAIL_CREATE_EMAIL_DRAFT` returns `{response_data: {id,
  message}}`. Reading `.id` off the unwrapped result doesn't error — the
  generic `executeTool<T>` just casts — it silently returns `undefined`,
  which then fails downstream with something unrelated-looking like
  `Argument gmailDraftId is missing.` on the Prisma write. `lib/composio.ts`'s
  `createEmailDraft()` now unwraps this internally so every caller gets the
  same flat shape as the other tools; don't assume any *other* tool's
  response is flat without checking, given this precedent.
- **`GMAIL_GET_DRAFT` and `GMAIL_UPDATE_DRAFT` both 404 with
  `Tool_ToolNotFound`** via the direct `/tools/execute/{slug}` endpoint —
  confirmed live, repeatedly, not transient. This is *not* a stale/wrong slug
  on our end: both are valid, currently-registered tool slugs with full
  schemas per Composio's own `COMPOSIO_SEARCH_TOOLS`/
  `COMPOSIO_GET_TOOL_SCHEMAS` meta-tools. Whatever's broken is specific to
  routing these two particular slugs through the direct execute endpoint —
  every other Gmail tool used in this app (`LIST_DRAFTS`,
  `CREATE_EMAIL_DRAFT`, `DELETE_DRAFT`, `SEND_DRAFT`, `FETCH_*`) works fine
  through the same endpoint pattern.
  - Worked around, not fixed: "regenerate a draft" now creates a replacement
    and deletes the old one (create first, so a failed delete never leaves
    zero drafts) instead of calling `GMAIL_UPDATE_DRAFT`. Re-hydrating a
    draft's live content now calls `GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID`
    against the draft's stored `gmailMessageId` instead of
    `GMAIL_GET_DRAFT` — same underlying message, and that tool works.
  - Re-verify both directly before ever calling them again — Composio may
    fix this on their end without any change needed here.

## Silent-failure logging gap: mapError() vs. batch routes

Two *different* gaps, both now fixed, both worth knowing apart:

- **`lib/api-handler.ts`'s `mapError()`** only called `console.error()` for
  unexpected (500) errors, never for `ComposioToolError` (502) — so any route
  where a Composio error propagates to the top-level handler had zero
  server-side trail, only the response the client saw. Fixed by adding the
  log line to that branch too.
- **Separately**, `/api/drafts/generate` and `/api/drafts/send` run a batch
  via `runWithConcurrency`, which deliberately catches each item's error so
  one failure doesn't fail the whole batch — but both routes then discarded
  that caught error entirely, returning only `{generated, failed}` /
  `{sent, failed}` counts. `mapError()`'s fix doesn't reach this case at all,
  since these routes catch internally and still return 200. This was the
  actual reason "0 drafts, 2 failed" had nothing in Vercel logs and nothing
  in the response body beyond a count — both routes now log each failure
  server-side and return a `failures` array (`{slug, message, raw}` per
  item) to the client. `lib/composio.ts`'s `describeError()` is the shared
  helper for both.

## Debugging notes for next time

- **Vercel scopes env vars separately per Production/Preview/Development.**
  Confirming a value is correct in one of these tells you nothing about
  whether it's set — or set to the same value — in another. This cost
  significant time on 2026-08-05: treat each environment as independently
  unverified until checked directly.
- **Neon projects can have multiple branches, each with a different host in
  its connection string.** A connection string "matching" what's expected
  locally doesn't confirm it's the same branch actually wired into a given
  deployment — confirm the host segment explicitly, don't assume.
- When Composio calls fail, get the *raw* response (status + body) before
  guessing. Every wrong assumption above (`v3.1`, missing `entity_id`, the
  stale connected account ID) was found by running a real request against
  the live API and reading the actual error, not by re-reading docs or plan
  notes further. `scripts/composio-diagnostic.mjs` and
  `scripts/composio-list-accounts.mjs` exist for exactly this — standalone,
  outside the app's error-wrapping, safe to rerun any time something Gmail-
  related breaks.
