"use client";

import { useEffect, useState } from "react";
import { HistoryTable } from "@/components/history/HistoryTable";
import type { ApiSentHistory } from "@/lib/types";

function todayLocalDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function SentTodayPage() {
  const [history, setHistory] = useState<ApiSentHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function load() {
      const res = await fetch(`/api/history?date=${todayLocalDate()}`);
      const data = await res.json();
      if (!ignore) {
        setHistory(data.history ?? []);
        setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-4 text-lg font-semibold text-gray-900">Sent (Today)</h1>
      {loading ? <p className="text-sm text-gray-500">Loading…</p> : <HistoryTable history={history} />}
    </div>
  );
}
