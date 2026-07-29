"use client";

import { useEffect, useRef, useState } from "react";
import { TemplateFieldEditor } from "@/components/templates/TemplateFieldEditor";
import type { TiptapNodeInput } from "@/lib/validation";
import type { ApiTemplate } from "@/lib/types";

type FieldState = { html: string; json: TiptapNodeInput | null };

export default function TemplatesPage() {
  const [template, setTemplate] = useState<ApiTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const openingLine = useRef<FieldState>({ html: "", json: null });
  const termsBlock = useRef<FieldState>({ html: "", json: null });
  const closingSignature = useRef<FieldState>({ html: "", json: null });

  useEffect(() => {
    let ignore = false;
    async function load() {
      const res = await fetch("/api/templates");
      const data = await res.json();
      if (!ignore) {
        setTemplate(data.template ?? null);
        setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleSave() {
    if (!openingLine.current.json || !termsBlock.current.json || !closingSignature.current.json) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openingLine: openingLine.current,
          termsBlock: termsBlock.current,
          closingSignature: closingSignature.current,
        }),
      });
      const data = await res.json();
      setMessage(res.ok ? "Saved" : (data.error ?? "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  if (loading || !template) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Templates</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {message && <p className="mb-4 text-sm text-gray-600">{message}</p>}

      <TemplateFieldEditor
        label="Opening line"
        initialHtml={template.openingLineHtml}
        onChange={(html, json) => {
          openingLine.current = { html, json };
        }}
      />
      <TemplateFieldEditor
        label="Standard terms block"
        initialHtml={template.termsBlockHtml}
        onChange={(html, json) => {
          termsBlock.current = { html, json };
        }}
      />
      <TemplateFieldEditor
        label="Closing / signature"
        initialHtml={template.closingSignatureHtml}
        onChange={(html, json) => {
          closingSignature.current = { html, json };
        }}
      />
    </div>
  );
}
