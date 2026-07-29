"use client";

export function EmailPreviewPane({ html }: { html: string }) {
  return (
    <iframe
      srcDoc={html}
      sandbox=""
      title="Email preview"
      className="h-72 w-full rounded-md border border-gray-200 bg-white"
    />
  );
}
