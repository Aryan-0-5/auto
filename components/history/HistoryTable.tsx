"use client";

import type { ApiSentHistory } from "@/lib/types";

export function HistoryTable({ history }: { history: ApiSentHistory[] }) {
  if (history.length === 0) {
    return <p className="text-sm text-gray-500">No sent mail found.</p>;
  }

  return (
    <div className="space-y-4">
      {history.map((entry) => (
        <div key={entry.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-start justify-between">
            <div>
              <p className="font-medium text-gray-900">{entry.companyName ?? entry.senderEmail}</p>
              <p className="text-sm text-gray-500">{entry.senderEmail}</p>
              <p className="mt-1 text-sm text-gray-700">{entry.subject}</p>
            </div>
            <div className="text-right text-xs text-gray-400">
              <p>{new Date(entry.sentAt).toLocaleString()}</p>
              <p>by {entry.sentByUser.name}</p>
            </div>
          </div>
          <ul className="mt-2 space-y-1 text-sm text-gray-700">
            {entry.items.map((item) => (
              <li key={item.id}>
                {item.itemName}
                {item.qty ? ` - ${item.qty}` : ""}
                {item.price ? ` @ Rs. ${Number(item.price).toFixed(2)} each` : " (unpriced / confirm requested)"}
                {item.stockRemarks ? ` — ${item.stockRemarks}` : ""}
              </li>
            ))}
          </ul>
          {entry.generalRemarks && <p className="mt-2 text-sm text-gray-600">{entry.generalRemarks}</p>}
        </div>
      ))}
    </div>
  );
}
