"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, Color, FontFamily, FontSize } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import { BlockIndent } from "./tiptap-extensions";
import { TemplateToolbar } from "./TemplateToolbar";
import type { TiptapNodeInput } from "@/lib/validation";

export function TemplateFieldEditor({
  label,
  initialHtml,
  onChange,
}: {
  label: string;
  initialHtml: string;
  onChange: (html: string, json: TiptapNodeInput) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: false,
      }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      BlockIndent,
      TextAlign.configure({ types: ["paragraph"] }),
    ],
    content: initialHtml,
    immediatelyRender: false,
    onCreate: ({ editor }) => {
      onChange(editor.getHTML(), editor.getJSON() as TiptapNodeInput);
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML(), editor.getJSON() as TiptapNodeInput);
    },
  });

  return (
    <div className="mb-6">
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <TemplateToolbar editor={editor} />
      <EditorContent
        editor={editor}
        className="min-h-[100px] rounded-b-md border border-gray-300 bg-white p-3 text-sm text-gray-900 [&_.ProseMirror]:min-h-[100px] [&_.ProseMirror]:outline-none"
      />
    </div>
  );
}
