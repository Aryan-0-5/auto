"use client";

import { useEffect, useMemo, useState } from "react";
import { EnquiryCard } from "@/components/enquiries/EnquiryCard";
import { useSelection } from "@/lib/hooks";
import type { ApiEnquiry, ApiTemplate } from "@/lib/types";

async function fetchEnquiries(): Promise<ApiEnquiry[]> {
  const res = await fetch("/api/enquiries");
  const data = await res.json();
  return data.enquiries ?? [];
}

async function fetchTemplate(): Promise<ApiTemplate | null> {
  const res = await fetch("/api/templates");
  const data = await res.json();
  return data.template ?? null;
}

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState<ApiEnquiry[]>([]);
  const [template, setTemplate] = useState<ApiTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { selected, toggle, clear } = useSelection();

  useEffect(() => {
    let ignore = false;
    async function load() {
      const [enq, tmpl] = await Promise.all([fetchEnquiries(), fetchTemplate()]);
      if (!ignore) {
        setEnquiries(enq);
        setTemplate(tmpl);
        setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/enquiries/refresh", { method: "POST" });
      const data = await res.json();
      setMessage(
        res.ok
          ? `Pulled ${data.created} new enquir${data.created === 1 ? "y" : "ies"} (${data.skipped} already known)`
          : (data.error ?? "Refresh failed")
      );
      setEnquiries(await fetchEnquiries());
    } finally {
      setRefreshing(false);
    }
  }

  async function handleGenerateDrafts() {
    if (selected.size === 0) return;
    setGenerating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enquiryIds: Array.from(selected) }),
      });
      const data = await res.json();
      setMessage(
        res.ok
          ? `Generated ${data.generated} draft${data.generated === 1 ? "" : "s"}${
              data.failed ? `, ${data.failed} failed` : ""
            }`
          : (data.error ?? "Draft generation failed")
      );
      clear();
      setEnquiries(await fetchEnquiries());
    } finally {
      setGenerating(false);
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, ApiEnquiry[]>();
    for (const enquiry of enquiries) {
      const key = enquiry.companyName ?? enquiry.senderName ?? enquiry.senderEmail;
      map.set(key, [...(map.get(key) ?? []), enquiry]);
    }
    return Array.from(map.entries());
  }, [enquiries]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Enquiries</h1>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button
            onClick={handleGenerateDrafts}
            disabled={generating || selected.size === 0}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {generating ? "Generating…" : `Generate Drafts${selected.size > 0 ? ` (${selected.size})` : ""}`}
          </button>
        </div>
      </div>

      {message && <p className="mb-4 text-sm text-gray-600">{message}</p>}

      {loading || !template ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : enquiries.length === 0 ? (
        <p className="text-sm text-gray-500">
          No enquiries awaiting a price. Hit Refresh to pull the latest from Gmail.
        </p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([company, items]) => (
            <div key={company}>
              <h2 className="mb-2 text-sm font-semibold text-gray-500">{company}</h2>
              <div className="space-y-4">
                {items.map((enquiry) => (
                  <EnquiryCard
                    key={enquiry.id}
                    enquiry={enquiry}
                    template={template}
                    checked={selected.has(enquiry.id)}
                    onToggle={() => toggle(enquiry.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
