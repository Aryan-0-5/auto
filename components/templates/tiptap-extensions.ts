import { Extension, type CommandProps } from "@tiptap/core";

// No official Tiptap package covers block indent — it renders as an inline
// style (not a CSS class) so it survives being sent as real email HTML, which
// is part of why Tiptap was chosen over Quill for this editor (see build plan;
// Quill's default indent uses `ql-indent-N` classes that email clients strip).
// Font size, font family, and color all ship in @tiptap/extension-text-style
// in Tiptap v3, so only this one extension needs to be hand-written.

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blockIndent: {
      indent: () => ReturnType;
      outdent: () => ReturnType;
    };
  }
}

const INDENT_STEP_PX = 24;
const MAX_INDENT_STEPS = 8;

export const BlockIndent = Extension.create({
  name: "blockIndent",
  addOptions() {
    return { types: ["paragraph", "listItem"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element: HTMLElement) => {
              const px = parseInt(element.style.marginLeft || "0", 10);
              return Number.isFinite(px) ? Math.round(px / INDENT_STEP_PX) : 0;
            },
            renderHTML: (attributes: { indent?: number }) => {
              if (!attributes.indent) return {};
              return { style: `margin-left: ${attributes.indent * INDENT_STEP_PX}px` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    const types = this.options.types as string[];
    const step =
      (delta: number) =>
      () =>
      ({ state, dispatch }: CommandProps) => {
        const { from, to } = state.selection;
        const tr = state.tr;
        let changed = false;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (!types.includes(node.type.name)) return;
          const current = (node.attrs.indent as number) ?? 0;
          const next = Math.min(MAX_INDENT_STEPS, Math.max(0, current + delta));
          if (next !== current) {
            tr.setNodeAttribute(pos, "indent", next);
            changed = true;
          }
        });
        if (changed && dispatch) dispatch(tr);
        return changed;
      };
    return {
      indent: step(1),
      outdent: step(-1),
    };
  },
});
