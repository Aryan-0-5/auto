"use client";

import { useEffect, useState } from "react";
import { SendBoard } from "@/components/drafts/SendBoard";
import type { ApiDraft } from "@/lib/types";

async function fetchDrafts(): Promise<ApiDraft[]> {
  const res = await fetch("/api/drafts");
  const data = await res.json();
  return data.drafts ?? [];
}

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<ApiDraft[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    fetchDrafts().then((d) => {
      if (!ignore) {
        setDrafts(d);
        setLoading(false);
      }
    });
    return () => {
      ignore = true;
    };
  }, []);

  async function refresh() {
    setDrafts(await fetchDrafts());
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-4 text-lg font-semibold text-gray-900">Drafts</h1>
      {loading ? <p className="text-sm text-gray-500">Loading…</p> : <SendBoard drafts={drafts} onSent={refresh} />}
    </div>
  );
}
