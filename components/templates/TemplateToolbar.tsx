"use client";

import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";

const FONT_FAMILIES = ["Arial", "Georgia", "Times New Roman", "Courier New", "Verdana", "Tahoma"];
const FONT_SIZES = ["10px", "12px", "14px", "16px", "18px", "24px", "32px"];
const TEXT_COLORS = ["#000000", "#d93025", "#188038", "#1a73e8", "#f9ab00", "#8430ce"];

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`rounded px-2 py-1 text-sm ${active ? "bg-gray-200 text-gray-900" : "text-gray-600 hover:bg-gray-100"}`}
    >
      {children}
    </button>
  );
}

export function TemplateToolbar({ editor }: { editor: Editor | null }) {
  // Note: the selector's own `ctx.editor` param is unreliable (comes back null
  // even when a real editor is active) — read the outer `editor` closure
  // variable instead, which useEditorState still correctly re-invokes on
  // every transaction.
  const state = useEditorState({
    editor,
    selector: () =>
      editor
        ? {
            bold: editor.isActive("bold"),
            italic: editor.isActive("italic"),
            underline: editor.isActive("underline"),
            strike: editor.isActive("strike"),
            orderedList: editor.isActive("orderedList"),
            bulletList: editor.isActive("bulletList"),
            blockquote: editor.isActive("blockquote"),
          }
        : null,
  });

  if (!editor || !state) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-t-md border border-b-0 border-gray-300 bg-gray-50 p-1">
      {/* 1. Font family */}
      <select
        onMouseDown={(e) => e.preventDefault()}
        onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
        defaultValue=""
        className="rounded border border-gray-200 bg-white px-1 py-1 text-xs"
        aria-label="Font family"
      >
        <option value="" disabled>
          Font
        </option>
        {FONT_FAMILIES.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>

      {/* 2. Font size */}
      <select
        onMouseDown={(e) => e.preventDefault()}
        onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
        defaultValue=""
        className="rounded border border-gray-200 bg-white px-1 py-1 text-xs"
        aria-label="Font size"
      >
        <option value="" disabled>
          Size
        </option>
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {/* 3. Bold */}
      <ToolbarButton label="Bold" active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
        <strong>B</strong>
      </ToolbarButton>

      {/* 4. Italic */}
      <ToolbarButton label="Italic" active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <em>I</em>
      </ToolbarButton>

      {/* 5. Underline */}
      <ToolbarButton
        label="Underline"
        active={state.underline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <span className="underline">U</span>
      </ToolbarButton>

      {/* 6. Text color */}
      <select
        onMouseDown={(e) => e.preventDefault()}
        onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
        defaultValue=""
        className="rounded border border-gray-200 bg-white px-1 py-1 text-xs"
        aria-label="Text color"
      >
        <option value="" disabled>
          Color
        </option>
        {TEXT_COLORS.map((c) => (
          <option key={c} value={c} style={{ color: c }}>
            {c}
          </option>
        ))}
      </select>

      {/* 7. Alignment */}
      <select
        onMouseDown={(e) => e.preventDefault()}
        onChange={(e) => editor.chain().focus().setTextAlign(e.target.value).run()}
        defaultValue=""
        className="rounded border border-gray-200 bg-white px-1 py-1 text-xs"
        aria-label="Alignment"
      >
        <option value="" disabled>
          Align
        </option>
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
        <option value="justify">Justify</option>
      </select>

      {/* 8. Numbered list */}
      <ToolbarButton
        label="Numbered list"
        active={state.orderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1.
      </ToolbarButton>

      {/* 9. Bulleted list */}
      <ToolbarButton
        label="Bulleted list"
        active={state.bulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        •
      </ToolbarButton>

      {/* 10. Decrease indent */}
      <ToolbarButton label="Decrease indent" onClick={() => editor.chain().focus().outdent().run()}>
        ⇤
      </ToolbarButton>

      {/* 11. Increase indent */}
      <ToolbarButton label="Increase indent" onClick={() => editor.chain().focus().indent().run()}>
        ⇥
      </ToolbarButton>

      {/* 12. Block quote */}
      <ToolbarButton
        label="Block quote"
        active={state.blockquote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        ❝
      </ToolbarButton>

      {/* 13. Strikethrough */}
      <ToolbarButton label="Strikethrough" active={state.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <span className="line-through">S</span>
      </ToolbarButton>

      {/* 14. Remove formatting */}
      <ToolbarButton
        label="Remove formatting"
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
      >
        ⌫
      </ToolbarButton>
    </div>
  );
}
