// Standalone diagnostic — NOT part of the app.
// Run with: node --env-file=.env scripts/composio-list-accounts.mjs

const apiKey = process.env.COMPOSIO_API_KEY;
if (!apiKey) throw new Error("Missing COMPOSIO_API_KEY in environment");

const url = "https://backend.composio.dev/api/v3/connected_accounts";

const res = await fetch(url, {
  method: "GET",
  headers: { "x-api-key": apiKey },
});

const bodyText = await res.text();
console.log("URL:", url);
console.log("Status:", res.status, res.statusText);

if (!res.ok) {
  console.log("Body:", bodyText);
  process.exit(1);
}

const data = JSON.parse(bodyText);
console.log("Raw response:", JSON.stringify(data, null, 2));

const items = data.items ?? data.data ?? (Array.isArray(data) ? data : []);
const gmailItems = items.filter((item) => {
  const toolkitSlug = item.toolkit?.slug ?? item.appName ?? item.app_name ?? item.toolkit_slug ?? "";
  return String(toolkitSlug).toLowerCase().includes("gmail");
});

console.log(`\nTotal accounts: ${items.length}, gmail accounts: ${gmailItems.length}\n`);
for (const item of gmailItems.length > 0 ? gmailItems : items) {
  console.log({ id: item.id, user_id: item.userId ?? item.user_id ?? item.entityId ?? item.entity_id, status: item.status });
}
