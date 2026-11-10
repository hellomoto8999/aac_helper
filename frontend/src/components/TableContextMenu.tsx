import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { changeRowHeight } from "../editor/extensions";
import { useT } from "../i18n";

interface Props {
  x: number;
  y: number;
  editor: Editor;
  inTable: boolean;
  onClose: () => void;
}

interface Item {
  key: string;
  run: () => void;
}

export default function TableContextMenu({ x, y, editor, inTable, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  const { t } = useT();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let nx = x;
    let ny = y;
    if (x + rect.width > window.innerWidth - 8) nx = window.innerWidth - rect.width - 8;
    if (y + rect.height > window.innerHeight - 8) ny = window.innerHeight - rect.height - 8;
    setPos({ x: Math.max(8, nx), y: Math.max(8, ny) });
  }, [x, y]);

  useEffect(() => {
    const close = () => onClose();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const run = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
    onClose();
  };

  const hasSelection = !editor.state.selection.empty;
  const sections: Item[][] = [];

  if (hasSelection) {
    sections.push([
      {
        key: "ctx.deleteSelection",
        run: () => editor.chain().focus().deleteSelection().run(),
      },
    ]);
  }

  if (inTable) {
    sections.push(
      [
        { key: "ctx.insertRowAbove", run: () => editor.chain().focus().addRowBefore().run() },
        { key: "ctx.insertRowBelow", run: () => editor.chain().focus().addRowAfter().run() },
        { key: "ctx.insertColLeft", run: () => editor.chain().focus().addColumnBefore().run() },
        { key: "ctx.insertColRight", run: () => editor.chain().focus().addColumnAfter().run() },
      ],
      [
        { key: "ctx.deleteRow", run: () => editor.chain().focus().deleteRow().run() },
        { key: "ctx.deleteCol", run: () => editor.chain().focus().deleteColumn().run() },
      ],
      [
        { key: "ctx.rowTaller", run: () => changeRowHeight(editor, 30) },
        { key: "ctx.rowShorter", run: () => changeRowHeight(editor, -30) },
      ],
      [
        { key: "ctx.mergeCells", run: () => editor.chain().focus().mergeCells().run() },
        { key: "ctx.splitCell", run: () => editor.chain().focus().splitCell().run() },
      ],
      [
        { key: "ctx.headerRow", run: () => editor.chain().focus().toggleHeaderRow().run() },
        { key: "ctx.headerCol", run: () => editor.chain().focus().toggleHeaderColumn().run() },
      ],
      [
        { key: "ctx.deleteTable", run: () => editor.chain().focus().deleteTable().run() },
      ],
    );
  }

  return (
    <div
      ref={ref}
      className="ctx-menu"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="ctx-menu__title">{inTable ? t("ctx.table") : t("ctx.selection")}</div>
      {sections.map((section, si) => (
        <div key={si}>
          {si > 0 && <div className="ctx-menu__sep" />}
          {section.map((item) => (
            <button
              key={item.key}
              className="ctx-menu__item"
              onMouseDown={run(item.run)}
            >
              {t(item.key)}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
