"use client";

import { useState } from "react";
import { renderLineItem } from "@/lib/render-email";
import type { ApiLineItem } from "@/lib/types";

type PreviouslyQuotedState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; price: number }
  | { status: "not-found" };

export function LineItemRow({
  enquiryId,
  item,
  index,
  onChange,
}: {
  enquiryId: string;
  item: ApiLineItem;
  index: number;
  onChange: (patch: Partial<Pick<ApiLineItem, "itemName" | "qty" | "price" | "stockRemarks">>) => void;
}) {
  const [previouslyQuoted, setPreviouslyQuoted] = useState<PreviouslyQuotedState>({ status: "idle" });

  const preview = renderLineItem(
    { itemName: item.itemName, qty: item.qty, price: item.price, stockRemarks: item.stockRemarks },
    index
  );

  async function lookupPreviouslyQuoted() {
    setPreviouslyQuoted({ status: "loading" });
    try {
      const res = await fetch(
        `/api/enquiries/${enquiryId}/previously-quoted?itemName=${encodeURIComponent(item.itemName)}`
      );
      const data = await res.json();
      if (data.found) {
        setPreviouslyQuoted({ status: "found", price: data.price });
      } else {
        setPreviouslyQuoted({ status: "not-found" });
      }
    } catch {
      setPreviouslyQuoted({ status: "not-found" });
    }
  }

  return (
    <div className="rounded-md border border-gray-200 p-3">
      <p className="mb-2 text-xs text-gray-400">{item.rawText}</p>
      <div className="grid grid-cols-12 gap-2">
        <input
          value={item.itemName}
          onChange={(e) => onChange({ itemName: e.target.value })}
          placeholder="Item"
          className="col-span-4 rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <input
          value={item.qty ?? ""}
          onChange={(e) => onChange({ qty: e.target.value })}
          placeholder="Qty"
          className="col-span-2 rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <input
          type="number"
          step="0.01"
          value={item.price ?? ""}
          onChange={(e) => onChange({ price: e.target.value === "" ? null : e.target.value })}
          placeholder="Price"
          className="col-span-2 rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <input
          value={item.stockRemarks ?? ""}
          onChange={(e) => onChange({ stockRemarks: e.target.value })}
          placeholder="Stock / remarks (e.g. Ex Stock, which make?)"
          className="col-span-4 rounded border border-gray-300 px-2 py-1 text-sm"
        />
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={lookupPreviouslyQuoted}
          className="text-blue-600 hover:underline"
          disabled={previouslyQuoted.status === "loading"}
        >
          {previouslyQuoted.status === "loading" ? "Checking…" : "Previously quoted?"}
        </button>
        {previouslyQuoted.status === "found" && (
          <span className="text-gray-600">Last quoted at Rs. {previouslyQuoted.price.toFixed(2)}</span>
        )}
        {previouslyQuoted.status === "not-found" && <span className="text-gray-400">No record found</span>}
      </div>

      <p className="mt-2 rounded bg-gray-50 px-2 py-1 text-sm text-gray-700">{preview.text}</p>
    </div>
  );
}
