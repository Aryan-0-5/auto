"use client";

export type HistoryFilterValues = {
  customer: string;
  date: string;
  item: string;
};

export function HistoryFilters({
  values,
  onChange,
}: {
  values: HistoryFilterValues;
  onChange: (values: HistoryFilterValues) => void;
}) {
  return (
    <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
      <input
        value={values.customer}
        onChange={(e) => onChange({ ...values, customer: e.target.value })}
        placeholder="Customer / company"
        className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
      />
      <input
        type="date"
        value={values.date}
        onChange={(e) => onChange({ ...values, date: e.target.value })}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
      />
      <input
        value={values.item}
        onChange={(e) => onChange({ ...values, item: e.target.value })}
        placeholder="Item"
        className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
      />
    </div>
  );
}
