// Standalone diagnostic — NOT part of the app. Calls Composio's REST API
// directly to verify credentials/endpoint outside any of lib/composio.ts's
// wrapping, error mapping, or the app's request context.
// Run with: node --env-file=.env scripts/composio-diagnostic.mjs

const apiKey = process.env.COMPOSIO_API_KEY;
const connectedAccountId = process.env.CONNECTED_ACCOUNT_ID;
const entityId = process.env.COMPOSIO_ENTITY_ID;

if (!apiKey) throw new Error("Missing COMPOSIO_API_KEY in environment");
if (!connectedAccountId) throw new Error("Missing CONNECTED_ACCOUNT_ID in environment");
if (!entityId) throw new Error("Missing COMPOSIO_ENTITY_ID in environment");

const url = "https://backend.composio.dev/api/v3/tools/execute/GMAIL_LIST_THREADS";

const res = await fetch(url, {
  method: "POST",
  headers: {
    "x-api-key": apiKey,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    connected_account_id: connectedAccountId,
    entity_id: entityId,
    arguments: { max_results: 5 },
  }),
});

const bodyText = await res.text();

console.log("URL:", url);
console.log("Status:", res.status, res.statusText);
console.log("Headers:", JSON.stringify(Object.fromEntries(res.headers.entries()), null, 2));
console.log("Body:", bodyText);
