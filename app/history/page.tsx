"use client";

import { useEffect, useState } from "react";
import { HistoryFilters, type HistoryFilterValues } from "@/components/history/HistoryFilters";
import { HistoryTable } from "@/components/history/HistoryTable";
import { useDebouncedCallback } from "@/lib/hooks";
import type { ApiSentHistory } from "@/lib/types";

async function fetchHistory(filters: HistoryFilterValues): Promise<ApiSentHistory[]> {
  const params = new URLSearchParams();
  if (filters.customer) params.set("customer", filters.customer);
  if (filters.date) params.set("date", filters.date);
  if (filters.item) params.set("item", filters.item);
  const res = await fetch(`/api/history?${params.toString()}`);
  const data = await res.json();
  return data.history ?? [];
}

export default function HistoryPage() {
  const [filters, setFilters] = useState<HistoryFilterValues>({ customer: "", date: "", item: "" });
  const [history, setHistory] = useState<ApiSentHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    fetchHistory({ customer: "", date: "", item: "" }).then((h) => {
      if (!ignore) {
        setHistory(h);
        setLoading(false);
      }
    });
    return () => {
      ignore = true;
    };
  }, []);

  const debouncedSearch = useDebouncedCallback(async (next: HistoryFilterValues) => {
    setHistory(await fetchHistory(next));
  }, 400);

  function handleFiltersChange(next: HistoryFilterValues) {
    setFilters(next);
    debouncedSearch(next);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-4 text-lg font-semibold text-gray-900">History</h1>
      <HistoryFilters values={filters} onChange={handleFiltersChange} />
      {loading ? <p className="text-sm text-gray-500">Loading…</p> : <HistoryTable history={history} />}
    </div>
  );
}
