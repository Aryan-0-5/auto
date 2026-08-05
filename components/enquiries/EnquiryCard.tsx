"use client";

import { useState } from "react";
import { LineItemRow } from "./LineItemRow";
import { GeneralRemarksField } from "./GeneralRemarksField";
import { EmailPreviewPane } from "./EmailPreviewPane";
import { renderEmailBody } from "@/lib/render-email";
import { useDebouncedCallback } from "@/lib/hooks";
import type { ApiEnquiry, ApiLineItem, ApiTemplate } from "@/lib/types";

export function EnquiryCard({
  enquiry,
  template,
  checked,
  onToggle,
}: {
  enquiry: ApiEnquiry;
  template: ApiTemplate;
  checked: boolean;
  onToggle: () => void;
}) {
  const [lineItems, setLineItems] = useState<ApiLineItem[]>(enquiry.lineItems);
  const [generalRemarks, setGeneralRemarks] = useState(enquiry.generalRemarks ?? "");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [showRawBody, setShowRawBody] = useState(false);

  const save = useDebouncedCallback(async (items: ApiLineItem[], remarks: string) => {
    setSaveState("saving");
    await fetch(`/api/enquiries/${enquiry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generalRemarks: remarks,
        lineItems: items.map((i) => ({
          id: i.id,
          itemName: i.itemName,
          qty: i.qty,
          price: i.price === null || i.price === "" ? null : Number(i.price),
          stockRemarks: i.stockRemarks,
        })),
      }),
    });
    setSaveState("saved");
  }, 700);

  function updateLineItem(id: string, patch: Partial<ApiLineItem>) {
    const next = lineItems.map((item) => (item.id === id ? { ...item, ...patch } : item));
    setLineItems(next);
    save(next, generalRemarks);
  }

  function updateGeneralRemarks(value: string) {
    setGeneralRemarks(value);
    save(lineItems, value);
  }

  const preview = renderEmailBody({
    template,
    lineItems: lineItems.map((i) => ({
      itemName: i.itemName,
      qty: i.qty,
      price: i.price,
      stockRemarks: i.stockRemarks,
    })),
    generalRemarks,
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            className="mt-1 h-4 w-4"
            aria-label={`Select enquiry from ${enquiry.companyName ?? enquiry.senderEmail}`}
          />
          <div>
            <p className="font-medium text-gray-900">{enquiry.companyName ?? enquiry.senderName ?? enquiry.senderEmail}</p>
            <p className="text-sm text-gray-500">
              {enquiry.senderName ? `${enquiry.senderName} · ` : ""}
              {enquiry.senderEmail}
            </p>
            <p className="mt-1 text-sm text-gray-700">{enquiry.subject}</p>
          </div>
        </div>
        <span className="shrink-0 text-xs text-gray-400">
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : ""}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setShowRawBody((v) => !v)}
        className="mb-3 text-xs text-blue-600 hover:underline"
      >
        {showRawBody ? "Hide full mail body" : "See full mail body"}
      </button>
      {showRawBody && (
        <pre className="mb-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded bg-gray-50 p-3 font-sans text-xs text-gray-700">
          {enquiry.rawBody}
        </pre>
      )}

      <div className="space-y-2">
        {lineItems.map((item, index) => (
          <LineItemRow
            key={item.id}
            enquiryId={enquiry.id}
            item={item}
            index={index}
            onChange={(patch) => updateLineItem(item.id, patch)}
          />
        ))}
      </div>

      <GeneralRemarksField value={generalRemarks} onChange={updateGeneralRemarks} />

      <div className="mt-4">
        <p className="mb-1 text-sm font-medium text-gray-700">Full email preview</p>
        <EmailPreviewPane html={preview.html} />
      </div>
    </div>
  );
}
