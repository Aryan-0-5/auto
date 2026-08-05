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
