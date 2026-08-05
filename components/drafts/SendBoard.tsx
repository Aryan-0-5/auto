"use client";

import { useState } from "react";
import { DraftRow } from "./DraftRow";
import { useSelection } from "@/lib/hooks";
import type { ApiDraft } from "@/lib/types";

export function SendBoard({ drafts, onSent }: { drafts: ApiDraft[]; onSent: () => void }) {
  const { selected, toggle, clear } = useSelection();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSendSelected() {
    if (selected.size === 0) return;
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/drafts/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftIds: Array.from(selected) }),
      });
      const data = await res.json();
      setMessage(
        res.ok
          ? `Sent ${data.sent}${data.failed ? `, ${data.failed} failed` : ""}`
          : (data.error ?? "Send failed")
      );
      clear();
      onSent();
    } finally {
      setSending(false);
    }
  }

  if (drafts.length === 0) {
    return <p className="text-sm text-gray-500">No pending drafts. Generate some from the Enquiries tab.</p>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">{selected.size} selected</p>
        <button
          onClick={handleSendSelected}
          disabled={sending || selected.size === 0}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send Selected"}
        </button>
      </div>
      {message && <p className="mb-4 text-sm text-gray-600">{message}</p>}
      <div className="space-y-4">
        {drafts.map((draft) => (
          <DraftRow key={draft.id} draft={draft} checked={selected.has(draft.id)} onToggle={() => toggle(draft.id)} />
        ))}
      </div>
    </div>
  );
}
