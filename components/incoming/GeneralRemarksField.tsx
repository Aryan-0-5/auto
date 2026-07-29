"use client";

export function GeneralRemarksField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <label className="mb-1 block text-sm font-medium text-gray-700">
        General remarks <span className="font-normal text-gray-400">(applies to the whole enquiry, not any single item)</span>
      </label>
      <textarea
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder='e.g. "Entire order will take at least 6 weeks."'
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
      />
    </div>
  );
}
