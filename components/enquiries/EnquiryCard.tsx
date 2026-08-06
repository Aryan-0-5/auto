"use client";

import { useEffect, useRef, useState } from "react";
import { LineItemRow } from "./LineItemRow";
import { GeneralRemarksField } from "./GeneralRemarksField";
import { useDebouncedCallback } from "@/lib/hooks";
import type { ApiEnquiry, ApiLineItem } from "@/lib/types";

function hasValue(v: string | null | undefined): boolean {
  return v !== null && v !== undefined && v.trim() !== "";
}

export function EnquiryCard({
  enquiry,
  checked,
  onToggle,
  setChecked,
}: {
  enquiry: ApiEnquiry;
  checked: boolean;
  onToggle: () => void;
  setChecked: (id: string, value: boolean) => void;
}) {
  const [lineItems, setLineItems] = useState<ApiLineItem[]>(enquiry.lineItems);
  const [generalRemarks, setGeneralRemarks] = useState(enquiry.generalRemarks ?? "");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [showRawBody, setShowRawBody] = useState(false);

  // Selection must only ever change via this checkbox's own onChange, or the
  // auto-select rule below — never as any other side effect of editing
  // fields. React's controlled-input model only corrects the DOM when its
  // `checked` prop changes; it won't notice or undo an external mutation
  // (e.g. a browser autofill/password-manager extension deciding to toggle a
  // nearby checkbox after nearby fields are filled in). Re-asserting on
  // every render makes that self-correcting.
  const checkboxRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (checkboxRef.current) checkboxRef.current.checked = checked;
  });

  // Auto-select: a card ticks itself once every item on it is "complete" —
  // price or stock/remarks filled in, not necessarily both — and un-ticks if
  // an edit drops it back below that bar. Reactive to the live field values,
  // not a one-time trigger: this re-derives on every lineItems change, and
  // setChecked only touches the Set when the value actually needs to change,
  // so a manual click in between two edits that don't cross the complete/
  // incomplete boundary is never overwritten.
  const isComplete = lineItems.length > 0 && lineItems.every((item) => hasValue(item.price) || hasValue(item.stockRemarks));
  useEffect(() => {
    setChecked(enquiry.id, isComplete);
  }, [isComplete, enquiry.id, setChecked]);

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

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
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
        {lineItems.map((item) => (
          <LineItemRow
            key={item.id}
            enquiryId={enquiry.id}
            item={item}
            onChange={(patch) => updateLineItem(item.id, patch)}
          />
        ))}
      </div>

      <GeneralRemarksField value={generalRemarks} onChange={updateGeneralRemarks} />
    </div>
  );
}
